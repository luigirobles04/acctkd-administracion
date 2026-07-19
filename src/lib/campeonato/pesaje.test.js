import { describe, expect, it } from 'vitest'
import { lineaAptaParaLlave, PESAJE_ESTADOS_APTOS_LLAVE } from '@/lib/campeonato/pesaje'

describe('lineaAptaParaLlave', () => {
  it('acepta ok y subido cuando se exige pesaje', () => {
    for (const e of PESAJE_ESTADOS_APTOS_LLAVE) {
      expect(lineaAptaParaLlave(e)).toBe(true)
    }
    expect(lineaAptaParaLlave('pendiente')).toBe(false)
    expect(lineaAptaParaLlave('descalificado')).toBe(false)
  })

  it('acepta cualquier estado si omitirPesaje', () => {
    expect(lineaAptaParaLlave('pendiente', { omitirPesaje: true })).toBe(true)
    expect(lineaAptaParaLlave('descalificado', { omitirPesaje: true })).toBe(true)
  })
})
