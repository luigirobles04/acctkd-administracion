import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Backup nocturno · 3:00 AM Lima ≈ 08:00 UTC (vercel cron) */
export async function GET(request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = getSupabaseAdmin()
    const exported_at = new Date().toISOString()
    const { data: campeonatos } = await sb.from('campeonato').select('*')

    const backup = { exported_at, campeonatos: campeonatos || [] }

    for (const c of campeonatos || []) {
      const { data: academias } = await sb
        .from('academia_campeonato')
        .select('*, academia(*), lineas:linea_inscripcion(*)')
        .eq('id_campeonato', c.id_campeonato)
      backup[`evento_${c.id_campeonato}`] = academias
    }

    return NextResponse.json({
      ok: true,
      exported_at,
      events: campeonatos?.length || 0,
      backup,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
