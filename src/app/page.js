import LandingPage from '@/components/landing/LandingPage'
import {
  PRODUCTION_SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  FESTCUP_VENUE,
} from '@/lib/site-config'

export const metadata = {
  title: 'Taekwondo FestCup 2026 · Inscripción de academias',
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: PRODUCTION_SITE_URL,
  },
  openGraph: {
    title: `${SITE_NAME} 2026`,
    description: 'Inscríbete, consulta resultados, descarga llaves y sigue las peleas en vivo.',
    url: PRODUCTION_SITE_URL,
    images: ['/branding/festcup-2026-flyer.png'],
  },
}

const EVENT_IMAGE = `${PRODUCTION_SITE_URL}/branding/festcup-2026-flyer.png`

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'Taekwondo FestCup 2026',
  description: SITE_DESCRIPTION,
  url: PRODUCTION_SITE_URL,
  startDate: '2026-11-07',
  endDate: '2026-11-07',
  image: [EVENT_IMAGE],
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: FESTCUP_VENUE.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: FESTCUP_VENUE.address,
      addressLocality: 'Trujillo',
      addressRegion: 'La Libertad',
      addressCountry: 'PE',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: 'ACCTKD · Academia Christopher Cabrera Taekwondo',
    url: PRODUCTION_SITE_URL,
  },
  performer: {
    '@type': 'SportsOrganization',
    name: 'ACCTKD · Academia Christopher Cabrera Taekwondo',
    url: PRODUCTION_SITE_URL,
  },
  offers: {
    '@type': 'Offer',
    url: `${PRODUCTION_SITE_URL}/registro-academia`,
    availability: 'https://schema.org/InStock',
    price: '0',
    priceCurrency: 'PEN',
    validFrom: '2026-01-01',
  },
  sport: 'Taekwondo',
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
