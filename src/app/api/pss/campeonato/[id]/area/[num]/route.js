import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { buildPssAreaSnapshot } from '@/lib/campeonato/pss-kyorugi'

export async function GET(request, { params }) {
  try {
    const { id, num } = await params
    const idCampeonato = Number(id)
    const cancha = Number(num)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    if (!cancha || cancha < 1 || cancha > 3) {
      return NextResponse.json({ error: 'Área inválida (1-3)' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const snapshot = await buildPssAreaSnapshot(sb, idCampeonato, cancha)
    return NextResponse.json(snapshot)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
