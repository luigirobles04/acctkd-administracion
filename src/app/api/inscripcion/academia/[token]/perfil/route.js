import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolverTokenAcademia, puedeInscribir } from '@/lib/campeonato/inscripcion-server'

export async function GET(request, { params }) {
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

    return NextResponse.json({ perfil })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)
    if (!check.ok || check.soloPago) {
      return NextResponse.json({ error: 'No se pueden editar perfiles' }, { status: 403 })
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
