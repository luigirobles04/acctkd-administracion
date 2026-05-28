import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data: camp } = await sb.from('campeonato').select('id_campeonato, nombre, slug, fecha_inicio').eq('id_campeonato', idCampeonato).maybeSingle()

    const { categorias, resumen } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)
    return NextResponse.json({ campeonato: camp, categorias, resumen })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
