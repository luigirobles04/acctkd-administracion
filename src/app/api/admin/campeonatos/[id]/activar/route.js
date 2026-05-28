import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { activarCampeonatoCompleto } from '@/lib/campeonato/crear-campeonato-server'

export async function POST(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const result = await activarCampeonatoCompleto(sb, idCampeonato)

    return NextResponse.json({
      ok: true,
      ...result,
      mensaje: 'Campeonato listo para inscripciones en el portal',
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al activar campeonato' }, { status: 400 })
  }
}
