import { PRODUCTION_SITE_URL, SITE_DESCRIPTION } from '@/lib/site-config'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const url = `${PRODUCTION_SITE_URL}/campeonato/${slug}`
  const title = 'Campeonato FestCup'
  const description = SITE_DESCRIPTION
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: ['/branding/festcup-2026-flyer.png'],
    },
  }
}

export default function CampeonatoSlugLayout({ children }) {
  return children
}
