import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { parsePaginacion, totalPaginas } from '@/lib/campeonato/paginacion-server'
import { calcularRecaudacion } from '@/lib/campeonato/resumen-pagos'

/**
 * Lista paginada de academias del campeonato con conteo de líneas.
 * Ya NO devuelve el array masivo de líneas: se cargan lazy al expandir
 * cada academia vía /academias/[acId]/lineas (rendimiento con miles de filas).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const { page, limit, desde, hasta } = parsePaginacion(searchParams, { limitDefecto: 30, limitMax: 100 })
    const q = (searchParams.get('q') || '').trim()

    let query = sb
      .from('academia_campeonato')
      .select('*, academia:id_academia!inner(*)', { count: 'exact' })
      .eq('id_campeonato', idCampeonato)
      .order('created_at', { ascending: false })
      .range(desde, hasta)
    if (q) query = query.ilike('academia.nombre', `%${q}%`)

    const [{ data: academias, count, error: errAc }, { data: acsRecaudacion, error: errRec }] = await Promise.all([
      query,
      sb
        .from('academia_campeonato')
        .select('monto_total, monto_asignado')
        .eq('id_campeonato', idCampeonato),
    ])
    if (errAc) throw errAc
    if (errRec) throw errRec

    // Conteo de líneas activas solo para las academias de esta página
    const acIds = (academias || []).map((a) => a.id)
    const conteoLineas = {}
    if (acIds.length) {
      const { data: lineasLight, error: errLi } = await sb
        .from('linea_inscripcion')
        .select('id_linea, id_academia_campeonato')
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado')
        .in('id_academia_campeonato', acIds)
      if (errLi) throw errLi
      for (const l of lineasLight || []) {
        conteoLineas[l.id_academia_campeonato] = (conteoLineas[l.id_academia_campeonato] || 0) + 1
      }
    }

    return NextResponse.json({
      academias: (academias || []).map((ac) => ({ ...ac, lineas_count: conteoLineas[ac.id] || 0 })),
      total: count || 0,
      page,
      limit,
      totalPaginas: totalPaginas(count, limit),
      recaudacion: calcularRecaudacion(acsRecaudacion),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { acId, accion, motivo } = body
    if (!acId || !accion) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: ac, error: errAc } = await sb
      .from('academia_campeonato')
      .select('id')
      .eq('id', acId)
      .eq('id_campeonato', idCampeonato)
      .single()
    if (errAc || !ac) return NextResponse.json({ error: 'Academia no encontrada' }, { status: 404 })

    if (accion === 'aprobar') {
      await sb
        .from('academia_campeonato')
        .update({ estado_aprobacion: 'aprobada', motivo_rechazo: null })
        .eq('id', acId)
      await sb.from('bitacora_inscripcion').insert({
        id_academia_campeonato: acId,
        accion: 'academia_aprobada',
        actor: 'admin',
      })
    } else if (accion === 'rechazar') {
      await sb
        .from('academia_campeonato')
        .update({
          estado_aprobacion: 'rechazada',
          motivo_rechazo: motivo || 'No cumple requisitos',
        })
        .eq('id', acId)
      await sb.from('bitacora_inscripcion').insert({
        id_academia_campeonato: acId,
        accion: 'academia_rechazada',
        detalle: { motivo: motivo || 'No cumple requisitos' },
        actor: 'admin',
      })
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
