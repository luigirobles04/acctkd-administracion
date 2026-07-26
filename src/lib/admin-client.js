import { getSessionToken } from '@/lib/services/auth.service'

/** fetch autenticado para APIs admin (/api/admin/*, PATCH /api/landing). */
export async function adminFetch(url, options = {}) {
  const token = getSessionToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}
