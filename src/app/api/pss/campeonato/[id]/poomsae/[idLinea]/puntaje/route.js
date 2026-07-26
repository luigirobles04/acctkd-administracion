import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { guardarPuntajePoomsaePss } from '@/lib/campeonato/poomsae-pss'

export async function PATCH(request, { params }) {
  try {
    const { id, idLinea } = await params
    const idCampeonato = Number(id)
    const idCompetidor = Number(idLinea)
    if (!idCampeonato || !idCompetidor) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    const body = await request.json()
    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await guardarPuntajePoomsaePss(sb, idCampeonato, idCompetidor, body.puntaje, {
      ausente: Boolean(body.ausente),
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
