import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  resolverTokenAcademia,
  puedeInscribir,
  recalcularMontosAcademia,
  tipoTarifaActual,
  precioModalidad,
} from '@/lib/campeonato/inscripcion-server'
import { MODALIDADES, MAX_OFICIALES } from '@/lib/campeonato/constants'

export async function GET(_request, { params }) {
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)

    const { data: lineas } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        miembros:linea_inscripcion_miembro(
          id_perfil,
          rol,
          perfil:competidor_perfil(*)
        )
      `)
      .eq('id_academia_campeonato', ac.id)
      .order('created_at', { ascending: true })

    const { data: comprobantes } = await sb
      .from('comprobante_pago')
      .select('*')
      .eq('id_academia_campeonato', ac.id)
      .order('created_at', { ascending: false })

    const { data: tarifas } = await sb
      .from('campeonato_tarifa')
      .select('*')
      .eq('id_campeonato', ac.id_campeonato)
      .eq('activo', true)

    const montos = await recalcularMontosAcademia(sb, ac.id)

    return NextResponse.json({
      academiaCampeonato: {
        id: ac.id,
        token: ac.token,
        estado_lista: ac.estado_lista,
        estado_pago: montos.estadoPago,
        monto_total: montos.montoTotal,
        monto_asignado: montos.montoAsignado,
        saldo: montos.saldo,
        aceptacion_bases_at: ac.aceptacion_bases_at,
      },
      academia: ac.academia,
      campeonato: {
        id: ac.campeonato.id_campeonato,
        nombre: ac.campeonato.nombre,
        slug: ac.campeonato.slug,
        bases_pdf_url: ac.campeonato.bases_pdf_url,
        cuenta_bancaria_info: ac.campeonato.cuenta_bancaria_info,
        fecha_cierre_inscripcion: ac.campeonato.fecha_cierre_inscripcion,
        fecha_gracia_pago: ac.campeonato.fecha_gracia_pago,
      },
      inscripcion: check,
      lineas: lineas || [],
      comprobantes: comprobantes || [],
      tarifas: tarifas || [],
      modalidades: MODALIDADES,
      maxOficiales: MAX_OFICIALES,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 })

    const body = await request.json()
    const { accion } = body

    if (accion === 'notificar') {
      const ultima = ac.ultima_notificacion_at ? new Date(ac.ultima_notificacion_at).getTime() : 0
      const cambio = ac.ultimo_cambio_at ? new Date(ac.ultimo_cambio_at).getTime() : 0
      if (cambio <= ultima) {
        return NextResponse.json({ ok: false, message: 'Sin cambios desde la última notificación' })
      }
      await sb
        .from('academia_campeonato')
        .update({ estado_lista: 'notificada', ultima_notificacion_at: new Date().toISOString() })
        .eq('id', ac.id)
      await sb.from('bitacora_inscripcion').insert({
        id_academia_campeonato: ac.id,
        accion: 'lista_notificada',
        actor: 'portal',
      })
      return NextResponse.json({ ok: true })
    }

    if (accion === 'anular_linea') {
      if (check.soloPago && body.soloPago !== true) {
        /* anular permitido en gracia */
      }
      const { idLinea } = body
      const { data: linea } = await sb.from('linea_inscripcion').select('*').eq('id_linea', idLinea).eq('id_academia_campeonato', ac.id).single()
      if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

      await sb.from('asignacion_pago').delete().eq('id_linea', idLinea)
      await sb
        .from('linea_inscripcion')
        .update({ estado: 'anulado', dorsal_numero: null, dorsal_display: null, updated_at: new Date().toISOString() })
        .eq('id_linea', idLinea)

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)
      return NextResponse.json({ ok: true })
    }

    if (accion === 'crear_linea') {
      if (check.soloPago) {
        return NextResponse.json({ error: 'Inscripción cerrada. Solo pagos.' }, { status: 403 })
      }
      if (!ac.aceptacion_bases_at) {
        return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
      }

      const { modalidad, idPerfiles, idCategoria, pesoDeclarado, tipoOficial, grupoUuid } = body
      const mod = MODALIDADES[modalidad]
      if (!mod && modalidad !== 'oficial') {
        return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
      }

      if (modalidad === 'oficial') {
        const { count } = await sb
          .from('linea_inscripcion')
          .select('*', { count: 'exact', head: true })
          .eq('id_academia_campeonato', ac.id)
          .eq('modalidad', 'oficial')
          .neq('estado', 'anulado')
        if ((count || 0) >= MAX_OFICIALES) {
          return NextResponse.json({ error: `Máximo ${MAX_OFICIALES} oficiales` }, { status: 400 })
        }
      }

      const tipoTarifa = tipoTarifaActual(ac.campeonato)
      const precio =
        modalidad === 'oficial' ? 0 : await precioModalidad(sb, ac.id_campeonato, modalidad, tipoTarifa)

      const { data: linea, error: errL } = await sb
        .from('linea_inscripcion')
        .insert({
          id_academia_campeonato: ac.id,
          id_campeonato: ac.id_campeonato,
          modalidad,
          tipo_oficial: tipoOficial || null,
          id_categoria: idCategoria || null,
          grupo_uuid: grupoUuid || null,
          es_cobro: modalidad !== 'oficial',
          precio_aplicado: precio,
          tipo_tarifa: tipoTarifa,
          peso_declarado: pesoDeclarado || null,
          estado: precio === 0 ? 'pendiente_pago' : 'pendiente_pago',
        })
        .select()
        .single()
      if (errL) throw errL

      const perfiles = idPerfiles || []
      for (const idPerfil of perfiles) {
        await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: idPerfil })
      }

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)

      return NextResponse.json({ linea })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
