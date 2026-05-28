import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { parseCompetidor } from '@/lib/campeonato/llaves-kyorugi'

function enrichCombate(l, lineaMap, catMap) {
  const c1 = l.id_linea1 ? lineaMap[l.id_linea1] : null
  const c2 = l.id_linea2 ? lineaMap[l.id_linea2] : null
  const cat = catMap[l.id_categoria]
  return {
    ...l,
    categoria_nombre: cat?.nombre || '',
    competidor1: parseCompetidor(c1),
    competidor2: parseCompetidor(c2),
  }
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: llaves, error } = await sb
      .from('llave_kyorugi')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'vacío')
      .order('orden_pista', { ascending: true, nullsFirst: false })
    if (error) throw error

    const lineaIds = new Set()
    const catIds = new Set()
    for (const l of llaves || []) {
      if (l.id_linea1) lineaIds.add(l.id_linea1)
      if (l.id_linea2) lineaIds.add(l.id_linea2)
      if (l.id_categoria) catIds.add(l.id_categoria)
    }

    let lineaMap = {}
    if (lineaIds.size) {
      const { data: lineas } = await sb
        .from('linea_inscripcion')
        .select(`
          id_linea, dorsal_display,
          academia_campeonato(academia(nombre)),
          miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
        `)
        .in('id_linea', [...lineaIds])
      lineaMap = Object.fromEntries(
        (lineas || []).map((l) => [
          l.id_linea,
          { ...l, academia_nombre: l.academia_campeonato?.academia?.nombre || '' },
        ])
      )
    }

    let catMap = {}
    if (catIds.size) {
      const { data: cats } = await sb
        .from('categoria_campeonato')
        .select('id_categoria, nombre')
        .in('id_categoria', [...catIds])
      catMap = Object.fromEntries((cats || []).map((c) => [c.id_categoria, c]))
    }

    const enriched = (llaves || []).map((l) => enrichCombate(l, lineaMap, catMap))

    const porCancha = { 1: [], 2: [], 3: [] }
    for (const c of enriched) {
      if (c.cancha && porCancha[c.cancha]) porCancha[c.cancha].push(c)
    }

    for (const k of [1, 2, 3]) {
      porCancha[k].sort((a, b) => (a.orden_pista || 9999) - (b.orden_pista || 9999))
    }

    return NextResponse.json({ porCancha, total: enriched.length })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
