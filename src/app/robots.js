import { getSiteUrl } from '@/lib/site-config'

export default function robots() {
  const base = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/campeonato/', '/registro-academia', '/inscripcion/'],
        disallow: [
          '/admin/',
          '/login',
          '/arbitro',
          '/portal/',
          '/api/',
          '/maestro/',
          '/alumno/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ''),
  }
}
