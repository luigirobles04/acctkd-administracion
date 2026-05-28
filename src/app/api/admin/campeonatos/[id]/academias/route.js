import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: academias, error: errAc } = await sb
      .from('academia_campeonato')
      .select('*, academia:id_academia(*)')
      .eq('id_campeonato', idCampeonato)
      .order('created_at', { ascending: false })
    if (errAc) throw errAc

    const { data: lineas, error: errLi } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(nombre),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
      `)
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')
    if (errLi) throw errLi

    const recaudacion = (academias || []).reduce(
      (acc, ac) => {
        acc.totalEsperado += Number(ac.monto_total || 0)
        acc.recaudado += Number(ac.monto_asignado || 0)
        return acc
      },
      { totalEsperado: 0, recaudado: 0 }
    )
    recaudacion.pendiente = Math.max(0, recaudacion.totalEsperado - recaudacion.recaudado)

    return NextResponse.json({
      academias: academias || [],
      lineas: lineas || [],
      recaudacion,
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
