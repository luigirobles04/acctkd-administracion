import { describe, it, expect } from 'vitest'
import { buildScheduleHibrido } from '@/lib/campeonato/schedule-canchas'

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
