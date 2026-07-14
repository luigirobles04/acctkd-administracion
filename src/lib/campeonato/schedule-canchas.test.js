import { describe, it, expect } from 'vitest'
import { buildScheduleHibrido, buildSchedulePorCategoria } from '@/lib/campeonato/schedule-canchas'

describe('buildScheduleHibrido', () => {
  const catA = { id_categoria: 1, nombre: 'A' }
  const catB = { id_categoria: 2, nombre: 'B' }

  it('intercala pre-finales y retrasa finales al menos un combate', () => {
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 2, match_numero: 2, estado: 'pendiente' },
        { id_llave: 12, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      2: [
        { id_llave: 20, id_categoria: 2, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 21, id_categoria: 2, ronda: 2, match_numero: 2, estado: 'pendiente' },
        { id_llave: 22, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildScheduleHibrido([catA, catB], porCat)
    expect(schedule).toHaveLength(6)

    const idxFinalA = schedule.findIndex((c) => c.id_llave === 12)
    const idxFinalB = schedule.findIndex((c) => c.id_llave === 22)
    expect(idxFinalA).toBeGreaterThan(0)
    expect(idxFinalB).toBeGreaterThan(0)

    const beforeA = schedule[idxFinalA - 1]
    expect(beforeA.id_categoria).not.toBe(1)
  })
})

describe('buildSchedulePorCategoria', () => {
  const catA = { id_categoria: 1, nombre: 'A', orden: 1 }
  const catB = { id_categoria: 2, nombre: 'B', orden: 2 }

  it('termina categoría A antes de empezar categoría B', () => {
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
    const schedule = buildSchedulePorCategoria([catA, catB], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([10, 11, 12, 20, 21])
  })

  it('excluye byes saltados de la secuencia', () => {
    const porCat = {
      1: [
        { id_llave: 1, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'saltado', es_bye: true },
        { id_llave: 2, id_categoria: 1, ronda: 2, match_numero: 2, estado: 'pendiente' },
        { id_llave: 3, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildSchedulePorCategoria([catA], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([2, 3])
  })
})
