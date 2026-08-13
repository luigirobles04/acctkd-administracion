import { PRODUCTION_SITE_URL } from '@/lib/site-config'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const url = `${PRODUCTION_SITE_URL}/campeonato/${slug}/resultados`
  const title = 'Resultados y medallero'
  const description = 'Medallero en vivo de Kyorugi y Poomsae · FestCup ACCTKD.'
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

export default function ResultadosLayout({ children }) {
  return children
}
