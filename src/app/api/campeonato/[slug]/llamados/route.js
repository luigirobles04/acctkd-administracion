import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchCombatesCampeonato, organizarPantallaCancha } from '@/lib/campeonato/canchas-data'
import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { organizarPantallaPoomsae } from '@/lib/campeonato/poomsae-pss'

export const dynamic = 'force-dynamic'

/**
 * Zona de llamados: kyorugi (3 áreas) + poomsae (cola por categoría).
 */
export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const [{ porCancha, total }, poomsaeOrden] = await Promise.all([
      fetchCombatesCampeonato(sb, campeonato.id_campeonato),
      fetchOrdenPoomsaeCampeonato(sb, campeonato.id_campeonato).catch(() => ({
        categorias: [],
        resumen: { totalParticipantes: 0 },
      })),
    ])

    const areas = [1, 2, 3].map((cancha) => ({
      cancha,
      ...organizarPantallaCancha(porCancha[cancha] || []),
    }))

    const poomsae = organizarPantallaPoomsae(poomsaeOrden.categorias || [])

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
        poomsae,
        totalCampeonato: total,
        totalPoomsae: poomsaeOrden.resumen?.totalParticipantes ?? 0,
        actualizado: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 's-maxage=4, stale-while-revalidate=8' } }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
