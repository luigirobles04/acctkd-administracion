import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { buildPssPoomsaeSnapshot } from '@/lib/campeonato/poomsae-pss'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const snap = await buildPssPoomsaeSnapshot(sb, idCampeonato)
    return NextResponse.json(snap)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
