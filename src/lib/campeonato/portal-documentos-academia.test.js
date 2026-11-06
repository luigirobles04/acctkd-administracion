import { describe, expect, it } from 'vitest'
import { portalPuedeVerFichaYCredenciales } from '@/lib/campeonato/portal-documentos-academia'

describe('portalPuedeVerFichaYCredenciales', () => {
  it('habilita academias aprobadas en festcup-2026', () => {
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 268,
        estado_aprobacion: 'aprobada',
        academia: { codigo_prefijo: 'P-P' },
      }),
    ).toBe(true)
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 243,
        estado_aprobacion: 'aprobada',
        academia: { codigo_prefijo: 'UT' },
      }),
    ).toBe(true)
  })

  it('niega rechazadas y otros slugs', () => {
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 999,
        estado_aprobacion: 'rechazada',
      }),
    ).toBe(false)
    expect(
      portalPuedeVerFichaYCredenciales('otro-evento', {
        id: 1,
        estado_aprobacion: 'aprobada',
      }),
    ).toBe(false)
  })
})
