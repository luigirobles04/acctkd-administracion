import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = getSupabaseAdmin()
    const [{ data: usuarios, error }, { data: roles }] = await Promise.all([
      sb
        .from('usuario')
        .select('id_usuario, username, id_rol, activo, email, nombre_completo, dni, ultimo_acceso, created_at, rol(nombre)')
        .order('created_at', { ascending: false }),
      sb.from('rol').select('id_rol, nombre, descripcion').order('id_rol'),
    ])
    if (error) throw error
    return NextResponse.json({ usuarios: usuarios || [], roles: roles || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { username, password, id_rol, nombre_completo, email } = body
    if (!username?.trim() || !password || !id_rol) {
      return NextResponse.json({ error: 'Usuario, contraseña y rol son obligatorios' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await sb
      .from('usuario')
      .insert({
        username: username.trim(),
        password_hash,
        id_rol: Number(id_rol),
        nombre_completo: nombre_completo?.trim() || null,
        email: email?.trim() || null,
        activo: true,
      })
      .select('id_usuario, username, id_rol, activo, email, nombre_completo')
      .single()

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ error: 'Ese nombre de usuario ya existe' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ ok: true, usuario: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
