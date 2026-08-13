import { PRODUCTION_SITE_URL } from '@/lib/site-config'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const url = `${PRODUCTION_SITE_URL}/campeonato/${slug}/canchas`
  const title = 'Pantallas en vivo'
  const description = 'Llamados y combates en vivo por área · FestCup ACCTKD.'
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · FestCup`,
      description,
      url,
      images: ['/branding/festcup-2026-flyer.png'],
    },
  }
}

export default function CanchasLayout({ children }) {
  return children
}
