import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function PATCH(request, { params }) {
  try {
    const { id, aid } = await params
    const idCampeonato = Number(id)
    const idArbitro = Number(aid)
    if (!idCampeonato || !idArbitro) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const patch = { updated_at: new Date().toISOString() }
    const fields = ['nombres', 'apellidos', 'documento', 'telefono', 'email', 'funcion', 'pais', 'codigo', 'foto_path', 'orden', 'activo']
    for (const f of fields) {
      if (body[f] !== undefined) patch[f] = body[f]
    }

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato_arbitro')
      .update(patch)
      .eq('id_arbitro', idArbitro)
      .eq('id_campeonato', idCampeonato)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ arbitro: data })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id, aid } = await params
    const idCampeonato = Number(id)
    const idArbitro = Number(aid)
    if (!idCampeonato || !idArbitro) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { error } = await sb
      .from('campeonato_arbitro')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id_arbitro', idArbitro)
      .eq('id_campeonato', idCampeonato)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al eliminar' }, { status: 500 })
  }
}
