import { describe, it, expect } from 'vitest'
import { portalPuedeGestionarInscripciones } from '@/lib/campeonato/portal-linea'

describe('portal-linea', () => {
  it('permite gestionar mientras inscripción abierta', () => {
    expect(portalPuedeGestionarInscripciones({ ok: true, soloPago: false }, { estado_aprobacion: 'aprobada' })).toBe(true)
  })

  it('bloquea academia rechazada', () => {
    expect(portalPuedeGestionarInscripciones({ ok: true }, { estado_aprobacion: 'rechazada' })).toBe(false)
  })
})
