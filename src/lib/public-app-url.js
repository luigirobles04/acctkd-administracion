const PRODUCTION_FALLBACK = 'https://acctkd-administracion-an52.vercel.app'

export function getProductionAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv && fromEnv.startsWith('http')) return fromEnv.replace(/\/$/, '')
  return PRODUCTION_FALLBACK
}

export function getProductionHostname() {
  try {
    return new URL(getProductionAppUrl()).hostname
  } catch {
    return 'acctkd-administracion-an52.vercel.app'
  }
}

/** URLs *.vercel.app con hash de preview (Deployment Protection → APIs fallan con 401) */
export function isProtectedPreviewHost(hostname) {
  if (!hostname) return false
  if (hostname === getProductionHostname()) return false
  if (hostname.endsWith('-projects.vercel.app')) return true
  if (hostname.startsWith('acctkd-administracion-an52-') && hostname.endsWith('.vercel.app')) return true
  return false
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
