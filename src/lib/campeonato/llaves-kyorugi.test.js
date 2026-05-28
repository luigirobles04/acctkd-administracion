import { describe, it, expect } from 'vitest'
import {
  nextPowerOf2,
  bracketSizeFor,
  getSeedOrder,
  firstRoundOpponentSeed,
  buildSlots,
  buildCompactSlots,
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
    // seed 1 en la primera mitad, seed 2 en la segunda
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
  it('usa compacta solo cuando hay byes y n>4', () => {
    expect(usarLlaveCompacta(4)).toBe(false) // potencia exacta
    expect(usarLlaveCompacta(5)).toBe(true)
    expect(usarLlaveCompacta(8)).toBe(false) // potencia exacta
    expect(usarLlaveCompacta(9)).toBe(true)
    expect(usarLlaveCompacta(2)).toBe(false)
    expect(usarLlaveCompacta(3)).toBe(false) // n<=4 usa llave estándar
  })
})

const mkPart = (n, academia = null) =>
  Array.from({ length: n }, (_, i) => ({ id_linea: i + 1, id_academia_campeonato: academia }))

describe('buildCompactSlots', () => {
  it('con n par no genera byes', () => {
    const { slots, bracketSize, byePlayers, fightCount } = buildCompactSlots(mkPart(6))
    expect(byePlayers).toHaveLength(0)
    expect(fightCount).toBe(3)
    expect(bracketSize).toBe(8)
    const ocupados = slots.filter(Boolean).length
    expect(ocupados).toBe(6)
  })

  it('con n impar genera exactamente 1 bye', () => {
    const { byePlayers, fightCount } = buildCompactSlots(mkPart(9))
    expect(byePlayers).toHaveLength(1)
    expect(fightCount).toBe(4)
  })

  it('todos los participantes aparecen (en slots o en byes), sin duplicados', () => {
    for (const n of [5, 7, 9, 11, 13, 15]) {
      const { slots, byePlayers } = buildCompactSlots(mkPart(n))
      const ids = [...slots.filter(Boolean).map((p) => p.id_linea), ...byePlayers.map((p) => p.id_linea)]
      expect(new Set(ids).size).toBe(n)
      expect(ids).toHaveLength(n)
    }
  })

  it('los emparejamientos de primera ronda son consecutivos sin huecos', () => {
    const { slots, fightCount } = buildCompactSlots(mkPart(10))
    for (let m = 0; m < fightCount; m++) {
      expect(slots[m * 2]).toBeTruthy()
      expect(slots[m * 2 + 1]).toBeTruthy()
    }
  })
})

describe('buildSlots (llave estándar con seeds)', () => {
  it('coloca los participantes según el orden de seeds', () => {
    const seeds = [null, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] // index 0 vacío
    const slots = buildSlots(seeds, 4)
    // orden de 4 = [1,4,2,3]
    expect(slots[0]).toEqual({ id: 1 })
    expect(slots[1]).toEqual({ id: 4 })
    expect(slots[2]).toEqual({ id: 2 })
    expect(slots[3]).toEqual({ id: 3 })
  })
})
