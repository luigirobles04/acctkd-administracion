import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchOrdenPoomsaeCampeonato, MODALIDADES_POOMSAE } from '@/lib/campeonato/poomsae-orden'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const UPDATE_CHUNK = 40

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function aplicarOrdenLineas(sb, patches) {
  for (let i = 0; i < patches.length; i += UPDATE_CHUNK) {
    const chunk = patches.slice(i, i + UPDATE_CHUNK)
    const results = await Promise.all(
      chunk.map(({ id_linea, orden_poomsae }) =>
        sb
          .from('linea_inscripcion')
          .update({ orden_poomsae, updated_at: new Date().toISOString() })
          .eq('id_linea', id_linea),
      ),
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) throw new Error(failed.error.message)
  }
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data: camp } = await sb
      .from('campeonato')
      .select('id_campeonato, nombre, slug, fecha_inicio')
      .eq('id_campeonato', idCampeonato)
      .maybeSingle()

    const { categorias, resumen, soporteSorteo, soporteCalificacion } = await fetchOrdenPoomsaeCampeonato(
      sb,
      idCampeonato,
    )
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

    const probe = await sb.from('linea_inscripcion').select('orden_poomsae').limit(1)
    if (probe.error && /orden_poomsae/.test(probe.error.message || '')) {
      return NextResponse.json(
        {
          error:
            'Falta aplicar la migración de sorteo (columna orden_poomsae). Ejecuta la migración 20260701090000_poomsae_orden_sorteo.sql en Supabase.',
          needsMigration: true,
        },
        { status: 409 },
      )
    }

    // Solo líneas poomsae aprobadas del campeonato (una query)
    let q = sb
      .from('linea_inscripcion')
      .select('id_linea, id_categoria')
      .eq('id_campeonato', idCampeonato)
      .in('modalidad', MODALIDADES_POOMSAE)
      .eq('estado', 'aprobado')
      .not('id_categoria', 'is', null)

    if (!body.todas) {
      if (!body.idCategoria) {
        return NextResponse.json({ error: 'Indica idCategoria o todas:true' }, { status: 400 })
      }
      q = q.eq('id_categoria', Number(body.idCategoria))
    }

    const { data: lineas, error: errL } = await q
    if (errL) throw errL
    if (!lineas?.length) {
      return NextResponse.json({ error: 'No hay inscritos poomsae para sortear' }, { status: 400 })
    }

    // Agrupar por categoría
    const porCat = new Map()
    for (const l of lineas) {
      if (!porCat.has(l.id_categoria)) porCat.set(l.id_categoria, [])
      porCat.get(l.id_categoria).push(l.id_linea)
    }

    const patches = []
    for (const ids of porCat.values()) {
      if (body.reset) {
        for (const id_linea of ids) patches.push({ id_linea, orden_poomsae: null })
        continue
      }
      const orden = shuffle(ids)
      for (let i = 0; i < orden.length; i++) {
        patches.push({ id_linea: orden[i], orden_poomsae: i + 1 })
      }
    }

    try {
      await aplicarOrdenLineas(sb, patches)
    } catch (e) {
      return NextResponse.json(
        {
          error: `${e.message}. El sorteo pudo quedar parcial: vuelve a pulsar «Sortear todas» para reintentar.`,
          parcial: true,
        },
        { status: 500 },
      )
    }

    const { categorias, resumen } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)
    return NextResponse.json({
      ok: true,
      categoriasSorteadas: porCat.size,
      lineasActualizadas: patches.length,
      reset: Boolean(body.reset),
      categorias,
      resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
