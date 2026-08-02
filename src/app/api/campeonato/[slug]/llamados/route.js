import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchPantallaLlamadosKyorugi } from '@/lib/campeonato/canchas-data'
import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { organizarPantallaPoomsaePorAreas } from '@/lib/campeonato/poomsae-pss'
import { getPoomsaeLiveState } from '@/lib/campeonato/poomsae-live'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Zona de llamados: kyorugi (3 áreas) + poomsae (3 áreas por forma).
 * Query: ?modo=kyorugi (default, API liviana) | ?modo=poomsae | ?modo=todos
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const modo = new URL(request.url).searchParams.get('modo') || 'kyorugi'
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const id = campeonato.id_campeonato
    let areas = []
    let totalCampeonato = 0
    let poomsae = null
    let totalPoomsae = 0
    let poomsaeLiveAt = null

    if (modo === 'kyorugi' || modo === 'todos') {
      const ky = await fetchPantallaLlamadosKyorugi(sb, id)
      areas = ky.areas
      totalCampeonato = ky.total
    }

    if (modo === 'poomsae' || modo === 'todos') {
      const [poomsaeOrden, liveState] = await Promise.all([
        fetchOrdenPoomsaeCampeonato(sb, id).catch(() => ({
          categorias: [],
          resumen: { totalParticipantes: 0 },
        })),
        getPoomsaeLiveState(sb, id).catch(() => null),
      ])
      poomsae = organizarPantallaPoomsaePorAreas(poomsaeOrden.categorias || [], { liveState })
      totalPoomsae = poomsaeOrden.resumen?.totalParticipantes ?? 0
      poomsaeLiveAt = liveState?.updatedAt || null

      if (modo === 'poomsae' && !areas.length) {
        areas = [1, 2, 3].map((cancha) => ({
          cancha,
          actual: null,
          proximos: [],
          recientes: [],
          stats: { terminados: 0, total: 0, pendientes: 0 },
        }))
      }
    }

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
        totalCampeonato,
        totalPoomsae,
        actualizado: new Date().toISOString(),
        poomsaeLiveAt,
        modo,
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
