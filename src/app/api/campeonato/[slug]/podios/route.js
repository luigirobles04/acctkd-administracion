import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchPodiosCampeonato } from '@/lib/campeonato/podio-kyorugi'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { podios, resumen } = await fetchPodiosCampeonato(sb, campeonato.id_campeonato)
    const publicos = podios.filter((p) => p.estado === 'completo')

    return NextResponse.json({
      campeonato: {
        nombre: campeonato.nombre,
        slug: campeonato.slug,
        ciudad: campeonato.ciudad,
      },
      podios: publicos,
      resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
