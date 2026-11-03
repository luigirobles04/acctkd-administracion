import { getSessionToken } from '@/lib/services/auth.service'
import { fetchWithRetry } from '@/lib/supabase-fetch-retry'

/** fetch autenticado del portal; conserva el mensaje de error del servidor (no lo tapa con “intermitencias”). */
export async function portalFetch(url, options = {}) {
  const token = getSessionToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return fetchWithRetry(url, { ...options, headers })
}
