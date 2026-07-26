import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { iniciarParticipantePoomsaePss } from '@/lib/campeonato/poomsae-pss'

export async function PATCH(request, { params }) {
  try {
    const { id, idLinea } = await params
    const idCampeonato = Number(id)
    const idParticipante = Number(idLinea)
    if (!idCampeonato || !idParticipante) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await iniciarParticipantePoomsaePss(sb, idCampeonato, idParticipante)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
