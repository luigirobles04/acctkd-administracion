import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolverTokenAcademia, puedeInscribir } from '@/lib/campeonato/inscripcion-server'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'
import { rejectIfLegacyInscripcionDisabled } from '@/lib/campeonato/legacy-inscripcion'

export async function GET(request, { params }) {
  const disabled = rejectIfLegacyInscripcionDisabled()
  if (disabled) return disabled
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

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

    return NextResponse.json({
      perfil: perfil
        ? { ...perfil, foto_url: fotoCompetidorProxyUrl(perfil.foto_url) || perfil.foto_url || null }
        : null,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  const disabled = rejectIfLegacyInscripcionDisabled()
  if (disabled) return disabled
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)
    if (!check.ok && !check.soloPago) {
      return NextResponse.json({ error: check.reason || 'No se pueden editar perfiles' }, { status: 403 })
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

    if (!documento_numero?.trim()) {
      return NextResponse.json({ error: 'Documento requerido' }, { status: 400 })
    }

    const docTipo = documento_tipo || 'DNI'
    const docNum = documento_numero.trim()

    const { data: existente } = await sb
      .from('competidor_perfil')
      .select('id_perfil')
      .eq('id_academia', ac.id_academia)
      .eq('documento_tipo', docTipo)
      .eq('documento_numero', docNum)
      .maybeSingle()

    if (check.soloPago && !existente) {
      return NextResponse.json({ error: 'Inscripción cerrada — no se pueden agregar participantes' }, { status: 403 })
    }

    if (check.soloPago) {
      if (foto_url == null || foto_url === '') {
        return NextResponse.json({ error: 'Inscripción cerrada — solo puedes actualizar la foto' }, { status: 403 })
      }
      const { data, error } = await sb
        .from('competidor_perfil')
        .update({ foto_url, updated_at: new Date().toISOString() })
        .eq('id_perfil', existente.id_perfil)
        .select()
        .single()
      if (error) throw error
      await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
      return NextResponse.json({ perfil: data })
    }

    if (!nombres?.trim() || !apellidos?.trim()) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const payload = {
      id_academia: ac.id_academia,
      documento_tipo: docTipo,
      documento_numero: docNum,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      sexo,
      fecha_nacimiento,
      grado,
      foto_url,
      updated_at: new Date().toISOString(),
    }

    let perfil
    if (existente) {
      const { data, error } = await sb
        .from('competidor_perfil')
        .update(payload)
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
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
