import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchResultadosCampeonato } from '@/lib/campeonato/poomsae-pss'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const data = await fetchResultadosCampeonato(sb, campeonato.id_campeonato, campeonato)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
