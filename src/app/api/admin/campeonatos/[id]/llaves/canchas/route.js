import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchCombatesCampeonato } from '@/lib/campeonato/canchas-data'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { porCancha, total } = await fetchCombatesCampeonato(sb, idCampeonato)
    return NextResponse.json({ porCancha, total })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
