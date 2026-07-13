import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createSessionToken } from '@/lib/auth-session'
import {
  registrarAcademiaRepresentante,
  obtenerCampeonatoPorSlug,
} from '@/lib/campeonato/inscripcion-server'
import { readAndValidateLogoFile, uploadAcademiaLogo } from '@/lib/campeonato/academia-logo'

function formatError(e) {
  if (!e) return 'Error desconocido'
  if (typeof e === 'string') return e
  return (
    e.message ||
    e.details ||
    e.hint ||
    e.error_description ||
    (e.code ? `Error ${e.code}` : null) ||
    'No se pudo completar el registro. Intenta de nuevo.'
  )
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const slug = formData.get('slug')
    const nombre_academia = formData.get('nombre_academia')
    const telefono = formData.get('telefono')
    const ciudad = formData.get('ciudad')
    const representante_nombre = formData.get('representante_nombre')
    const representante_dni = formData.get('representante_dni')
    const password = formData.get('password')
    const password_confirm = formData.get('password_confirm')
    const logoFile = formData.get('logo')

    if (!slug || !String(nombre_academia || '').trim() || !String(telefono || '').trim() || !String(ciudad || '').trim()) {
      return NextResponse.json({ error: 'Completa todos los campos de la academia' }, { status: 400 })
    }
    if (!String(representante_nombre || '').trim() || !String(representante_dni || '').trim()) {
      return NextResponse.json({ error: 'DNI y nombre del representante requeridos' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (password !== password_confirm) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }
    if (!logoFile || typeof logoFile === 'string') {
      return NextResponse.json({ error: 'El logo de la academia es obligatorio (PNG o JPG)' }, { status: 400 })
    }

    const logo = await readAndValidateLogoFile(logoFile)

    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const { data: rol } = await sb.from('rol').select('id_rol').eq('nombre', 'representante').single()
    if (!rol) return NextResponse.json({ error: 'Rol representante no configurado' }, { status: 500 })

    const passwordHash = await bcrypt.hash(String(password), 10)
    const result = await registrarAcademiaRepresentante(sb, {
      idCampeonato: campeonato.id_campeonato,
      nombreAcademia: String(nombre_academia),
      telefono: String(telefono),
      ciudad: String(ciudad),
      representanteNombre: String(representante_nombre),
      representanteDni: String(representante_dni),
      passwordHash,
      idRolRepresentante: rol.id_rol,
    })

    try {
      await uploadAcademiaLogo(sb, result.academia.id_academia, logo)
    } catch (logoErr) {
      await sb.from('academia_campeonato').delete().eq('id', result.academiaCampeonato.id)
      await sb.from('usuario').delete().eq('id_usuario', result.usuario.id_usuario)
      await sb.from('academia').delete().eq('id_academia', result.academia.id_academia)
      throw logoErr
    }

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
      academia: { ...result.academia, logo_url: true },
      campeonato: { slug: campeonato.slug, nombre: campeonato.nombre },
      mensaje: 'Registro exitoso. Puedes armar tu lista mientras ACCTKD aprueba tu academia.',
    })
  } catch (e) {
    console.error('[registro-academia]', e)
    return NextResponse.json({ error: formatError(e) }, { status: 400 })
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
