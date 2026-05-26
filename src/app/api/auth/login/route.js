import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createSessionToken } from '@/lib/auth-session'

export async function POST(request) {
  try {
    const { identificador, password } = await request.json()
    if (!identificador?.trim() || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const id = identificador.trim()
    const sb = getSupabaseAdmin()

    let query = sb
      .from('usuario')
      .select('id_usuario, username, password_hash, id_rol, activo, email, nombre_completo, dni, id_academia, rol(nombre)')
      .eq('activo', true)

    const dniClean = id.replace(/\D/g, '')
    if (/^\d{8,12}$/.test(dniClean)) {
      query = query.eq('dni', dniClean)
    } else {
      query = query.eq('username', id)
    }

    const { data: usuario, error } = await query.single()
    if (error || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 })
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    await sb
      .from('usuario')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id_usuario', usuario.id_usuario)

    const rolNombre = usuario.rol?.nombre || null
    const userData = {
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      dni: usuario.dni || null,
      email: usuario.email || null,
      nombre: usuario.nombre_completo || usuario.username,
      id_rol: usuario.id_rol,
      id_academia: usuario.id_academia || null,
      rol: rolNombre,
    }

    const sessionToken = createSessionToken(userData)

    return NextResponse.json({ user: userData, sessionToken })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
