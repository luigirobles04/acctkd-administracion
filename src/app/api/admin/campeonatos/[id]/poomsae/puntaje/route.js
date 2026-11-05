import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST: guarda el puntaje de un competidor de poomsae (árbitro/operario de mesa),
 * o calcula el podio (oro/plata/bronce) de una categoría según puntaje — igual que
 * en kyorugi, el podio se calcula al vuelo a partir de los datos, sin tabla aparte.
 * body: { idLinea, puntaje }              -> guarda un puntaje individual
 *       { idCategoria, cerrarCategoria: true } -> calcula y devuelve el podio
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const sb = getSupabaseAdmin()

    const probe = await sb.from('linea_inscripcion').select('poomsae_puntaje').limit(1)
    if (probe.error && /poomsae_puntaje|poomsae_estado/.test(probe.error.message || '')) {
      return NextResponse.json({
        error: 'Falta aplicar la migración de calificación (poomsae_puntaje). Ejecuta 20260701120000_arbitraje_y_logos.sql en Supabase.',
        needsMigration: true,
      }, { status: 409 })
    }

    if (body.idLinea) {
      const { guardarPuntajePoomsaePss } = await import('@/lib/campeonato/poomsae-pss')
      const result = await guardarPuntajePoomsaePss(sb, idCampeonato, body.idLinea, body.puntaje)
      return NextResponse.json({ ok: true, linea: result.linea })
    }

    if (body.cerrarCategoria && (body.grupoKey || body.idCategoria)) {
      const { fetchOrdenPoomsaeCampeonato } = await import('@/lib/campeonato/poomsae-orden')
      const { calcularPodioPoomsaeCategoria } = await import('@/lib/campeonato/podio-poomsae')
      const { categorias } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)
      let cat = null
      if (body.grupoKey) {
        cat = (categorias || []).find((c) => c.grupo_key === body.grupoKey)
      } else {
        const idCategoria = Number(body.idCategoria)
        cat = (categorias || []).find(
          (c) =>
            c.id_categoria === idCategoria &&
            (!body.modalidadKey || c.modalidad_key === body.modalidadKey),
        )
      }
      if (!cat) {
        return NextResponse.json({ error: 'Bloque poomsae no encontrado (catálogo + modalidad)' }, { status: 404 })
      }
      const { podio, estado } = calcularPodioPoomsaeCategoria({
        participantes: cat.participantes,
        cerrada: true,
      })
      if (!podio) {
        return NextResponse.json({ ok: true, estado, totalCalificados: 0, podio: [] })
      }
      const medallas = ['oro', 'plata', 'bronce']
      const filas = [podio.oro, podio.plata, ...(podio.bronce || [])].filter(Boolean)
      return NextResponse.json({
        ok: true,
        grupoKey: cat.grupo_key,
        estado,
        totalCalificados: cat.participantes.filter((p) => p.calificado && p.puntaje != null).length,
        podio: filas.map((p, i) => ({
          id_linea: p.id_linea,
          medalla: medallas[i] || 'bronce',
          puntaje: p.puntaje,
        })),
      })
    }

    return NextResponse.json({ error: 'Indica idLinea+puntaje o idCategoria+cerrarCategoria' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
