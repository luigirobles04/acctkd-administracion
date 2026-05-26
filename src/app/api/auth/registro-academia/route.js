import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createSessionToken } from '@/lib/auth-session'
import {
  registrarAcademiaRepresentante,
  obtenerCampeonatoPorSlug,
} from '@/lib/campeonato/inscripcion-server'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      slug,
      nombre_academia,
      telefono,
      ciudad,
      representante_nombre,
      representante_dni,
      password,
      password_confirm,
    } = body

    if (!slug || !nombre_academia?.trim() || !telefono?.trim() || !ciudad?.trim()) {
      return NextResponse.json({ error: 'Completa todos los campos de la academia' }, { status: 400 })
    }
    if (!representante_nombre?.trim() || !representante_dni?.trim()) {
      return NextResponse.json({ error: 'DNI y nombre del representante requeridos' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (password !== password_confirm) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const { data: rol } = await sb.from('rol').select('id_rol').eq('nombre', 'representante').single()
    if (!rol) return NextResponse.json({ error: 'Rol representante no configurado' }, { status: 500 })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await registrarAcademiaRepresentante(sb, {
      idCampeonato: campeonato.id_campeonato,
      nombreAcademia: nombre_academia,
      telefono,
      ciudad,
      representanteNombre: representante_nombre,
      representanteDni: representante_dni,
      passwordHash,
      idRolRepresentante: rol.id_rol,
    })

    const userData = {
      id_usuario: result.usuario.id_usuario,
      username: `rep_${String(representante_dni).replace(/\D/g, '')}`,
      dni: result.usuario.dni,
      nombre: result.usuario.nombre_completo,
      id_rol: result.usuario.id_rol,
      id_academia: result.usuario.id_academia,
      rol: 'representante',
    }

    const sessionToken = createSessionToken(userData)

    return NextResponse.json({
      ok: true,
      user: userData,
      sessionToken,
      academia: result.academia,
      campeonato: { slug: campeonato.slug, nombre: campeonato.nombre },
      mensaje: 'Registro exitoso. Puedes armar tu lista mientras ACCTKD aprueba tu academia.',
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin()
    const { data } = await sb
      .from('campeonato')
      .select('id_campeonato, nombre, slug, fecha_inicio, fecha_fin, ciudad, estado, fecha_cierre_inscripcion')
      .eq('publicado', true)
      .eq('estado', 'inscripciones')
      .order('fecha_inicio', { ascending: true })
    return NextResponse.json({ campeonatos: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
