import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { enriquecerCampeonatoIdeal } from '@/lib/campeonato/enriquecer-campeonato-ideal'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const result = await enriquecerCampeonatoIdeal(sb, idCampeonato)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
