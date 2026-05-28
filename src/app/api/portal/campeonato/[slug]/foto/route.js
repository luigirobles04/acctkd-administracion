import { NextResponse } from 'next/server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { puedeInscribir } from '@/lib/campeonato/inscripcion-server'
import { readUploadFile } from '@/lib/campeonato/upload-file'

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const check = puedeInscribir(ac.campeonato)
    if (!check.ok || check.soloPago) {
      return NextResponse.json({ error: 'No se puede subir foto ahora' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const { buffer, contentType, filename } = await readUploadFile(file)
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${ac.id_academia}/${Date.now()}.${ext}`

    const { error } = await sb.storage
      .from('competidores-fotos')
      .upload(fileName, buffer, { contentType: contentType || 'image/jpeg', upsert: false })
    if (error) throw error

    const { data: { publicUrl } } = sb.storage.from('competidores-fotos').getPublicUrl(fileName)
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
