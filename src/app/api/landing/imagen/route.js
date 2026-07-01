import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { BUCKET } from '@/lib/campeonato/foto-competidor'
import { saveLandingConfig } from '@/lib/campeonato/landing-config'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const slot = (formData.get('slot') || 'hero').toString()
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const { buffer, contentType, filename } = await readUploadFile(file)
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `site/landing-${slot}-${Date.now()}.${ext}`

    const sb = getSupabaseAdmin()
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: true,
    })
    if (error) throw error

    const key = slot === 'hero' ? 'heroImagen' : `${slot}Imagen`
    const config = await saveLandingConfig(sb, { [key]: path })

    return NextResponse.json({ ok: true, path, config })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
