import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getClientIp } from '@/lib/supabase-server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import {
  puedeInscribir,
  recalcularMontosAcademia,
  tipoTarifaActual,
  precioModalidad,
  puedeEnviarLista,
} from '@/lib/campeonato/inscripcion-server'
import { MODALIDADES, MAX_OFICIALES } from '@/lib/campeonato/constants'
import { validarLineaInscripcion } from '@/lib/campeonato/validar-categoria'

async function insertarLineaInscripcion(sb, ac, body) {
  const { modalidad, idPerfiles, idCategoria, pesoDeclarado, tipoOficial, grupoUuid } = body
  await validarLineaInscripcion(sb, ac, body)

  if (modalidad === 'oficial') {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('*', { count: 'exact', head: true })
      .eq('id_academia_campeonato', ac.id)
      .eq('modalidad', 'oficial')
      .neq('estado', 'anulado')
    if ((count || 0) >= MAX_OFICIALES) {
      throw new Error(`Máximo ${MAX_OFICIALES} oficiales`)
    }
  }

  const tipoTarifa = tipoTarifaActual(ac.campeonato)
  const precio =
    modalidad === 'oficial' ? 0 : await precioModalidad(sb, ac.id_campeonato, modalidad, tipoTarifa)

  const grupoUuidFinal = grupoUuid || (MODALIDADES[modalidad]?.miembros > 1 ? randomUUID() : null)

  const { data: linea, error: errL } = await sb
    .from('linea_inscripcion')
    .insert({
      id_academia_campeonato: ac.id,
      id_campeonato: ac.id_campeonato,
      modalidad,
      tipo_oficial: tipoOficial || null,
      id_categoria: idCategoria || null,
      grupo_uuid: grupoUuidFinal,
      es_cobro: modalidad !== 'oficial',
      precio_aplicado: precio,
      tipo_tarifa: tipoTarifa,
      peso_declarado: pesoDeclarado || null,
      estado: modalidad === 'oficial' || precio === 0 ? 'pagado' : 'pendiente_pago',
    })
    .select()
    .single()
  if (errL) throw errL

  for (const idPerfil of idPerfiles || []) {
    await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: idPerfil })
  }

  return linea
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const check = puedeInscribir(ac.campeonato)

    const { data: lineas } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(id_categoria, nombre, modalidad),
        miembros:linea_inscripcion_miembro(id_perfil, rol, perfil:competidor_perfil(*))
      `)
      .eq('id_academia_campeonato', ac.id)
      .neq('estado', 'anulado')
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

    const { data: categorias } = await sb
      .from('categoria_campeonato')
      .select('*')
      .eq('id_campeonato', ac.id_campeonato)
      .order('orden', { ascending: true })

    const { data: perfiles } = await sb
      .from('competidor_perfil')
      .select('*')
      .eq('id_academia', ac.id_academia)
      .order('apellidos')

    const montos = await recalcularMontosAcademia(sb, ac.id)
    const anioCampeonato = new Date(ac.campeonato.fecha_inicio).getFullYear()

    return NextResponse.json({
      academiaCampeonato: {
        id: ac.id,
        estado_aprobacion: ac.estado_aprobacion,
        motivo_rechazo: ac.motivo_rechazo,
        estado_lista: ac.estado_lista,
        estado_pago: montos.estadoPago,
        monto_total: montos.montoTotal,
        monto_asignado: montos.montoAsignado,
        saldo: montos.saldo,
        aceptacion_bases_at: ac.aceptacion_bases_at,
        puedeEnviar: puedeEnviarLista(ac).ok,
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
        fecha_inicio: ac.campeonato.fecha_inicio,
        anioCampeonato,
      },
      inscripcion: check,
      lineas: lineas || [],
      comprobantes: comprobantes || [],
      tarifas: tarifas || [],
      categorias: categorias || [],
      perfiles: perfiles || [],
      modalidades: MODALIDADES,
      maxOficiales: MAX_OFICIALES,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const check = puedeInscribir(ac.campeonato)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 })

    const body = await request.json()
    const { accion } = body

    if (accion === 'aceptar_bases') {
      const ip = getClientIp(request)
      await sb
        .from('academia_campeonato')
        .update({
          aceptacion_bases_at: new Date().toISOString(),
          aceptacion_bases_ip: ip,
          aceptacion_bases_version: ac.campeonato.bases_version || '1',
        })
        .eq('id', ac.id)
      return NextResponse.json({ ok: true })
    }

    if (accion === 'notificar') {
      const envio = puedeEnviarLista(ac)
      if (!envio.ok) return NextResponse.json({ error: envio.reason }, { status: 403 })

      const ultima = ac.ultima_notificacion_at ? new Date(ac.ultima_notificacion_at).getTime() : 0
      const cambio = ac.ultimo_cambio_at ? new Date(ac.ultimo_cambio_at).getTime() : 0
      if (cambio <= ultima) {
        return NextResponse.json({ ok: false, message: 'Sin cambios desde el último envío' })
      }
      await sb
        .from('academia_campeonato')
        .update({
          estado_lista: 'enviada',
          ultima_notificacion_at: new Date().toISOString(),
        })
        .eq('id', ac.id)
      await sb.from('bitacora_inscripcion').insert({
        id_academia_campeonato: ac.id,
        accion: 'lista_enviada',
        actor: 'portal',
      })
      return NextResponse.json({ ok: true, message: 'Lista enviada a ACCTKD' })
    }

    if (accion === 'anular_linea') {
      const { idLinea } = body
      const { data: linea } = await sb
        .from('linea_inscripcion')
        .select('*')
        .eq('id_linea', idLinea)
        .eq('id_academia_campeonato', ac.id)
        .single()
      if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
      if (linea.estado === 'aprobado') {
        return NextResponse.json({ error: 'No se puede anular una línea con dorsal aprobado' }, { status: 403 })
      }

      await sb.from('asignacion_pago').delete().eq('id_linea', idLinea)
      await sb
        .from('linea_inscripcion')
        .update({
          estado: 'anulado',
          dorsal_numero: null,
          dorsal_display: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id_linea', idLinea)

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)
      return NextResponse.json({ ok: true })
    }

    if (accion === 'actualizar_linea') {
      const { idLinea, idCategoria, pesoDeclarado } = body
      const { data: linea } = await sb
        .from('linea_inscripcion')
        .select('*')
        .eq('id_linea', idLinea)
        .eq('id_academia_campeonato', ac.id)
        .single()
      if (!linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
      if (linea.estado !== 'pendiente_pago') {
        return NextResponse.json({ error: 'Solo se editan líneas pendientes de pago' }, { status: 403 })
      }

      const patch = { updated_at: new Date().toISOString() }
      if (idCategoria != null) patch.id_categoria = idCategoria ? Number(idCategoria) : null
      if (pesoDeclarado != null) patch.peso_declarado = pesoDeclarado ? Number(pesoDeclarado) : null

      const { data: updated, error: errU } = await sb
        .from('linea_inscripcion')
        .update(patch)
        .eq('id_linea', idLinea)
        .select()
        .single()
      if (errU) throw errU

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      return NextResponse.json({ linea: updated })
    }

    if (accion === 'eliminar_perfil') {
      const { idPerfil } = body
      const { count } = await sb
        .from('linea_inscripcion_miembro')
        .select('id_linea, linea_inscripcion!inner(estado, id_academia_campeonato)', { count: 'exact', head: true })
        .eq('id_perfil', idPerfil)
        .eq('linea_inscripcion.id_academia_campeonato', ac.id)
        .neq('linea_inscripcion.estado', 'anulado')
      if ((count || 0) > 0) {
        return NextResponse.json({ error: 'El competidor tiene inscripciones activas. Anúlalas primero.' }, { status: 403 })
      }
      await sb.from('competidor_perfil').delete().eq('id_perfil', idPerfil).eq('id_academia', ac.id_academia)
      return NextResponse.json({ ok: true })
    }

    if (accion === 'crear_linea') {
      if (check.soloPago) {
        return NextResponse.json({ error: 'Inscripción cerrada. Solo pagos.' }, { status: 403 })
      }
      if (ac.estado_aprobacion === 'rechazada') {
        return NextResponse.json({ error: 'Academia rechazada' }, { status: 403 })
      }
      if (!ac.aceptacion_bases_at) {
        return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
      }

      const linea = await insertarLineaInscripcion(sb, ac, body)
      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)
      return NextResponse.json({ linea })
    }

    if (accion === 'crear_lineas') {
      if (check.soloPago) {
        return NextResponse.json({ error: 'Inscripción cerrada. Solo pagos.' }, { status: 403 })
      }
      if (ac.estado_aprobacion === 'rechazada') {
        return NextResponse.json({ error: 'Academia rechazada' }, { status: 403 })
      }
      if (!ac.aceptacion_bases_at) {
        return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
      }

      const { idPerfil, lineas } = body
      if (!idPerfil || !Array.isArray(lineas) || lineas.length === 0) {
        return NextResponse.json({ error: 'Perfil y al menos una modalidad requeridos' }, { status: 400 })
      }

      const creadas = []
      for (const l of lineas) {
        const linea = await insertarLineaInscripcion(sb, ac, { ...l, idPerfiles: [idPerfil] })
        creadas.push(linea)
      }

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)
      return NextResponse.json({ lineas: creadas })
    }

    if (accion === 'crear_grupo') {
      if (check.soloPago) {
        return NextResponse.json({ error: 'Inscripción cerrada. Solo pagos.' }, { status: 403 })
      }
      if (ac.estado_aprobacion === 'rechazada') {
        return NextResponse.json({ error: 'Academia rechazada' }, { status: 403 })
      }
      if (!ac.aceptacion_bases_at) {
        return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
      }

      const { modalidad, idPerfiles, idCategoria } = body
      if (!modalidad || !Array.isArray(idPerfiles) || !idPerfiles.length) {
        return NextResponse.json({ error: 'Modalidad e integrantes requeridos' }, { status: 400 })
      }

      const linea = await insertarLineaInscripcion(sb, ac, {
        modalidad,
        idPerfiles,
        idCategoria: idCategoria ? Number(idCategoria) : null,
      })

      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      await recalcularMontosAcademia(sb, ac.id)
      return NextResponse.json({ linea })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
