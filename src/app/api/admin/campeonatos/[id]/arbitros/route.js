import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'

export const dynamic = 'force-dynamic'

function mapRow(r) {
  const nombre = `${r.nombres || ''} ${r.apellidos || ''}`.trim()
  return {
    id_arbitro: r.id_arbitro,
    nombres: r.nombres,
    apellidos: r.apellidos,
    nombre_completo: nombre,
    documento: r.documento,
    telefono: r.telefono,
    email: r.email,
    funcion: r.funcion,
    pais: r.pais,
    codigo: r.codigo,
    foto_url: fotoCompetidorProxyUrl(r.foto_path) || null,
    activo: r.activo,
    orden: r.orden,
  }
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const [{ data: camp }, { data: rows, error }] = await Promise.all([
      sb.from('campeonato').select('id_campeonato, nombre, template_coach_url, credencial_layout').eq('id_campeonato', idCampeonato).maybeSingle(),
      sb
        .from('campeonato_arbitro')
        .select('*')
        .eq('id_campeonato', idCampeonato)
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('apellidos', { ascending: true }),
    ])
    if (error) throw error

    return NextResponse.json({
      campeonato: camp,
      arbitros: (rows || []).map(mapRow),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al listar árbitros' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const nombres = `${body.nombres || ''}`.trim()
    if (!nombres) return NextResponse.json({ error: 'Nombres requeridos' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const payload = {
      id_campeonato: idCampeonato,
      nombres,
      apellidos: `${body.apellidos || ''}`.trim(),
      documento: body.documento?.trim() || null,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      funcion: `${body.funcion || 'Árbitro'}`.trim() || 'Árbitro',
      pais: body.pais?.trim() || 'Perú',
      codigo: body.codigo?.trim() || null,
      foto_path: body.foto_path?.trim() || null,
      orden: Number(body.orden) || 0,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await sb.from('campeonato_arbitro').insert(payload).select('*').single()
    if (error) throw error

    return NextResponse.json({ arbitro: mapRow(data) })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al registrar árbitro' }, { status: 500 })
  }
}
