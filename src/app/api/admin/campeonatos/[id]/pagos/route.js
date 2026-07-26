import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { voucherInscripcionProxyUrl } from '@/lib/campeonato/voucher-inscripcion'
import { calcularRecaudacion, resumenPagosPorAcademia } from '@/lib/campeonato/resumen-pagos'
import {
  aplicarFifoPagos,
  asignarDorsalLinea,
  registrarPagoManualLinea,
  registrarPagoTotalAcademia,
  recalcularMontosAcademia,
} from '@/lib/campeonato/inscripcion-server'

/**
 * Resumen de pagos calculado en servidor con líneas "ligeras" (sin joins de
 * perfiles). Las líneas detalladas por academia se cargan lazy al expandir
 * vía /academias/[acId]/lineas?pagos=1 (rendimiento con miles de filas).
 */
export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: acs, error: errAc } = await sb
      .from('academia_campeonato')
      .select('id, monto_total, monto_asignado, estado_pago, academia:id_academia(nombre)')
      .eq('id_campeonato', idCampeonato)
    if (errAc) throw errAc

    const ids = (acs || []).map((a) => a.id)

    const [resComprobantes, resLineas] = await Promise.all([
      ids.length
        ? sb
            .from('comprobante_pago')
            .select('*, academia_campeonato(id, academia:academia(nombre))')
            .in('id_academia_campeonato', ids)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      sb
        .from('linea_inscripcion')
        .select('id_linea, id_academia_campeonato, modalidad, estado, dorsal_display, precio_aplicado, pagos:asignacion_pago(monto)')
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado'),
    ])
    if (resComprobantes.error) throw resComprobantes.error
    if (resLineas.error) throw resLineas.error

    const comprobantes = resComprobantes.data || []
    const { resumen, porAcademia } = resumenPagosPorAcademia(resLineas.data, acs, comprobantes)

    const comprobantesConUrl = comprobantes.map((c) => ({
      ...c,
      archivo_proxy_url: voucherInscripcionProxyUrl(c.archivo_url),
    }))

    return NextResponse.json({
      comprobantes: comprobantesConUrl,
      academias: porAcademia,
      recaudacion: calcularRecaudacion(acs),
      resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const sb = getSupabaseAdmin()

    if (body.accion === 'validar_comprobante') {
      const { idComprobante, montoValidado, idAcademiaCampeonato } = body
      const monto = Number(montoValidado)
      if (!idComprobante || !Number.isFinite(monto) || monto <= 0) {
        return NextResponse.json({ error: 'Comprobante y monto válido requeridos' }, { status: 400 })
      }

      await sb
        .from('comprobante_pago')
        .update({ monto_validado: monto, estado: 'validado' })
        .eq('id_comprobante', idComprobante)

      await aplicarFifoPagos(sb, idComprobante, idAcademiaCampeonato)
      const montos = await recalcularMontosAcademia(sb, idAcademiaCampeonato)
      return NextResponse.json({ ok: true, montos })
    }

    if (body.accion === 'rechazar_comprobante') {
      const { idComprobante, observaciones } = body
      if (!idComprobante) return NextResponse.json({ error: 'idComprobante requerido' }, { status: 400 })

      await sb
        .from('comprobante_pago')
        .update({
          estado: 'rechazado',
          observaciones: observaciones || 'Rechazado por admin',
        })
        .eq('id_comprobante', idComprobante)

      return NextResponse.json({ ok: true })
    }

    if (body.accion === 'asignar_dorsal' || body.accion === 'aprobar_linea') {
      const { idLinea } = body
      if (!idLinea) return NextResponse.json({ error: 'idLinea requerido' }, { status: 400 })

      const { data: linea } = await sb
        .from('linea_inscripcion')
        .select('id_campeonato')
        .eq('id_linea', idLinea)
        .single()
      if (!linea || linea.id_campeonato !== idCampeonato) {
        return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
      }

      const updated = await asignarDorsalLinea(sb, idLinea)
      return NextResponse.json({ linea: updated })
    }

    if (body.accion === 'marcar_pagada') {
      const { idLinea } = body
      if (!idLinea) return NextResponse.json({ error: 'idLinea requerido' }, { status: 400 })

      const { data: linea } = await sb
        .from('linea_inscripcion')
        .select('id_academia_campeonato, id_campeonato')
        .eq('id_linea', idLinea)
        .single()
      if (!linea || linea.id_campeonato !== idCampeonato) {
        return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
      }

      const montos = await registrarPagoManualLinea(sb, idLinea, linea.id_academia_campeonato)
      return NextResponse.json({ ok: true, montos })
    }

    if (body.accion === 'pago_total') {
      const { idAcademiaCampeonato } = body
      if (!idAcademiaCampeonato) return NextResponse.json({ error: 'idAcademiaCampeonato requerido' }, { status: 400 })

      const { data: ac } = await sb
        .from('academia_campeonato')
        .select('id, id_campeonato')
        .eq('id', idAcademiaCampeonato)
        .single()
      if (!ac || ac.id_campeonato !== idCampeonato) {
        return NextResponse.json({ error: 'Academia no encontrada' }, { status: 404 })
      }

      const result = await registrarPagoTotalAcademia(sb, idAcademiaCampeonato)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
