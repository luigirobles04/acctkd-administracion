import { getSessionToken } from '@/lib/services/auth.service'
import { fetchWithRetry, isRetryableHttpStatus, MENSAJE_INCIDENTE_SUPABASE } from '@/lib/supabase-fetch-retry'

export async function portalFetch(url, options = {}) {
  const token = getSessionToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetchWithRetry(url, { ...options, headers })
  if (!res.ok && isRetryableHttpStatus(res.status)) {
    return new Response(JSON.stringify({ error: MENSAJE_INCIDENTE_SUPABASE }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return res
}
