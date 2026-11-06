import { NextResponse } from 'next/server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { puedeInscribir } from '@/lib/campeonato/inscripcion-server'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'
import { httpStatusParaErrorApi, mensajeErrorApi } from '@/lib/supabase-fetch-retry'
import { supabaseErrorMessage } from '@/lib/supabase-errors'

export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const { searchParams } = new URL(request.url)
    const doc = searchParams.get('documento')
    const tipo = searchParams.get('tipo') || 'DNI'
    if (!doc) return NextResponse.json({ error: 'documento requerido' }, { status: 400 })

    const { data: perfil } = await sb
      .from('competidor_perfil')
      .select('*')
      .eq('id_academia', ac.id_academia)
      .eq('documento_tipo', tipo)
      .eq('documento_numero', doc.trim())
      .maybeSingle()

    // foto_url = ruta en storage (para guardar). La UI usa fotoCompetidorProxyUrl al mostrar.
    return NextResponse.json({
      perfil: perfil
        ? {
            ...perfil,
            foto_url: perfil.foto_url || null,
            foto_preview: fotoCompetidorProxyUrl(perfil.foto_url) || null,
          }
        : null,
    })
  } catch (e) {
    const msg = supabaseErrorMessage(e, mensajeErrorApi(e))
    return NextResponse.json({ error: msg }, { status: httpStatusParaErrorApi(e, msg) })
  }
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const check = puedeInscribir(ac.campeonato)
    // Permitir actualizar foto/datos también en fase solo-pago (credenciales).
    if (!check.ok && !check.soloPago) {
      return NextResponse.json({ error: check.reason || 'No se pueden editar perfiles' }, { status: 403 })
    }
    if (ac.estado_aprobacion === 'rechazada') {
      return NextResponse.json({ error: 'Academia rechazada' }, { status: 403 })
    }

    const body = await request.json()
    const {
      documento_tipo,
      documento_numero,
      nombres,
      apellidos,
      sexo,
      fecha_nacimiento,
      grado,
      foto_url,
    } = body

    if (!documento_numero?.trim() || !nombres?.trim() || !apellidos?.trim()) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const payload = {
      id_academia: ac.id_academia,
      documento_tipo: documento_tipo || 'DNI',
      documento_numero: documento_numero.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      sexo,
      fecha_nacimiento,
      grado,
      foto_url,
      updated_at: new Date().toISOString(),
    }

    const { data: existente } = await sb
      .from('competidor_perfil')
      .select('id_perfil')
      .eq('id_academia', ac.id_academia)
      .eq('documento_tipo', payload.documento_tipo)
      .eq('documento_numero', payload.documento_numero)
      .maybeSingle()

    if (check.soloPago && !existente) {
      return NextResponse.json({ error: 'Inscripción cerrada — no se pueden agregar participantes' }, { status: 403 })
    }

    let perfil
    if (existente) {
      let patch = payload
      if (check.soloPago) {
        if (foto_url == null || foto_url === '') {
          return NextResponse.json({ error: 'Inscripción cerrada — solo puedes actualizar la foto' }, { status: 403 })
        }
        patch = { foto_url, updated_at: payload.updated_at }
      }
      const { data, error } = await sb
        .from('competidor_perfil')
        .update(patch)
        .eq('id_perfil', existente.id_perfil)
        .select()
        .single()
      if (error) throw error
      perfil = data
    } else {
      const { data, error } = await sb.from('competidor_perfil').insert(payload).select().single()
      if (error) throw error
      perfil = data
    }

    await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
    return NextResponse.json({ perfil })
  } catch (e) {
    const msg = supabaseErrorMessage(e, mensajeErrorApi(e))
    return NextResponse.json({ error: msg }, { status: httpStatusParaErrorApi(e, msg) })
  }
}
