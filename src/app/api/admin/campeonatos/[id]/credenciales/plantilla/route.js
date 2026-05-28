import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { normalizeCredencialLayout } from '@/lib/campeonato/credencial-layout'
import { BUCKET } from '@/lib/campeonato/foto-competidor'

const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const layout = normalizeCredencialLayout(body.credencial_layout)

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato')
      .update({ credencial_layout: layout })
      .eq('id_campeonato', idCampeonato)
      .select('id_campeonato, template_competidor_url, credencial_layout')
      .single()

    if (error) throw error
    return NextResponse.json({ campeonato: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const { buffer, contentType, filename } = await readUploadFile(file)
    if (!ALLOWED.includes(contentType)) {
      return NextResponse.json({ error: 'Formato no válido (PNG, JPG o WebP)' }, { status: 400 })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'png'
    const storagePath = `credencial-templates/${idCampeonato}/frente.${ext}`

    const sb = getSupabaseAdmin()
    const { error: errUp } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: contentType || 'image/png',
      upsert: true,
    })
    if (errUp) throw errUp

    let layout = null
    const layoutRaw = formData.get('credencial_layout')
    if (layoutRaw && typeof layoutRaw === 'string') {
      try {
        layout = normalizeCredencialLayout(JSON.parse(layoutRaw))
      } catch {
        layout = normalizeCredencialLayout(null)
      }
    }

    const patch = { template_competidor_url: storagePath }
    if (layout) patch.credencial_layout = layout

    const { data, error } = await sb
      .from('campeonato')
      .update(patch)
      .eq('id_campeonato', idCampeonato)
      .select('id_campeonato, template_competidor_url, credencial_layout')
      .single()

    if (error) throw error

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath)
    return NextResponse.json({
      campeonato: data,
      publicUrl: pub?.publicUrl || null,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
