/** Reintentos ante caídas del API Gateway / PostgREST (incidencias Supabase, 502–504). */

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522])

export function isRetryableHttpStatus(status) {
  return RETRY_STATUS.has(status)
}

export function isRetryableSupabaseMessage(message) {
  const m = String(message || '').toLowerCase()
  return (
    m.includes('fetch failed')
    || m.includes('network')
    || m.includes('timeout')
    || m.includes('econnreset')
    || m.includes('socket')
    || m.includes('gateway')
    || m.includes('temporarily unavailable')
    || m.includes('service unavailable')
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * fetch con reintentos (GET/HEAD siempre; mutaciones solo en errores de red o 5xx).
 */
export async function fetchWithRetry(input, init = {}, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 350
  const method = (init.method || 'GET').toUpperCase()
  const safeRetryBody = method === 'GET' || method === 'HEAD'

  let lastError
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init)
      const retryable = isRetryableHttpStatus(res.status)
      if (!retryable || attempt === maxAttempts - 1) return res
      if (!safeRetryBody && res.status !== 502 && res.status !== 503 && res.status !== 504) {
        return res
      }
      await sleep(baseDelayMs * (attempt + 1))
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts - 1) throw err
      await sleep(baseDelayMs * (attempt + 1))
    }
  }
  if (lastError) throw lastError
  return fetch(input, init)
}

export async function withSupabaseRetry(run, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 350
  let lastResult
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await run()
    const err = lastResult?.error
    if (!err) return lastResult
    const retryable =
      isRetryableSupabaseMessage(err.message)
      || isRetryableSupabaseMessage(err.details)
      || String(err.code || '') === 'PGRST003'
    if (!retryable || attempt === maxAttempts - 1) return lastResult
    await sleep(baseDelayMs * (attempt + 1))
  }
  return lastResult
}

export const MENSAJE_INCIDENTE_SUPABASE =
  'El servicio de base de datos está con intermitencias (incidencia Supabase). Espera unos segundos y vuelve a intentar; tus datos no se han borrado.'

export function mensajeErrorApi(e, fallback = 'Error del servidor') {
  const msg = e?.message || String(e || '')
  if (isRetryableSupabaseMessage(msg)) return MENSAJE_INCIDENTE_SUPABASE
  return msg || fallback
}
