import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { guardAdminSession, opsKeyValida } from '@/lib/admin-auth'
import { enriquecerCampeonatoIdeal } from '@/lib/campeonato/enriquecer-campeonato-ideal'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  const opsHeader = request.headers.get('x-acctkd-ops-key')?.trim()
  if (!opsKeyValida(opsHeader)) {
    const denied = guardAdminSession(request, 'full')
    if (denied) return denied
  }
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const fase = body.fase || new URL(request.url).searchParams.get('fase') || 'todo'
    const limiteCats = Number(body.limiteCats) || 12

    const sb = getSupabaseAdmin()
    const result = await enriquecerCampeonatoIdeal(sb, idCampeonato, { fase, limiteCats })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
