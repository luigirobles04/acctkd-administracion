import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const BACKUP_BUCKET = 'backups-campeonato'

/** Backup nocturno · 3:00 AM Lima ≈ 08:00 UTC (vercel cron) */
export async function GET(request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  // Fail-closed: sin CRON_SECRET configurado nadie puede exportar datos.
  if (!secret || auth !== `Bearer ${secret}`) {
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

    const day = exported_at.slice(0, 10)
    const path = `${day}/campeonatos-${exported_at.replace(/[:.]/g, '-')}.json`
    const body = JSON.stringify(backup)
    let stored = null
    let storeError = null

    const { error: upErr } = await sb.storage
      .from(BACKUP_BUCKET)
      .upload(path, body, { contentType: 'application/json', upsert: true })

    if (upErr) {
      storeError = upErr.message
      // Intento crear bucket público-privado y reintentar una vez
      await sb.storage.createBucket(BACKUP_BUCKET, { public: false }).catch(() => {})
      const { error: retryErr } = await sb.storage
        .from(BACKUP_BUCKET)
        .upload(path, body, { contentType: 'application/json', upsert: true })
      if (retryErr) storeError = retryErr.message
      else {
        stored = path
        storeError = null
      }
    } else {
      stored = path
    }

    return NextResponse.json({
      ok: true,
      exported_at,
      events: campeonatos?.length || 0,
      stored,
      storeError,
      // No devolver el backup completo en la respuesta (puede ser enorme); ya está en Storage.
      size_bytes: Buffer.byteLength(body, 'utf8'),
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
