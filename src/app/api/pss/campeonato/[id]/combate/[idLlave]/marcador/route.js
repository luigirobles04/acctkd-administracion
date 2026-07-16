import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyPssAccess } from '@/lib/pss-auth'
import { actualizarMarcadorPss } from '@/lib/campeonato/pss-kyorugi'

export async function PATCH(request, { params }) {
  try {
    const { id, idLlave } = await params
    const idCampeonato = Number(id)
    const idCombate = Number(idLlave)
    if (!idCampeonato || !idCombate) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    const { puntaje1, puntaje2 } = await request.json()
    const sb = getSupabaseAdmin()
    const auth = await verifyPssAccess(sb, request, idCampeonato)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const result = await actualizarMarcadorPss(sb, idCampeonato, idCombate, { puntaje1, puntaje2 })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
