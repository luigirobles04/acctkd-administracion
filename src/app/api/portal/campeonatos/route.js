import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getSessionFromRequest } from '@/lib/auth-session'
import {
  resolverRepresentante,
  unirAcademiaACampeonato,
} from '@/lib/campeonato/inscripcion-server'

export async function GET(request) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const sb = getSupabaseAdmin()
    const rep = await resolverRepresentante(sb, session.id_usuario)
    if (!rep) return NextResponse.json({ error: 'Acceso solo para representantes' }, { status: 403 })

    const { data: inscripciones } = await sb
      .from('academia_campeonato')
      .select(`
        id, estado_aprobacion, estado_lista, estado_pago, monto_total, monto_asignado,
        motivo_rechazo, created_at,
        campeonato:id_campeonato(id_campeonato, nombre, slug, fecha_inicio, fecha_fin, ciudad, estado, fecha_cierre_inscripcion)
      `)
      .eq('id_academia', rep.id_academia)
      .order('created_at', { ascending: false })

    const { data: publicados } = await sb
      .from('campeonato')
      .select('id_campeonato, nombre, slug, fecha_inicio, fecha_fin, ciudad, estado')
      .eq('publicado', true)
      .eq('estado', 'inscripciones')
      .order('fecha_inicio', { ascending: true })

    const slugsInscritos = new Set(
      (inscripciones || []).map((i) => i.campeonato?.slug).filter(Boolean)
    )
    const disponibles = (publicados || []).filter((c) => !slugsInscritos.has(c.slug))

    const { data: academia } = await sb
      .from('academia')
      .select('*')
      .eq('id_academia', rep.id_academia)
      .single()

    return NextResponse.json({
      academia,
      representante: { nombre: rep.nombre_completo, dni: rep.dni },
      misCampeonatos: inscripciones || [],
      disponibles,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const sb = getSupabaseAdmin()
    const rep = await resolverRepresentante(sb, session.id_usuario)
    if (!rep) return NextResponse.json({ error: 'Acceso solo para representantes' }, { status: 403 })

    const { slug } = await request.json()
    if (!slug) return NextResponse.json({ error: 'Campeonato requerido' }, { status: 400 })

    const { data: camp } = await sb.from('campeonato').select('id_campeonato').eq('slug', slug).single()
    if (!camp) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

    const ac = await unirAcademiaACampeonato(sb, rep.id_academia, camp.id_campeonato)
    return NextResponse.json({ ok: true, academiaCampeonato: ac })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
