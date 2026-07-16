import { getSupabaseAdmin } from '@/lib/supabase-server'
import { BUCKET, extractVoucherPath } from '@/lib/campeonato/voucher-inscripcion'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = extractVoucherPath(searchParams.get('path') || '')
    if (!path) return new Response('Ruta inválida', { status: 400 })

    const sb = getSupabaseAdmin()
    const { data, error } = await sb.storage.from(BUCKET).download(path)
    if (error || !data) return new Response('No encontrado', { status: 404 })

    const ext = path.split('.').pop()?.toLowerCase()
    const type =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'pdf'
            ? 'application/pdf'
            : 'image/jpeg'

    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Error', { status: 500 })
  }
}
