/**
 * Verificación de sesión compatible con Edge (middleware).
 * Mismo formato de token que auth-session.js (HMAC-SHA256 + base64url).
 */

/**
 * Fail-closed: en producción SESSION_SECRET es obligatorio (sin fallback,
 * un secreto hardcodeado permitiría forjar tokens admin).
 */
function sessionSecret() {
  const s = process.env.SESSION_SECRET
  if (s) return s
  if (process.env.NODE_ENV === 'production') return null
  return 'acctkd-dev-session'
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacSha256Base64Url(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToBase64Url(new Uint8Array(sig))
}

function base64UrlToString(b64url) {
  const padded = b64url + '='.repeat((4 - (b64url.length % 4)) % 4)
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  return atob(b64)
}

export async function verifySessionTokenEdge(token) {
  const secret = sessionSecret()
  if (!secret) return null
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = await hmacSha256Base64Url(secret, body)
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(base64UrlToString(body))
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function getSessionFromRequestEdge(request) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return verifySessionTokenEdge(auth.slice(7).trim())
  return null
}
