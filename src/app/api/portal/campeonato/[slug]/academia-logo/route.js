import { NextResponse } from 'next/server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { BUCKET } from '@/lib/campeonato/foto-competidor'

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx

    const probe = await sb.from('academia').select('logo_url').eq('id_academia', ac.id_academia).limit(1)
    if (probe.error && /logo_url/.test(probe.error.message || '')) {
      return NextResponse.json({
        error: 'Falta aplicar la migración de logos (columna logo_url). Ejecuta 20260701120000_arbitraje_y_logos.sql en Supabase.',
        needsMigration: true,
      }, { status: 409 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const { buffer, contentType, filename } = await readUploadFile(file)
    const ext = filename.split('.').pop()?.toLowerCase() || 'png'
    const path = `academia-logos/${ac.id_academia}/logo_${Date.now()}.${ext}`

    const { error: errUp } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: contentType || 'image/png', upsert: true })
    if (errUp) throw errUp

    const { error: errDb } = await sb.from('academia').update({ logo_url: path }).eq('id_academia', ac.id_academia)
    if (errDb) throw errDb

    return NextResponse.json({ ok: true, logo_url: path })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
