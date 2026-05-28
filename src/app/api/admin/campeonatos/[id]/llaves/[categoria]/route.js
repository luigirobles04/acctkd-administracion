import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { nombreLinea } from '@/lib/campeonato/llaves-kyorugi'

export async function GET(_request, { params }) {
  try {
    const { id, categoria } = await params
    const idCampeonato = Number(id)
    const idCategoria = Number(categoria)
    if (!idCampeonato || !idCategoria) {
      return NextResponse.json({ error: 'Campeonato y categoría requeridos' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()

    const { data: llaves, error } = await sb
      .from('llave_kyorugi')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .eq('id_categoria', idCategoria)
      .order('ronda', { ascending: true })
      .order('match_numero', { ascending: true })
    if (error) throw error

    const lineaIds = new Set()
    for (const l of llaves || []) {
      if (l.id_linea1) lineaIds.add(l.id_linea1)
      if (l.id_linea2) lineaIds.add(l.id_linea2)
    }

    let lineaMap = {}
    if (lineaIds.size) {
      const { data: lineas } = await sb
        .from('linea_inscripcion')
        .select(`
          id_linea, dorsal_display,
          miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
        `)
        .in('id_linea', [...lineaIds])
      lineaMap = Object.fromEntries((lineas || []).map((l) => [l.id_linea, l]))
    }

    const enriched = (llaves || []).map((l) => ({
      ...l,
      nombre1: nombreLinea(lineaMap[l.id_linea1]),
      nombre2: l.es_bye && !l.id_linea2 ? 'BYE' : l.id_linea2 ? nombreLinea(lineaMap[l.id_linea2]) : '—',
    }))

    const porRonda = enriched.reduce((acc, l) => {
      if (!acc[l.ronda]) acc[l.ronda] = []
      acc[l.ronda].push(l)
      return acc
    }, {})

    return NextResponse.json({ llaves: enriched, porRonda })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
