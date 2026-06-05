import { describe, it, expect } from 'vitest'
import {
  nextPowerOf2,
  bracketSizeFor,
  getSeedOrder,
  firstRoundOpponentSeed,
  buildSlots,
  buildSlotsCnu6,
  buildSlotsCnu,
  usarLlaveCompacta,
} from '@/lib/campeonato/llaves-kyorugi'

describe('nextPowerOf2 / bracketSizeFor', () => {
  it('redondea hacia arriba a potencia de 2', () => {
    expect(nextPowerOf2(1)).toBe(1)
    expect(nextPowerOf2(2)).toBe(2)
    expect(nextPowerOf2(3)).toBe(4)
    expect(nextPowerOf2(5)).toBe(8)
    expect(nextPowerOf2(9)).toBe(16)
    expect(nextPowerOf2(17)).toBe(32)
  })

  it('potencias exactas se mantienen', () => {
    for (const p of [1, 2, 4, 8, 16, 32]) {
      expect(bracketSizeFor(p)).toBe(p)
    }
  })
})

describe('getSeedOrder', () => {
  it('orden estándar de 4: [1,4,2,3]', () => {
    expect(getSeedOrder(4)).toEqual([1, 4, 2, 3])
  })

  it('orden de 8: 1 enfrenta a 8, 4 a 5, etc.', () => {
    expect(getSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })

  it('es una permutación completa sin repetidos', () => {
    for (const size of [2, 4, 8, 16, 32]) {
      const order = getSeedOrder(size)
      expect(order).toHaveLength(size)
      expect(new Set(order).size).toBe(size)
      expect(Math.min(...order)).toBe(1)
      expect(Math.max(...order)).toBe(size)
    }
  })

  it('el seed 1 y el seed 2 quedan en mitades opuestas (no se cruzan hasta la final)', () => {
    const order = getSeedOrder(16)
    const pos1 = order.indexOf(1)
    const pos2 = order.indexOf(2)
    expect(pos1).toBeLessThan(8)
    expect(pos2).toBeGreaterThanOrEqual(8)
  })
})

describe('firstRoundOpponentSeed', () => {
  it('en llave de 8, el rival de 1 es 8', () => {
    expect(firstRoundOpponentSeed(8, 1)).toBe(8)
    expect(firstRoundOpponentSeed(8, 8)).toBe(1)
    expect(firstRoundOpponentSeed(8, 4)).toBe(5)
  })

  it('los emparejamientos son recíprocos', () => {
    const size = 16
    for (let s = 1; s <= size; s++) {
      const opp = firstRoundOpponentSeed(size, s)
      expect(firstRoundOpponentSeed(size, opp)).toBe(s)
    }
  })
})

describe('usarLlaveCompacta', () => {
  it('siempre false — CNU usa llave estándar', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      expect(usarLlaveCompacta(n)).toBe(false)
    }
  })
})

describe('buildSlotsCnu6', () => {
  it('byes semillas 1 y 6; QF 2v3 y 4v5 (estilo PDF CNU)', () => {
    const seeds = [null, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }]
    const slots = buildSlotsCnu6(seeds)
    expect(slots[0]).toEqual({ id: 1 })
    expect(slots[1]).toBeNull()
    expect(slots[2]).toEqual({ id: 2 })
    expect(slots[3]).toEqual({ id: 3 })
    expect(slots[4]).toEqual({ id: 4 })
    expect(slots[5]).toEqual({ id: 5 })
    expect(slots[6]).toEqual({ id: 6 })
    expect(slots[7]).toBeNull()
  })
})

describe('buildSlotsCnu', () => {
  it('6 pers. usa layout CNU especial', () => {
    const seeds = [null, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }]
    const slots = buildSlotsCnu(seeds, 6)
    expect(slots.filter(Boolean)).toHaveLength(6)
    expect(slots[0].id).toBe(1)
    expect(slots[6].id).toBe(6)
  })

  it('7 pers. usa orden estándar de 8 (bye semilla 1)', () => {
    const seeds = [null, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }]
    const slots = buildSlotsCnu(seeds, 7)
    expect(slots[0]).toEqual({ id: 1 })
    expect(slots[1]).toBeNull()
    expect(slots.filter(Boolean)).toHaveLength(7)
  })

  it('8 pers. llena los 8 slots estándar', () => {
    const seeds = [null, ...Array.from({ length: 8 }, (_, i) => ({ id: i + 1 }))]
    const slots = buildSlotsCnu(seeds, 8)
    expect(slots.filter(Boolean)).toHaveLength(8)
  })
})

describe('buildSlots (llave estándar con seeds)', () => {
  it('coloca los participantes según el orden de seeds', () => {
    const seeds = [null, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const slots = buildSlots(seeds, 4)
    expect(slots[0]).toEqual({ id: 1 })
    expect(slots[1]).toEqual({ id: 4 })
    expect(slots[2]).toEqual({ id: 2 })
    expect(slots[3]).toEqual({ id: 3 })
  })
})
