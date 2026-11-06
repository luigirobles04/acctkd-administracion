import { describe, it, expect } from 'vitest'
import { buildScheduleNumeracionPorFases, ordenPistaDesdeSchedule } from '@/lib/campeonato/schedule-canchas'

describe('buildScheduleNumeracionPorFases', () => {
  it('dos categorías consecutivas 4 inscritos: todas las de ronda 3 antes que ronda 2', () => {
    const a = { id_categoria: 1, orden: 10 }
    const b = { id_categoria: 2, orden: 11 }
    const porCat = {
      1: [
        { id_llave: 11, id_categoria: 1, ronda: 3, match_numero: 1, estado: 'pendiente' },
        { id_llave: 12, id_categoria: 1, ronda: 3, match_numero: 2, estado: 'pendiente' },
        { id_llave: 13, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 14, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      2: [
        { id_llave: 21, id_categoria: 2, ronda: 3, match_numero: 1, estado: 'pendiente' },
        { id_llave: 22, id_categoria: 2, ronda: 3, match_numero: 2, estado: 'pendiente' },
        { id_llave: 23, id_categoria: 2, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 24, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const inscritos = { 1: 4, 2: 4 }
    const schedule = buildScheduleNumeracionPorFases([a, b], porCat, inscritos)
    const idx = (id) => schedule.findIndex((c) => c.id_llave === id)

    for (const id of [11, 12, 21, 22]) {
      for (const later of [13, 23, 14, 24]) {
        expect(idx(id)).toBeLessThan(idx(later))
      }
    }
    const map = ordenPistaDesdeSchedule(schedule)
    expect(map[11]).toBe(1)
    expect(map[12]).toBe(2)
    expect(map[21]).toBe(3)
    expect(map[22]).toBe(4)
  })
})
