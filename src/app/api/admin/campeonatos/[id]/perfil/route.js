import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { idPerfil, nombres, apellidos, sexo, fecha_nacimiento, grado, documento_tipo, documento_numero } = body
    if (!idPerfil) return NextResponse.json({ error: 'idPerfil requerido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: perfil, error: errP } = await sb
      .from('competidor_perfil')
      .select('id_perfil, id_academia')
      .eq('id_perfil', idPerfil)
      .single()
    if (errP || !perfil) return NextResponse.json({ error: 'Competidor no encontrado' }, { status: 404 })

    const { data: ac } = await sb
      .from('academia_campeonato')
      .select('id')
      .eq('id_campeonato', idCampeonato)
      .eq('id_academia', perfil.id_academia)
      .maybeSingle()
    if (!ac) return NextResponse.json({ error: 'Competidor no pertenece a este campeonato' }, { status: 403 })

    const patch = { updated_at: new Date().toISOString() }
    if (nombres != null) patch.nombres = String(nombres).trim()
    if (apellidos != null) patch.apellidos = String(apellidos).trim()
    if (sexo != null) patch.sexo = sexo
    if (fecha_nacimiento != null) patch.fecha_nacimiento = fecha_nacimiento
    if (grado != null) patch.grado = grado
    if (documento_tipo != null) patch.documento_tipo = documento_tipo
    if (documento_numero != null) patch.documento_numero = String(documento_numero).trim()

    const { data, error } = await sb
      .from('competidor_perfil')
      .update(patch)
      .eq('id_perfil', idPerfil)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ perfil: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
