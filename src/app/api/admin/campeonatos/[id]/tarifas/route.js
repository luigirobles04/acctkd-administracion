import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { actualizarTarifasCampeonato } from '@/lib/campeonato/categorias-wt'
import { MODALIDADES } from '@/lib/campeonato/constants'

export async function GET(_req, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato_tarifa')
      .select('id_tarifa, modalidad, precio_regular, precio_tardia, activo')
      .eq('id_campeonato', idCampeonato)
      .order('modalidad')
    if (error) throw error
    return NextResponse.json({
      tarifas: (data || []).map((t) => ({
        ...t,
        label: MODALIDADES[t.modalidad]?.label || t.modalidad,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 400 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await req.json()
    const sb = getSupabaseAdmin()
    const n = await actualizarTarifasCampeonato(sb, idCampeonato, body.tarifas || [])
    return NextResponse.json({ ok: true, actualizadas: n })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 400 })
  }
}
