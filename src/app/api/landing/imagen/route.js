import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { guardAdminSession } from '@/lib/admin-auth'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { BUCKET } from '@/lib/campeonato/foto-competidor'
import { getLandingConfig, saveLandingConfig } from '@/lib/campeonato/landing-config'

export async function POST(request) {
  const denied = guardAdminSession(request, 'full')
  if (denied) return denied
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

    let config
    if (slot === 'hero') {
      config = await saveLandingConfig(sb, { heroImagen: path })
    } else if (slot === 'galeria') {
      const caption = (formData.get('caption') || 'FestCup').toString().slice(0, 80)
      const current = await getLandingConfig(sb)
      const galeria = [...(current.galeria || []), { path, caption, alt: caption }]
      config = await saveLandingConfig(sb, { galeria })
    } else {
      config = await saveLandingConfig(sb, { [`${slot}Imagen`]: path })
    }

    return NextResponse.json({ ok: true, path, config })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
