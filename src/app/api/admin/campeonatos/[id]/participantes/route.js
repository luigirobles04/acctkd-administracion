import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { LINEA_SELECT_ADMIN } from '@/lib/campeonato/lineas-academia-server'

const LIMIT_MAX = 100

async function idsPerfilesPorDocumento(sb, dni) {
  const patron = `%${dni.trim()}%`
  const { data: perfiles, error } = await sb
    .from('competidor_perfil')
    .select('id_perfil')
    .ilike('documento_numero', patron)
    .limit(400)
  if (error) throw error
  return (perfiles || []).map((p) => p.id_perfil)
}

async function idsLineasPorPerfil(sb, idCampeonato, filtroPerfil) {
  const patron = `%${filtroPerfil.trim()}%`
  const { data: perfiles, error } = await sb
    .from('competidor_perfil')
    .select('id_perfil')
    .or(`nombres.ilike.${patron},apellidos.ilike.${patron}`)
    .limit(400)
  if (error) throw error
  const ids = (perfiles || []).map((p) => p.id_perfil)
  if (!ids.length) return []

  const { data: miembros, error: errM } = await sb
    .from('linea_inscripcion_miembro')
    .select('id_linea, linea_inscripcion!inner(id_campeonato, estado)')
    .in('id_perfil', ids)
    .eq('linea_inscripcion.id_campeonato', idCampeonato)
    .neq('linea_inscripcion.estado', 'anulado')
    .limit(800)
  if (errM) throw errM
  return [...new Set((miembros || []).map((m) => m.id_linea))]
}

async function idsAcademiasPorNombre(sb, idCampeonato, nombre) {
  const patron = `%${nombre.trim()}%`
  const { data, error } = await sb
    .from('academia_campeonato')
    .select('id, academia:id_academia!inner(nombre)')
    .eq('id_campeonato', idCampeonato)
    .ilike('academia.nombre', patron)
    .limit(80)
  if (error) throw error
  return (data || []).map((a) => a.id)
}

/**
 * Listado paginado de inscripciones activas con filtros opcionales.
 * ?dni=&nombre=&dorsal=&academia=&modalidad=&page=1&limit=50
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const dni = (searchParams.get('dni') || '').trim()
    const nombre = (searchParams.get('nombre') || '').trim()
    const dorsal = (searchParams.get('dorsal') || '').trim()
    const academia = (searchParams.get('academia') || '').trim()
    const modalidad = (searchParams.get('modalidad') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(LIMIT_MAX, Math.max(1, Number(searchParams.get('limit')) || 50))

    const sb = getSupabaseAdmin()
    let idLineasFiltradas = null

    if (dni) {
      const perfilIds = await idsPerfilesPorDocumento(sb, dni)
      if (!perfilIds.length) {
        return NextResponse.json({ lineas: [], total: 0, page, limit, totalPaginas: 0 })
      }
      const { data: miembros, error: errDni } = await sb
        .from('linea_inscripcion_miembro')
        .select('id_linea, linea_inscripcion!inner(id_campeonato, estado)')
        .in('id_perfil', perfilIds)
        .eq('linea_inscripcion.id_campeonato', idCampeonato)
        .neq('linea_inscripcion.estado', 'anulado')
        .limit(800)
      if (errDni) throw errDni
      idLineasFiltradas = [...new Set((miembros || []).map((m) => m.id_linea))]
    }
    if (nombre) {
      const idsNom = await idsLineasPorPerfil(sb, idCampeonato, nombre)
      idLineasFiltradas = idLineasFiltradas == null ? idsNom : idLineasFiltradas.filter((x) => idsNom.includes(x))
    }

    if (academia) {
      const acIds = await idsAcademiasPorNombre(sb, idCampeonato, academia)
      if (!acIds.length) {
        return NextResponse.json({ lineas: [], total: 0, page, limit, totalPaginas: 0 })
      }
      const { data: lineasAc, error: errAc } = await sb
        .from('linea_inscripcion')
        .select('id_linea')
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado')
        .in('id_academia_campeonato', acIds)
      if (errAc) throw errAc
      const idsAc = (lineasAc || []).map((l) => l.id_linea)
      idLineasFiltradas =
        idLineasFiltradas == null ? idsAc : idLineasFiltradas.filter((x) => idsAc.includes(x))
    }

    if (idLineasFiltradas != null && idLineasFiltradas.length === 0) {
      return NextResponse.json({ lineas: [], total: 0, page, limit, totalPaginas: 0 })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = sb
      .from('linea_inscripcion')
      .select(LINEA_SELECT_ADMIN, { count: 'exact' })
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')

    if (idLineasFiltradas != null) q = q.in('id_linea', idLineasFiltradas.slice(0, 2000))
    if (dorsal) q = q.ilike('dorsal_display', `%${dorsal}%`)
    if (modalidad && modalidad !== 'todas') q = q.eq('modalidad', modalidad)

    const { data, error, count } = await q
      .order('dorsal_numero', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0
    const totalPaginas = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({ lineas: data || [], total, page, limit, totalPaginas })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
