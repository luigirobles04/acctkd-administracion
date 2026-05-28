import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  aplicarFifoPagos,
  asignarDorsalLinea,
  registrarPagoManualLinea,
  registrarPagoTotalAcademia,
  recalcularMontosAcademia,
} from '@/lib/campeonato/inscripcion-server'

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

    let comprobantes = []
    if (ids.length) {
      const { data, error } = await sb
        .from('comprobante_pago')
        .select('*, academia_campeonato(id, academia:academia(nombre))')
        .in('id_academia_campeonato', ids)
        .order('created_at', { ascending: false })
      if (error) throw error
      comprobantes = data || []
    }

    const { data: lineas, error: errLi } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(nombre),
        academia_campeonato(academia:academia(nombre, codigo_prefijo)),
        miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(nombres, apellidos, documento_numero))
      `)
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')
      .order('created_at', { ascending: true })
    if (errLi) throw errLi

    const lineaIds = (lineas || []).map((l) => l.id_linea)
    let pagosPorLinea = {}
    if (lineaIds.length) {
      const { data: asignaciones } = await sb
        .from('asignacion_pago')
        .select('id_linea, monto')
        .in('id_linea', lineaIds)
      pagosPorLinea = (asignaciones || []).reduce((acc, a) => {
        acc[a.id_linea] = (acc[a.id_linea] || 0) + Number(a.monto || 0)
        return acc
      }, {})
    }

    const lineasConPago = (lineas || []).map((l) => ({
      ...l,
      monto_pagado: pagosPorLinea[l.id_linea] || 0,
      pago_completo: Number(pagosPorLinea[l.id_linea] || 0) >= Number(l.precio_aplicado || 0),
    }))

    const recaudacion = (acs || []).reduce(
      (acc, ac) => {
        acc.totalEsperado += Number(ac.monto_total || 0)
        acc.recaudado += Number(ac.monto_asignado || 0)
        return acc
      },
      { totalEsperado: 0, recaudado: 0 }
    )
    recaudacion.pendiente = Math.max(0, recaudacion.totalEsperado - recaudacion.recaudado)

    const resumen = {
      aprobadas: lineasConPago.filter((l) => l.dorsal_display).length,
      pagadas: lineasConPago.filter((l) => l.pago_completo).length,
      pendientes: lineasConPago.filter((l) => !l.pago_completo && Number(l.precio_aplicado) > 0).length,
      comprobantesPendientes: comprobantes.filter((c) => c.estado === 'pendiente').length,
    }

    return NextResponse.json({
      comprobantes,
      lineas: lineasConPago,
      academias: (acs || []).map((ac) => ({
        id: ac.id,
        nombre: ac.academia?.nombre,
        monto_total: Number(ac.monto_total || 0),
        monto_asignado: Number(ac.monto_asignado || 0),
        pendiente: Math.max(0, Number(ac.monto_total || 0) - Number(ac.monto_asignado || 0)),
        estado_pago: ac.estado_pago,
      })),
      recaudacion,
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
