import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolverTokenAcademia, puedeInscribir } from '@/lib/campeonato/inscripcion-server'

export async function POST(request, { params }) {
  try {
    const { token } = await params
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)
    if (!check.ok || check.soloPago) {
      return NextResponse.json({ error: 'No se puede subir foto ahora' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

    const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${ac.id_academia}/${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error } = await sb.storage
      .from('competidores-fotos')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (error) throw error

    const { data: { publicUrl } } = sb.storage
      .from('competidores-fotos')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
