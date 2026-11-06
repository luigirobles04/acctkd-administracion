import { describe, it, expect } from 'vitest'
import { buildSchedulePorCategoria } from '@/lib/campeonato/schedule-canchas'
import { buildOrdenPistaMapPorCancha } from '@/lib/campeonato/orden-llave'

describe('numeración intercalada por área', () => {
  const catA = { id_categoria: 1, orden: 1 }
  const catB = { id_categoria: 2, orden: 2 }
  const porCat = {
    1: [
      { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
      { id_llave: 11, id_categoria: 1, ronda: 2, match_numero: 2, estado: 'pendiente' },
      { id_llave: 12, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
    ],
    2: [
      { id_llave: 20, id_categoria: 2, ronda: 2, match_numero: 1, estado: 'pendiente' },
      { id_llave: 21, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
    ],
  }
  const canchaPorCat = { 1: 1, 2: 1 }

  it('intercala categorías y reserva hueco antes de cada final', () => {
    const map = buildOrdenPistaMapPorCancha([catA, catB], porCat, canchaPorCat)
    expect(map[10]).toBe(1)
    expect(map[20]).toBe(2)
    expect(map[11]).toBe(3)
    expect(map[21]).toBe(4)
    expect(map[12]).toBe(5)
  })

  it('buildSchedulePorCategoria no altera el orden de bloques', () => {
    const schedule = buildSchedulePorCategoria([catA, catB], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([10, 11, 12, 20, 21])
  })
})
