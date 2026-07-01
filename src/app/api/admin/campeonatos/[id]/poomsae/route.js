import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchOrdenPoomsaeCampeonato, MODALIDADES_POOMSAE } from '@/lib/campeonato/poomsae-orden'

export const dynamic = 'force-dynamic'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data: camp } = await sb.from('campeonato').select('id_campeonato, nombre, slug, fecha_inicio').eq('id_campeonato', idCampeonato).maybeSingle()

    const { categorias, resumen, soporteSorteo, soporteCalificacion } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)
    return NextResponse.json({ campeonato: camp, categorias, resumen, soporteSorteo, soporteCalificacion })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST: realiza el sorteo del orden de salida poomsae y lo persiste.
 * body: { idCategoria }  -> sortea una categoría
 *       { todas: true }  -> sortea todas las categorías con inscritos
 *       { idCategoria, reset: true } -> vuelve al orden por dorsal (limpia sorteo)
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const sb = getSupabaseAdmin()

    // Categorías objetivo
    let categoriasObjetivo = []
    if (body.todas) {
      const { data: cats } = await sb
        .from('categoria_campeonato')
        .select('id_categoria')
        .eq('id_campeonato', idCampeonato)
        .eq('modalidad', 'poomsae')
      categoriasObjetivo = (cats || []).map((c) => c.id_categoria)
    } else if (body.idCategoria) {
      categoriasObjetivo = [Number(body.idCategoria)]
    } else {
      return NextResponse.json({ error: 'Indica idCategoria o todas:true' }, { status: 400 })
    }

    // Verifica soporte de columna orden_poomsae antes de intentar escribir.
    const probe = await sb.from('linea_inscripcion').select('orden_poomsae').limit(1)
    if (probe.error && /orden_poomsae/.test(probe.error.message || '')) {
      return NextResponse.json({
        error: 'Falta aplicar la migración de sorteo (columna orden_poomsae). Ejecuta la migración 20260701090000_poomsae_orden_sorteo.sql en Supabase.',
        needsMigration: true,
      }, { status: 409 })
    }

    let totalSorteadas = 0
    for (const idCat of categoriasObjetivo) {
      const { data: lineas } = await sb
        .from('linea_inscripcion')
        .select('id_linea')
        .eq('id_campeonato', idCampeonato)
        .eq('id_categoria', idCat)
        .in('modalidad', MODALIDADES_POOMSAE)
        .eq('estado', 'aprobado')
      if (!lineas || !lineas.length) continue

      if (body.reset) {
        await sb
          .from('linea_inscripcion')
          .update({ orden_poomsae: null, updated_at: new Date().toISOString() })
          .in('id_linea', lineas.map((l) => l.id_linea))
        totalSorteadas++
        continue
      }

      const orden = shuffle(lineas.map((l) => l.id_linea))
      // Persistir orden 1..N por línea
      for (let i = 0; i < orden.length; i++) {
        await sb
          .from('linea_inscripcion')
          .update({ orden_poomsae: i + 1, updated_at: new Date().toISOString() })
          .eq('id_linea', orden[i])
      }
      totalSorteadas++
    }

    const { categorias, resumen } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)
    return NextResponse.json({
      ok: true,
      categoriasSorteadas: totalSorteadas,
      reset: Boolean(body.reset),
      categorias,
      resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
