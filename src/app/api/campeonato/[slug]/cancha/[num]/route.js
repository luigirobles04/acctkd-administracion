import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { obtenerCampeonatoPorSlug } from '@/lib/campeonato/inscripcion-server'
import { fetchCombatesCampeonato, organizarPantallaCancha } from '@/lib/campeonato/canchas-data'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { slug, num } = await params
    const cancha = Number(num)
    if (!cancha || cancha < 1 || cancha > 3) {
      return NextResponse.json({ error: 'Cancha inválida (1–3)' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const { porCancha, total } = await fetchCombatesCampeonato(sb, campeonato.id_campeonato)
    const combates = porCancha[cancha] || []
    const pantalla = organizarPantallaCancha(combates)

    return NextResponse.json({
      campeonato: {
        nombre: campeonato.nombre,
        slug: campeonato.slug,
        ciudad: campeonato.ciudad,
        lugar: campeonato.lugar,
        estado: campeonato.estado,
      },
      cancha,
      totalCampeonato: total,
      ...pantalla,
      actualizado: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
