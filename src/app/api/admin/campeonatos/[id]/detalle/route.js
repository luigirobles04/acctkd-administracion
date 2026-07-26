import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: campeonato, error: errCamp } = await sb
      .from('campeonato')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .single()
    if (errCamp) throw errCamp

    // Respuesta ligera: solo conteos y academias resumidas. Las líneas de
    // inscripción se cargan lazy por academia (rendimiento con miles de filas).
    const [
      { count: categoriasCount, error: errCats },
      { count: inscripcionesCount, error: errIns },
      { data: academiasCamp, error: errAc },
      { data: lineasLight, error: errLi },
    ] = await Promise.all([
      sb.from('categoria_campeonato').select('*', { count: 'exact', head: true }).eq('id_campeonato', idCampeonato),
      sb.from('inscripcion_campeonato').select('*', { count: 'exact', head: true }).eq('id_campeonato', idCampeonato),
      sb
        .from('academia_campeonato')
        .select('*, academia:id_academia(nombre, codigo_prefijo)')
        .eq('id_campeonato', idCampeonato)
        .order('created_at', { ascending: true }),
      sb
        .from('linea_inscripcion')
        .select('id_linea, id_academia_campeonato')
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado'),
    ])

    if (errCats) throw errCats
    if (errIns) throw errIns
    if (errAc) throw errAc
    if (errLi) throw errLi

    const conteoLineas = {}
    for (const l of lineasLight || []) {
      conteoLineas[l.id_academia_campeonato] = (conteoLineas[l.id_academia_campeonato] || 0) + 1
    }

    const recaudacion = (academiasCamp || []).reduce(
      (acc, ac) => {
        acc.totalEsperado += Number(ac.monto_total || 0)
        acc.recaudado += Number(ac.monto_asignado || 0)
        return acc
      },
      { totalEsperado: 0, recaudado: 0 }
    )
    recaudacion.pendiente = Math.max(0, recaudacion.totalEsperado - recaudacion.recaudado)

    const { data: catNombres } = await sb
      .from('categoria_campeonato')
      .select('nombre')
      .eq('id_campeonato', idCampeonato)
      .limit(600)

    const nombres = (catNombres || []).map((c) => String(c.nombre || ''))
    const catalogoViejo =
      (categoriasCount || 0) < 480
      || !nombres.some((n) => n.includes('Infantil A'))
      || nombres.some((n) => n.includes('Poomsae Cadete B'))
      || !nombres.some((n) => n.includes('Poomsae Il Jang · Cadete'))
    const necesitaActivacion = !campeonato.slug || !campeonato.publicado || catalogoViejo

    return NextResponse.json({
      campeonato,
      categoriasCount: categoriasCount || 0,
      inscripcionesCount: inscripcionesCount || 0,
      academiasCamp: (academiasCamp || []).map((ac) => ({ ...ac, lineas_count: conteoLineas[ac.id] || 0 })),
      lineasCount: (lineasLight || []).length,
      recaudacion,
      catalogoViejo,
      necesitaActivacion,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al cargar campeonato' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { estado } = body
    if (!estado) return NextResponse.json({ error: 'Estado requerido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato')
      .update({ estado })
      .eq('id_campeonato', idCampeonato)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ campeonato: data })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al actualizar' }, { status: 500 })
  }
}
