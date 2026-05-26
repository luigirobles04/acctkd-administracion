import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  aplicarFifoPagos,
  aprobarLinea,
  recalcularMontosAcademia,
} from '@/lib/campeonato/inscripcion-server'

export async function POST(request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = getSupabaseAdmin()
    const { data: campeonatos } = await sb.from('campeonato').select('id_campeonato, nombre, slug')

    const backup = {
      exported_at: new Date().toISOString(),
      campeonatos: campeonatos || [],
    }

    for (const c of campeonatos || []) {
      const { data: academias } = await sb
        .from('academia_campeonato')
        .select('*, academia(*), lineas:linea_inscripcion(*, miembros:linea_inscripcion_miembro(*))')
        .eq('id_campeonato', c.id_campeonato)
      backup[`campeonato_${c.id_campeonato}`] = academias
    }

    return NextResponse.json({ ok: true, backup, count: campeonatos?.length || 0 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** Admin: validar comprobante + FIFO */
export async function PATCH(request) {
  try {
    const sb = getSupabaseAdmin()
    const body = await request.json()
    const { idComprobante, montoValidado, estado, idAcademiaCampeonato } = body

    await sb
      .from('comprobante_pago')
      .update({
        monto_validado: montoValidado,
        estado: estado || 'validado',
      })
      .eq('id_comprobante', idComprobante)

    if (estado === 'validado' || !estado) {
      await aplicarFifoPagos(sb, idComprobante, idAcademiaCampeonato)
    }

    const montos = await recalcularMontosAcademia(sb, idAcademiaCampeonato)
    return NextResponse.json({ ok: true, montos })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const sb = getSupabaseAdmin()
    const { idLinea } = await request.json()
    const linea = await aprobarLinea(sb, idLinea)
    return NextResponse.json({ linea })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
