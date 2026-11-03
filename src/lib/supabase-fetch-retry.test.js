import { describe, it, expect } from 'vitest'
import {
  httpStatusParaErrorApi,
  isRetryableHttpStatus,
  isRetryableSupabaseMessage,
  mensajeErrorApi,
} from '@/lib/supabase-fetch-retry'

describe('supabase-fetch-retry', () => {
  it('marca 502–504 como reintentables', () => {
    expect(isRetryableHttpStatus(502)).toBe(true)
    expect(isRetryableHttpStatus(503)).toBe(true)
    expect(isRetryableHttpStatus(404)).toBe(false)
  })

  it('detecta mensajes de red', () => {
    expect(isRetryableSupabaseMessage('fetch failed')).toBe(true)
    expect(isRetryableSupabaseMessage('duplicate key')).toBe(false)
  })

  it('mensaje amigable en fallos de gateway', () => {
    expect(mensajeErrorApi(new Error('Gateway Timeout'))).toMatch(/intermitencias/i)
  })

  it('httpStatusParaErrorApi: validación 400, red 503', () => {
    expect(httpStatusParaErrorApi(new Error('Máximo 3 oficiales'))).toBe(400)
    expect(httpStatusParaErrorApi(new Error('fetch failed'))).toBe(503)
  })
})
