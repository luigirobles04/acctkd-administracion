import crypto from 'crypto'

function secret() {
  return process.env.SESSION_SECRET || process.env.CRON_SECRET || 'acctkd-dev-session'
}

export function createSessionToken(user) {
  const exp = Date.now() + 7 * 24 * 3600 * 1000
  const payload = {
    id_usuario: user.id_usuario,
    rol: user.rol,
    id_academia: user.id_academia || null,
    exp,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(request) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return verifySessionToken(auth.slice(7))
  return null
}
