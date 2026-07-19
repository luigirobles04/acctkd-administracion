/** Dominio de producción — toda la plataforma (landing, admin, portal, TV, APIs). */
export const PRODUCTION_SITE_URL = 'https://festcup2026.com'

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv && fromEnv.startsWith('http')) return fromEnv.replace(/\/$/, '')
  return PRODUCTION_SITE_URL
}

export function getSiteHostname() {
  try {
    return new URL(getSiteUrl()).hostname
  } catch {
    return 'festcup2026.com'
  }
}

export const SITE_NAME = 'Taekwondo FestCup · ACCTKD'
export const SITE_DESCRIPTION =
  'Campeonato oficial ACCTKD en Trujillo, Perú. Inscripción de academias, Kyorugi, Poomsae, llaves, resultados y transmisión en vivo.'

/** Redes oficiales ACCTKD / FestCup */
export const FESTCUP_SOCIAL = {
  facebook: 'https://www.facebook.com/share/19Ay1ePpbv/?mibextid=wwXIfr',
  instagram: 'https://www.instagram.com/christopher.cabrera.taekwondo?igsh=OGNndzkwbnN5eTh6',
}

/** Sede FestCup 2026 */
export const FESTCUP_VENUE = {
  name: 'Coliseo Gran Chimú',
  city: 'Trujillo',
  country: 'Perú',
  address: 'Coliseo Gran Chimú, Trujillo, La Libertad, Perú',
  eventDate: 'Sábado 7 de noviembre de 2026',
  mapsUrl:
    'https://www.google.com/maps/place/coliseo+gran+chimu/data=!4m2!3m1!1s0x91ad3d900f8bfbcd:0xbb76fd2b663d17d4?sa=X&ved=1t:242&ictx=111',
  image: '/landing/galeria/coliseo-gran-chimu.jpg',
}

/** Documentos públicos descargables */
export const FESTCUP_DOCS = {
  bases: '/docs/festcup-2026/bases-festcup-2026.pdf',
  programa: '/docs/festcup-2026/programa-festcup-2026.pdf',
  plantillaExcel: '/docs/festcup-2026/plantilla-inscripcion-festcup.xlsx',
}
