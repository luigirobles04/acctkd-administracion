import { describe, it, expect } from 'vitest'
import { computeOrdenLlavePdf } from '@/lib/campeonato/orden-llave'

describe('computeOrdenLlavePdf', () => {
  it('numera pre-finales seguidos y final con hueco', () => {
    const combates = [
      { id_llave: 1, ronda: 3, match_numero: 1, estado: 'pendiente' },
      { id_llave: 2, ronda: 3, match_numero: 2, estado: 'pendiente' },
      { id_llave: 3, ronda: 2, match_numero: 1, estado: 'pendiente' },
      { id_llave: 4, ronda: 2, match_numero: 2, estado: 'pendiente' },
      { id_llave: 5, ronda: 1, match_numero: 1, estado: 'pendiente' },
    ]
    const map = computeOrdenLlavePdf(combates)
    expect(map[1]).toBe(1)
    expect(map[2]).toBe(2)
    expect(map[3]).toBe(3)
    expect(map[4]).toBe(4)
    expect(map[5]).toBe(6)
  })
})
