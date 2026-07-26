import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { LINEA_SELECT_ADMIN } from '@/lib/campeonato/lineas-academia-server'

const LIMIT_MAX = 50

/**
 * Búsqueda global server-side de inscripciones de un campeonato.
 * ?q= (mín. 2 caracteres) busca por dorsal, nombre/apellido o academia.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(LIMIT_MAX, Math.max(1, Number(searchParams.get('limit')) || 30))
    if (q.length < 2) {
      return NextResponse.json({ lineas: [], q, mensaje: 'Escribe al menos 2 caracteres' })
    }

    const sb = getSupabaseAdmin()
    const patron = `%${q}%`

    // 1) Por dorsal
    const porDorsal = sb
      .from('linea_inscripcion')
      .select(LINEA_SELECT_ADMIN)
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')
      .ilike('dorsal_display', patron)
      .limit(limit)

    // 2) Por nombre/apellido de perfil (ids primero, líneas después)
    const porPerfil = sb
      .from('competidor_perfil')
      .select('id_perfil')
      .or(`nombres.ilike.${patron},apellidos.ilike.${patron}`)
      .limit(200)

    // 3) Por nombre de academia
    const porAcademia = sb
      .from('academia_campeonato')
      .select('id, academia:id_academia!inner(nombre)')
      .eq('id_campeonato', idCampeonato)
      .ilike('academia.nombre', patron)
      .limit(50)

    const [resDorsal, resPerfil, resAcademia] = await Promise.all([porDorsal, porPerfil, porAcademia])
    if (resDorsal.error) throw resDorsal.error

    const lineas = new Map()
    for (const l of resDorsal.data || []) lineas.set(l.id_linea, l)

    const perfilIds = (resPerfil.data || []).map((p) => p.id_perfil)
    if (perfilIds.length && lineas.size < limit) {
      const { data: miembros } = await sb
        .from('linea_inscripcion_miembro')
        .select('id_linea')
        .in('id_perfil', perfilIds)
        .limit(300)
      const lineaIds = [...new Set((miembros || []).map((m) => m.id_linea))]
      if (lineaIds.length) {
        const { data } = await sb
          .from('linea_inscripcion')
          .select(LINEA_SELECT_ADMIN)
          .eq('id_campeonato', idCampeonato)
          .neq('estado', 'anulado')
          .in('id_linea', lineaIds.slice(0, 200))
          .limit(limit)
        for (const l of data || []) lineas.set(l.id_linea, l)
      }
    }

    const acIds = (resAcademia.data || []).map((a) => a.id)
    if (acIds.length && lineas.size < limit) {
      const { data } = await sb
        .from('linea_inscripcion')
        .select(LINEA_SELECT_ADMIN)
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado')
        .in('id_academia_campeonato', acIds)
        .limit(limit)
      for (const l of data || []) lineas.set(l.id_linea, l)
    }

    return NextResponse.json({ lineas: [...lineas.values()].slice(0, limit), q })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
