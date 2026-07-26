import { getSiteUrl } from '@/lib/site-config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const revalidate = 3600

export default async function sitemap() {
  const base = getSiteUrl()
  const now = new Date()

  const staticPages = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/registro-academia`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ]

  let dynamic = []
  try {
    const sb = getSupabaseAdmin()
    const { data } = await sb
      .from('campeonato')
      .select('slug, fecha_inicio')
      .not('slug', 'is', null)
      .order('fecha_inicio', { ascending: false })
      .limit(40)

    dynamic = (data || []).flatMap((c) => {
      const last = c.fecha_inicio ? new Date(c.fecha_inicio) : now
      const slug = c.slug
      return [
        { url: `${base}/campeonato/${slug}`, lastModified: last, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${base}/campeonato/${slug}/canchas`, lastModified: last, changeFrequency: 'daily', priority: 0.85 },
        { url: `${base}/campeonato/${slug}/resultados`, lastModified: last, changeFrequency: 'daily', priority: 0.88 },
        { url: `${base}/campeonato/${slug}/resultados`, lastModified: last, changeFrequency: 'daily', priority: 0.8 },
        { url: `${base}/inscripcion/${slug}`, lastModified: last, changeFrequency: 'weekly', priority: 0.75 },
      ]
    })
  } catch {
    /* sitemap estático si Supabase no disponible en build */
  }

  return [...staticPages, ...dynamic]
}
