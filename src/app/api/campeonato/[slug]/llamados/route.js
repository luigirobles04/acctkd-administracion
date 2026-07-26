import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchCombatesCampeonato, organizarPantallaCancha } from '@/lib/campeonato/canchas-data'
import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { organizarPantallaPoomsaePorAreas } from '@/lib/campeonato/poomsae-pss'
import { getPoomsaeLiveState } from '@/lib/campeonato/poomsae-live'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Zona de llamados: kyorugi (3 áreas) + poomsae (3 áreas por forma).
 */
export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const [{ porCancha, total }, poomsaeOrden, liveState] = await Promise.all([
      fetchCombatesCampeonato(sb, campeonato.id_campeonato),
      fetchOrdenPoomsaeCampeonato(sb, campeonato.id_campeonato).catch(() => ({
        categorias: [],
        resumen: { totalParticipantes: 0 },
      })),
      getPoomsaeLiveState(sb, campeonato.id_campeonato).catch(() => null),
    ])

    const areas = [1, 2, 3].map((cancha) => ({
      cancha,
      ...organizarPantallaCancha(porCancha[cancha] || []),
    }))

    const poomsae = organizarPantallaPoomsaePorAreas(poomsaeOrden.categorias || [], { liveState })

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
        poomsaeLiveAt: liveState?.updatedAt || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
