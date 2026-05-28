import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

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
      aprobadas: (lineas || []).filter((l) => l.estado === 'aprobado').length,
      pagadas: (lineas || []).filter((l) => ['pagado', 'aprobado'].includes(l.estado)).length,
      pendientes: (lineas || []).filter((l) => l.estado === 'pendiente_pago').length,
      comprobantesPendientes: comprobantes.filter((c) => c.estado === 'pendiente').length,
    }

    return NextResponse.json({
      comprobantes,
      lineas: lineas || [],
      recaudacion,
      resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
