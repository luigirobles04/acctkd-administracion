import { describe, it, expect } from 'vitest'
import { computeOrdenLlavePdf, buildOrdenPistaMapPorCancha, canchaPorCategoriaBalanceada } from '@/lib/campeonato/orden-llave'

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

describe('canchaPorCategoriaBalanceada', () => {
  it('equilibra combates: la categoría más pesada va al área con menos carga', () => {
    const cats = [
      { id_categoria: 10, orden: 1 },
      { id_categoria: 20, orden: 2 },
      { id_categoria: 30, orden: 3 },
    ]
    const porCat = {
      10: [{ id_llave: 1, estado: 'pendiente', es_bye: false }],
      20: [
        { id_llave: 2, estado: 'pendiente', es_bye: false },
        { id_llave: 3, estado: 'pendiente', es_bye: false },
      ],
      30: [
        { id_llave: 4, estado: 'pendiente', es_bye: false },
        { id_llave: 5, estado: 'pendiente', es_bye: false },
        { id_llave: 6, estado: 'pendiente', es_bye: false },
      ],
    }
    const m = canchaPorCategoriaBalanceada(cats, porCat, 3)
    expect(m[30]).toBe(1)
    expect(m[20]).toBe(2)
    expect(m[10]).toBe(3)
  })
})

describe('buildOrdenPistaMapPorCancha', () => {
  it('una sola categoría: pre-final y final consecutivos', () => {
    const porCat = {
      1: [
        { id_llave: 10, id_categoria: 1, ronda: 2, match_numero: 1, estado: 'pendiente' },
        { id_llave: 11, id_categoria: 1, ronda: 1, match_numero: 1, estado: 'pendiente' },
      ],
    }
    const map = buildOrdenPistaMapPorCancha(
      [{ id_categoria: 1, orden: 1 }],
      porCat,
      { 1: 1 },
    )
    expect(map[10]).toBe(1)
    expect(map[11]).toBe(2)
  })
})
