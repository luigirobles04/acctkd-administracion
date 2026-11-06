import { describe, it, expect } from 'vitest'
import {
  buildInscritosPorCatResuelto,
  inferirInscritosDesdeLlave,
  lookupInscritosMap,
} from '@/lib/campeonato/inscripciones-resueltas'

describe('lookupInscritosMap', () => {
  it('encuentra por id numérico o string', () => {
    expect(lookupInscritosMap({ 5: 2 }, 5)).toBe(2)
    expect(lookupInscritosMap({ 5: 2 }, '5')).toBe(2)
    expect(lookupInscritosMap({ '5': 2 }, 5)).toBe(2)
  })
})

describe('inferirInscritosDesdeLlave', () => {
  it('1 combate activo en ronda 1 => 2 inscritos', () => {
    const porCat = {
      1: [{ id_llave: 1, ronda: 1, match_numero: 1, estado: 'pendiente' }],
    }
    expect(inferirInscritosDesdeLlave(porCat, 1)).toBe(2)
  })

  it('semis + final => 4 inscritos', () => {
    const porCat = {
      1: [
        { id_llave: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 2, ronda: 2, match_numero: 2, estado: 'pendiente' },
        { id_llave: 3, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    expect(inferirInscritosDesdeLlave(porCat, 1)).toBe(4)
  })

  it('2 combates con maxRonda 2 => 3 inscritos', () => {
    const porCat = {
      1: [
        { id_llave: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 2, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    expect(inferirInscritosDesdeLlave(porCat, 1)).toBe(3)
  })
})

describe('buildInscritosPorCatResuelto', () => {
  it('completa conteo 0 con inferencia', () => {
    const categorias = [{ id_categoria: 7, orden: 1 }]
    const porCat = {
      7: [{ id_llave: 1, ronda: 1, match_numero: 1, estado: 'pendiente' }],
    }
    const m = buildInscritosPorCatResuelto({ 7: 0 }, categorias, porCat)
    expect(m[7]).toBe(2)
  })
})
