import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { parsePaginacion, totalPaginas } from '@/lib/campeonato/paginacion-server'
import {
  LINEA_SELECT_ADMIN,
  LINEA_SELECT_ADMIN_PAGOS,
  academiaPerteneceACampeonato,
  lineaConPagos,
} from '@/lib/campeonato/lineas-academia-server'

/**
 * Líneas de inscripción de UNA academia (lazy load al expandir).
 * ?page=&limit=&modalidad=&q=&pagos=1
 */
export async function GET(request, { params }) {
  try {
    const { id, acId } = await params
    const idCampeonato = Number(id)
    const idAcademiaCamp = Number(acId)
    if (!idCampeonato || !idAcademiaCamp) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()

    const pertenece = await academiaPerteneceACampeonato(sb, idAcademiaCamp, idCampeonato)
    if (!pertenece) return NextResponse.json({ error: 'Academia no encontrada' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const { page, limit, desde, hasta } = parsePaginacion(searchParams, { limitDefecto: 100, limitMax: 200 })
    const modalidad = (searchParams.get('modalidad') || '').trim()
    const q = (searchParams.get('q') || '').trim()
    const conPagos = searchParams.get('pagos') === '1'

    let query = sb
      .from('linea_inscripcion')
      .select(conPagos ? LINEA_SELECT_ADMIN_PAGOS : LINEA_SELECT_ADMIN, { count: 'exact' })
      .eq('id_campeonato', idCampeonato)
      .eq('id_academia_campeonato', idAcademiaCamp)
      .neq('estado', 'anulado')
      .order('created_at', { ascending: true })
      .range(desde, hasta)

    if (modalidad && modalidad !== 'todas') query = query.eq('modalidad', modalidad)
    if (q) query = query.ilike('dorsal_display', `%${q}%`)

    const { data, count, error } = await query
    if (error) throw error

    const lineas = conPagos ? (data || []).map(lineaConPagos) : data || []

    return NextResponse.json({
      lineas,
      total: count || 0,
      page,
      limit,
      totalPaginas: totalPaginas(count, limit),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
