import { getSupabaseAdmin } from '@/lib/supabase-server'
import { BUCKET, extractStoragePath } from '@/lib/campeonato/foto-competidor'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = extractStoragePath(searchParams.get('path') || '')
    if (!path) return new Response('Ruta inválida', { status: 400 })

    const sb = getSupabaseAdmin()
    const { data, error } = await sb.storage.from(BUCKET).download(path)
    if (error || !data) return new Response('No encontrada', { status: 404 })

    const ext = path.split('.').pop()?.toLowerCase()
    const type =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return new Response('Error', { status: 500 })
  }
}
