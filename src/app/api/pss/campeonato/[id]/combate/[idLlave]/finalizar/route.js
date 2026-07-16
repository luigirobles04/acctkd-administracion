import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { finalizarCombatePss } from '@/lib/campeonato/pss-kyorugi'

export async function PATCH(request, { params }) {
  try {
    const { id, idLlave } = await params
    const idCampeonato = Number(id)
    const idCombate = Number(idLlave)
    if (!idCampeonato || !idCombate) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    const { ganadorIdLinea, puntaje1, puntaje2 } = await request.json()
    if (!ganadorIdLinea) {
      return NextResponse.json({ error: 'ganadorIdLinea requerido' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await finalizarCombatePss(sb, idCampeonato, idCombate, { ganadorIdLinea, puntaje1, puntaje2 })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
