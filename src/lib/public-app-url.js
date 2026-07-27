import { PRODUCTION_SITE_URL, getSiteUrl, getSiteHostname } from '@/lib/site-config'

const PRODUCTION_FALLBACK = PRODUCTION_SITE_URL

export function getProductionAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv && fromEnv.startsWith('http')) return fromEnv.replace(/\/$/, '')
  return PRODUCTION_FALLBACK
}

export function getProductionHostname() {
  try {
    return new URL(getProductionAppUrl()).hostname
  } catch {
    return 'festcup2026.com'
  }
}

/** URLs *.vercel.app con hash de preview (Deployment Protection → APIs fallan con 401) */
export function isProtectedPreviewHost(hostname) {
  if (!hostname) return false
  const canonical = getSiteHostname()
  if (hostname === getProductionHostname() || hostname === canonical) return false
  if (hostname.endsWith('-projects.vercel.app')) return true
  if (hostname.startsWith('acctkd-administracion-an52-') && hostname.endsWith('.vercel.app')) return true
  return false
}

/**
 * fetch con timeout (pantallas TV / polling): aborta si el servidor no responde,
 * evitando requests colgados que se acumulan en redes lentas de coliseo.
 */
export async function fetchConTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function readJsonResponse(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    if (res.status === 401) {
      throw new Error(
        'Este enlace es un preview de Vercel con protección. Abre la app en producción: ' + getProductionAppUrl()
      )
    }
    throw new Error(`Respuesta inválida del servidor (${res.status}). Recarga o usa ${getProductionAppUrl()}`)
  }
}
