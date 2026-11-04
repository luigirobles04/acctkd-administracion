import { describe, expect, it } from 'vitest'
import { portalPuedeVerFichaYCredenciales } from '@/lib/campeonato/portal-documentos-academia'

describe('portalPuedeVerFichaYCredenciales', () => {
  it('habilita FY, ACC y UCV Trujillo en festcup-2026', () => {
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 249,
        academia: { codigo_prefijo: 'FY' },
      }),
    ).toBe(true)
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 246,
        academia: { codigo_prefijo: 'ACC' },
      }),
    ).toBe(true)
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 243,
        academia: { codigo_prefijo: 'UT' },
      }),
    ).toBe(true)
  })

  it('niega otras academias', () => {
    expect(
      portalPuedeVerFichaYCredenciales('festcup-2026', {
        id: 999,
        academia: { codigo_prefijo: 'XX' },
      }),
    ).toBe(false)
  })
})
