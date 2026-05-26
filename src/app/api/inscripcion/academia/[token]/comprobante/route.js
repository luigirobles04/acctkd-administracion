import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolverTokenAcademia, puedeInscribir, aplicarFifoPagos, recalcularMontosAcademia } from '@/lib/campeonato/inscripcion-server'

export async function POST(request, { params }) {
  try {
    const sb = getSupabaseAdmin()
    const ac = await resolverTokenAcademia(sb, params.token)
    if (!ac) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const check = puedeInscribir(ac.campeonato)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file')
    const monto_declarado = formData.get('monto_declarado')
    const numero_operacion = formData.get('numero_operacion') || null

    if (!file || !monto_declarado) {
      return NextResponse.json({ error: 'Archivo y monto requeridos' }, { status: 400 })
    }

    const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${ac.id}/${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: errStorage } = await sb.storage
      .from('inscripcion-vouchers')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
    if (errStorage) throw errStorage

    const { data: { publicUrl } } = sb.storage
      .from('inscripcion-vouchers')
      .getPublicUrl(fileName)

    const { data: comp, error } = await sb
      .from('comprobante_pago')
      .insert({
        id_academia_campeonato: ac.id,
        monto_declarado: Number(monto_declarado),
        numero_operacion,
        archivo_url: publicUrl,
        estado: 'pendiente',
      })
      .select()
      .single()
    if (error) throw error

    await sb.from('bitacora_inscripcion').insert({
      id_academia_campeonato: ac.id,
      accion: 'comprobante_subido',
      detalle: { monto: monto_declarado },
      actor: 'portal',
    })

    return NextResponse.json({ comprobante: comp })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
