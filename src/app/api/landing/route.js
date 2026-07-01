import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getLandingConfig, saveLandingConfig } from '@/lib/campeonato/landing-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = getSupabaseAdmin()
    const config = await getLandingConfig(sb)
    return NextResponse.json(
      { config },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
    )
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sb = getSupabaseAdmin()
    const config = await saveLandingConfig(sb, body)
    return NextResponse.json({ ok: true, config })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
