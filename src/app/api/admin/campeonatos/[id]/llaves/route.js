import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generarLlaveCategoria, generarTodasLasLlaves, asignarCanchasCampeonato } from '@/lib/campeonato/llaves-kyorugi'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: categorias, error: errC } = await sb
      .from('categoria_campeonato')
      .select('id_categoria, nombre, genero, division')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi')
      .order('orden', { ascending: true })
    if (errC) throw errC

    const { data: counts } = await sb
      .from('linea_inscripcion')
      .select('id_categoria')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi_individual')
      .eq('estado', 'aprobado')
      .not('dorsal_numero', 'is', null)

    const porCat = (counts || []).reduce((acc, l) => {
      if (l.id_categoria) acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1
      return acc
    }, {})

    const { data: llavesExistentes } = await sb
      .from('llave_kyorugi')
      .select('id_categoria')
      .eq('id_campeonato', idCampeonato)

    const conLlave = new Set((llavesExistentes || []).map((l) => l.id_categoria))

    const cats = (categorias || []).map((c) => ({
      ...c,
      inscritos: porCat[c.id_categoria] || 0,
      tiene_llave: conLlave.has(c.id_categoria),
    }))

    return NextResponse.json({ categorias: cats })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const sb = getSupabaseAdmin()

    if (body.reasignarCanchas) {
      const result = await asignarCanchasCampeonato(sb, idCampeonato)
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.todas || body.idsCategorias) {
      const ids = body.idsCategorias ?? null
      const result = await generarTodasLasLlaves(sb, idCampeonato, { idsCategorias: ids })
      return NextResponse.json({ ok: true, ...result })
    }

    const { idCategoria } = body
    if (!idCategoria) return NextResponse.json({ error: 'idCategoria requerido' }, { status: 400 })

    const result = await generarLlaveCategoria(sb, idCampeonato, Number(idCategoria))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
