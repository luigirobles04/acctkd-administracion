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
