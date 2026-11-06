import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fetchPlanillaKyorugiCampeonato } from '@/lib/campeonato/kyorugi-planilla'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const data = await fetchPlanillaKyorugiCampeonato(sb, idCampeonato)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
