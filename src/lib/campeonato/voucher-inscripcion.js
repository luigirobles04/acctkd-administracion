const BUCKET = 'inscripcion-vouchers'

/** Extrae ruta interna del bucket desde path relativo o URL pública guardada en BD */
export function extractVoucherPath(archivoUrl) {
  if (!archivoUrl?.trim()) return null
  const v = archivoUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const m = v.match(/inscripcion-vouchers\/([^?]+)/)
    return m ? decodeURIComponent(m[1]) : null
  }
  if (v.includes('..')) return null
  return v.replace(/^\/+/, '')
}

export function voucherInscripcionProxyUrl(archivoUrl) {
  const path = extractVoucherPath(archivoUrl)
  if (!path) return null
  return `/api/vouchers/inscripcion?path=${encodeURIComponent(path)}`
}

export async function resolveVoucherInscripcionUrl(sb, archivoUrl, expiresIn = 3600) {
  const path = extractVoucherPath(archivoUrl)
  if (!path) return null
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export { BUCKET }
