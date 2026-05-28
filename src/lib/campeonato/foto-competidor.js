const BUCKET = 'competidores-fotos'

/** Extrae ruta interna del bucket desde path relativo o URL completa guardada en BD */
export function extractStoragePath(fotoUrl) {
  if (!fotoUrl?.trim()) return null
  const v = fotoUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const m = v.match(/competidores-fotos\/([^?]+)/)
    return m ? decodeURIComponent(m[1]) : null
  }
  if (v.includes('..')) return null
  return v.replace(/^\/+/, '')
}

export function fotoCompetidorProxyUrl(fotoUrl) {
  const path = extractStoragePath(fotoUrl)
  if (!path) return null
  return `/api/fotos/competidor?path=${encodeURIComponent(path)}`
}

export async function resolveFotoCompetidorUrl(sb, fotoUrl, expiresIn = 86400) {
  const path = extractStoragePath(fotoUrl)
  if (!path) return null
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export { BUCKET }
