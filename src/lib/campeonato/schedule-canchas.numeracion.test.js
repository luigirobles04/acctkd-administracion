import { describe, it, expect } from 'vitest'
import {
  buildScheduleNumeracionIntercalada,
  buildSchedulePorCategoria,
} from '@/lib/campeonato/schedule-canchas'
import { ordenPistaDesdeSchedule } from '@/lib/campeonato/schedule-canchas'

describe('buildScheduleNumeracionIntercalada', () => {
  const catA = { id_categoria: 1, orden: 1 }
  const catB = { id_categoria: 2, orden: 2 }

  it('alterna pre-finales entre categorías del área', () => {
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
    const schedule = buildScheduleNumeracionIntercalada([catA, catB], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([10, 20, 11, 21, 12])
  })

  it('buildSchedulePorCategoria sigue en bloques (solo numeración cambia)', () => {
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      2: [{ id_llave: 20, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' }],
    }
    expect(buildSchedulePorCategoria([catA, catB], porCat).map((c) => c.id_llave)).toEqual([
      10, 11, 20,
    ])
  })

  it('ordenPistaDesdeSchedule es consecutivo sin saltos', () => {
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildScheduleNumeracionIntercalada([catA], porCat)
    const map = ordenPistaDesdeSchedule(schedule)
    expect(map[10]).toBe(1)
    expect(map[11]).toBe(2)
  })

  it('final directa (2 inscritos) se intercala entre semis de otra categoría', () => {
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      2: [{ id_llave: 20, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' }],
    }
    const schedule = buildScheduleNumeracionIntercalada([catA, catB], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([10, 20, 11])
    const map = ordenPistaDesdeSchedule(schedule)
    expect(map[10]).toBe(1)
    expect(map[20]).toBe(2)
    expect(map[11]).toBe(3)
  })
})
