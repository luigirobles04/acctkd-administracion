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

  it('tras el último pre-final solo 1 combate ajeno antes de la final', () => {
    const catC = { id_categoria: 3, orden: 3 }
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      2: [
        { id_llave: 20, id_categoria: 2, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 21, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      3: [
        { id_llave: 30, id_categoria: 3, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 31, id_categoria: 3, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildScheduleNumeracionIntercalada([catA, catB, catC], porCat)
    for (const catId of [1, 2, 3]) {
      const idxs = schedule
        .map((c, i) => (c.id_categoria === catId ? i : -1))
        .filter((i) => i >= 0)
      const pre = idxs.filter((i) => schedule[i].ronda !== 1)
      const fin = idxs.filter((i) => schedule[i].ronda === 1)
      if (pre.length && fin.length) {
        const lastPre = Math.max(...pre)
        const firstFin = Math.min(...fin)
        const gap = firstFin - lastPre
        expect(gap).toBeGreaterThanOrEqual(1)
        expect(gap).toBeLessThanOrEqual(2)
      }
    }
  })

  it('usa final directa (-28kg) como descanso antes de la final de -22kg', () => {
    const cat22 = { id_categoria: 101, orden: 1, nombre: 'F -22' }
    const cat28 = { id_categoria: 102, orden: 2, nombre: 'F -28' }
    const catMay = { id_categoria: 103, orden: 99, nombre: 'May F -62' }
    const porCat = {
      101: [
        { id_llave: 10, id_categoria: 101, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 101, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      102: [{ id_llave: 20, id_categoria: 102, ronda: 1, match_numero: 1, estado: 'pendiente' }],
      103: [
        { id_llave: 30, id_categoria: 103, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 31, id_categoria: 103, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildScheduleNumeracionIntercalada([cat22, cat28, catMay], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([10, 20, 11, 30, 31])
  })

  it('May F -62 semi sigue al combate 16 (+84 semi después)', () => {
    const juv73 = { id_categoria: 1, orden: 252 }
    const mayF = { id_categoria: 2, orden: 285 }
    const may84 = { id_categoria: 3, orden: 288 }
    const porCat = {
      1: [{ id_llave: 1, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' }],
      2: [
        { id_llave: 2, id_categoria: 2, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 3, id_categoria: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
      3: [
        { id_llave: 4, id_categoria: 3, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 5, id_categoria: 3, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const schedule = buildScheduleNumeracionIntercalada([juv73, mayF, may84], porCat)
    expect(schedule.map((c) => c.id_llave)).toEqual([1, 2, 4, 3, 5])
    const map = ordenPistaDesdeSchedule(schedule)
    expect(map[2]).toBe(map[1] + 1)
    expect(map[3]).toBe(map[2] + 2)
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
