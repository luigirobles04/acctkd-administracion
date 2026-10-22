import { describe, it, expect } from 'vitest'
import { isRetryableHttpStatus, isRetryableSupabaseMessage, mensajeErrorApi } from '@/lib/supabase-fetch-retry'

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
})
