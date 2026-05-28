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

    const [
      { data: categorias, error: errCats },
      { data: inscripciones, error: errIns },
      { data: academiasCamp, error: errAc },
      { data: lineasInscripcion, error: errLi },
    ] = await Promise.all([
      sb
        .from('categoria_campeonato')
        .select('id_categoria, nombre, modalidad, genero, edad_min, edad_max, peso_min, peso_max, orden')
        .eq('id_campeonato', idCampeonato)
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true }),
      sb
        .from('inscripcion_campeonato')
        .select('*')
        .eq('id_campeonato', idCampeonato)
        .order('created_at', { ascending: false }),
      sb
        .from('academia_campeonato')
        .select('*, academia:id_academia(nombre, codigo_prefijo)')
        .eq('id_campeonato', idCampeonato)
        .order('created_at', { ascending: true }),
      sb
        .from('linea_inscripcion')
        .select(`
          *,
          categoria:categoria_campeonato(nombre),
          academia_campeonato(academia:academia(nombre, codigo_prefijo)),
          miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(nombres, apellidos, documento_numero, sexo, grado, fecha_nacimiento, documento_tipo))
        `)
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado')
        .order('created_at', { ascending: true }),
    ])

    if (errCats) throw errCats
    if (errIns) throw errIns
    if (errAc) throw errAc
    if (errLi) throw errLi

    const recaudacion = (academiasCamp || []).reduce(
      (acc, ac) => {
        acc.totalEsperado += Number(ac.monto_total || 0)
        acc.recaudado += Number(ac.monto_asignado || 0)
        return acc
      },
      { totalEsperado: 0, recaudado: 0 }
    )
    recaudacion.pendiente = Math.max(0, recaudacion.totalEsperado - recaudacion.recaudado)

    return NextResponse.json({
      campeonato,
      categorias: categorias || [],
      inscripciones: inscripciones || [],
      academiasCamp: academiasCamp || [],
      lineasInscripcion: lineasInscripcion || [],
      recaudacion,
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
