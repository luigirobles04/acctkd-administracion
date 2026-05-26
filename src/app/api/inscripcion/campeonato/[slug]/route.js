import { NextResponse } from 'next/server'
import { getSupabaseAdmin, getClientIp } from '@/lib/supabase-server'
import {
  obtenerCampeonatoPorSlug,
  puedeInscribir,
  registrarAcademiaEnCampeonato,
  recuperarAcademiaPorTelefono,
} from '@/lib/campeonato/inscripcion-server'

export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { data: tarifas } = await sb
      .from('campeonato_tarifa')
      .select('*')
      .eq('id_campeonato', campeonato.id_campeonato)
      .eq('activo', true)

    const inscripcion = puedeInscribir(campeonato)

    return NextResponse.json({
      campeonato: {
        id: campeonato.id_campeonato,
        nombre: campeonato.nombre,
        slug: campeonato.slug,
        descripcion: campeonato.descripcion,
        fecha_inicio: campeonato.fecha_inicio,
        fecha_fin: campeonato.fecha_fin,
        lugar: campeonato.lugar,
        ciudad: campeonato.ciudad,
        estado: campeonato.estado,
        fecha_cierre_inscripcion: campeonato.fecha_cierre_inscripcion,
        fecha_gracia_pago: campeonato.fecha_gracia_pago,
        bases_pdf_url: campeonato.bases_pdf_url,
        cuenta_bancaria_info: campeonato.cuenta_bancaria_info,
      },
      tarifas: tarifas || [],
      inscripcion,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const sb = getSupabaseAdmin()
    const campeonato = await obtenerCampeonatoPorSlug(sb, slug)
    if (!campeonato) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const check = puedeInscribir(campeonato)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 })
    if (check.soloPago) {
      return NextResponse.json({ error: 'Solo se permiten pagos. No nuevas academias.' }, { status: 403 })
    }

    const body = await request.json()
    const { accion } = body

    if (accion === 'recuperar') {
      const ac = await recuperarAcademiaPorTelefono(sb, {
        idCampeonato: campeonato.id_campeonato,
        telefono: body.telefono,
      })
      if (!ac) return NextResponse.json({ error: 'No se encontró academia con ese teléfono' }, { status: 404 })
      return NextResponse.json({ token: ac.token, academia: ac.academia })
    }

    if (accion === 'registrar') {
      const { nombre, telefono, confirmarNombre } = body
      if (!nombre?.trim() || !telefono?.trim()) {
        return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 })
      }
      if (confirmarNombre !== true) {
        return NextResponse.json({ error: 'Confirma el nombre de la academia', code: 'CONFIRMAR' }, { status: 400 })
      }

      const result = await registrarAcademiaEnCampeonato(sb, {
        idCampeonato: campeonato.id_campeonato,
        nombre,
        telefono,
      })

      return NextResponse.json({
        token: result.token,
        academia: result.academia,
        linkPropio: `/inscripcion/a/${result.token}`,
      })
    }

    if (accion === 'aceptar_bases') {
      const { token } = body
      const ip = getClientIp(request)
      await sb
        .from('academia_campeonato')
        .update({
          aceptacion_bases_at: new Date().toISOString(),
          aceptacion_bases_ip: ip,
          aceptacion_bases_version: campeonato.bases_version || '1',
        })
        .eq('token', token)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
