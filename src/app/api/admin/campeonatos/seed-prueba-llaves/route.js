import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sembrarCampeonatoPruebaLlaves } from '@/lib/campeonato/sembrar-campeonato-prueba-llaves'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const fase = body.fase || 'setup'
    const offset = Number(body.offset) || 0
    const limit = Number(body.limit) || 60
    const reset = Boolean(body.reset)

    const sb = getSupabaseAdmin()
    const result = await sembrarCampeonatoPruebaLlaves(sb, { fase, offset, limit, reset })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
