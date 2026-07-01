import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idUsuario = Number(id)
    if (!idUsuario) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const sb = getSupabaseAdmin()
    const patch = {}

    if (typeof body.activo === 'boolean') patch.activo = body.activo
    if (body.nombre_completo !== undefined) patch.nombre_completo = body.nombre_completo?.trim() || null
    if (body.email !== undefined) patch.email = body.email?.trim() || null
    if (body.id_rol) patch.id_rol = Number(body.id_rol)
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      }
      patch.password_hash = await bcrypt.hash(body.password, 10)
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('usuario')
      .update(patch)
      .eq('id_usuario', idUsuario)
      .select('id_usuario, username, id_rol, activo, email, nombre_completo')
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, usuario: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params
    const idUsuario = Number(id)
    if (!idUsuario) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { error } = await sb.from('usuario').delete().eq('id_usuario', idUsuario)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
