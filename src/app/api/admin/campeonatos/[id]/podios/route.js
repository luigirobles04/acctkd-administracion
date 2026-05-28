import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchPodiosCampeonato } from '@/lib/campeonato/podio-kyorugi'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data: campeonato } = await sb
      .from('campeonato')
      .select('id_campeonato, nombre, slug, ciudad, lugar')
      .eq('id_campeonato', idCampeonato)
      .single()

    const { podios, resumen } = await fetchPodiosCampeonato(sb, idCampeonato)
    return NextResponse.json({ campeonato, podios, resumen })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
