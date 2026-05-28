import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: acs } = await sb
      .from('academia_campeonato')
      .select('id')
      .eq('id_campeonato', idCampeonato)
    const acIds = (acs || []).map((a) => a.id)

    const { data: lineas } = await sb
      .from('linea_inscripcion')
      .select('id_linea')
      .eq('id_campeonato', idCampeonato)
    const lineaIds = (lineas || []).map((l) => l.id_linea)

    if (lineaIds.length) {
      await sb.from('asignacion_pago').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion_miembro').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion').delete().in('id_linea', lineaIds)
    }

    if (acIds.length) {
      await sb.from('comprobante_pago').delete().in('id_academia_campeonato', acIds)
      await sb.from('bitacora_inscripcion').delete().in('id_academia_campeonato', acIds)
      await sb.from('academia_campeonato').delete().in('id', acIds)
    }

    await sb.from('campeonato_tarifa').delete().eq('id_campeonato', idCampeonato)
    await sb.from('categoria_campeonato').delete().eq('id_campeonato', idCampeonato)
    await sb.from('campeonato_registro_academia_dia').delete().eq('id_campeonato', idCampeonato)
    await sb.from('inscripcion_campeonato').delete().eq('id_campeonato', idCampeonato)
    await sb.from('competidor').delete().eq('id_campeonato', idCampeonato)

    const { error } = await sb.from('campeonato').delete().eq('id_campeonato', idCampeonato)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
