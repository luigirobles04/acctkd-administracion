import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { crearCampeonatoCompleto } from '@/lib/campeonato/crear-campeonato-server'

export async function POST(request) {
  try {
    const body = await request.json()
    const sb = getSupabaseAdmin()
    const result = await crearCampeonatoCompleto(sb, body)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error al crear campeonato' }, { status: 400 })
  }
}
