import { describe, expect, it } from 'vitest'
import { puedeEnviarLista } from '@/lib/campeonato/inscripcion-server'

describe('puedeEnviarLista', () => {
  it('permite enviar con bases aceptadas sin aprobación manual previa', () => {
    expect(
      puedeEnviarLista({
        estado_aprobacion: 'aprobada',
        aceptacion_bases_at: '2026-01-01T00:00:00Z',
      }).ok,
    ).toBe(true)
  })

  it('bloquea si la academia fue rechazada', () => {
    const r = puedeEnviarLista({
      estado_aprobacion: 'rechazada',
      motivo_rechazo: 'Datos inválidos',
      aceptacion_bases_at: '2026-01-01T00:00:00Z',
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('Datos inválidos')
  })

  it('bloquea si no aceptó las bases', () => {
    const r = puedeEnviarLista({
      estado_aprobacion: 'aprobada',
      aceptacion_bases_at: null,
    })
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('bases')
  })
})
