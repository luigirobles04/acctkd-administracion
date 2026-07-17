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

    if (body.idCategoria && body.cerrarCategoria) {
      const idCategoria = Number(body.idCategoria)
      const { data: lineas, error } = await sb
        .from('linea_inscripcion')
        .select('id_linea, poomsae_puntaje, poomsae_estado')
        .eq('id_campeonato', idCampeonato)
        .eq('id_categoria', idCategoria)
        .eq('estado', 'aprobado')
      if (error) throw error

      const medallas = ['oro', 'plata', 'bronce']
      const ordenados = [...(lineas || [])]
        .filter((l) => l.poomsae_puntaje != null)
        .sort((a, b) => b.poomsae_puntaje - a.poomsae_puntaje)

      return NextResponse.json({
        ok: true,
        totalCalificados: ordenados.length,
        podio: ordenados.slice(0, 3).map((l, i) => ({ id_linea: l.id_linea, medalla: medallas[i], puntaje: l.poomsae_puntaje })),
      })
    }

    return NextResponse.json({ error: 'Indica idLinea+puntaje o idCategoria+cerrarCategoria' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
