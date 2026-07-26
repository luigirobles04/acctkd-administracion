import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchCombatesCampeonato, organizarPantallaCancha } from '@/lib/campeonato/canchas-data'

export const dynamic = 'force-dynamic'

/**
 * Zona de llamados: las 3 áreas en una sola respuesta.
 * Pensado para 1 pantalla fija en el coliseo (1 request por poll en vez de 3).
 */
export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const { porCancha, total } = await fetchCombatesCampeonato(sb, campeonato.id_campeonato)

    const areas = [1, 2, 3].map((cancha) => ({
      cancha,
      ...organizarPantallaCancha(porCancha[cancha] || []),
    }))

    return NextResponse.json(
      {
        campeonato: {
          nombre: campeonato.nombre,
          slug: campeonato.slug,
          ciudad: campeonato.ciudad,
          lugar: campeonato.lugar,
          estado: campeonato.estado,
        },
        areas,
        totalCampeonato: total,
        actualizado: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 's-maxage=4, stale-while-revalidate=8' } }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
