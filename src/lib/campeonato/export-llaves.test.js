import { describe, it, expect } from 'vitest'
import { combatesPeleables, buildSchedulePorCategoria } from '@/lib/campeonato/schedule-canchas'

function compararCategoria(a, b) {
  return (a.orden ?? 9999) - (b.orden ?? 9999)
}

function buildOrdenBloques(categorias, porCat, canchaPorCat) {
  const map = {}
  for (const cancha of [1, 2, 3]) {
    const cats = categorias
      .filter((c) => Number(canchaPorCat[c.id_categoria]) === cancha)
      .sort(compararCategoria)
    let orden = 1
    for (const cat of cats) {
      for (const c of combatesPeleables(porCat[cat.id_categoria])) {
        map[c.id_llave] = orden++
      }
    }
  }
  return map
}

describe('numeración por bloques de categoría', () => {
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

  it('continúa numeración entre categorías del mismo área', () => {
    const map = buildOrdenBloques([catA, catB], porCat, canchaPorCat)
    expect(map[10]).toBe(1)
    expect(map[11]).toBe(2)
    expect(map[12]).toBe(3)
    expect(map[20]).toBe(4)
    expect(map[21]).toBe(5)
  })

  it('buildSchedulePorCategoria coincide con orden de bloques', () => {
    const schedule = buildSchedulePorCategoria([catA, catB], porCat)
    const map = buildOrdenBloques([catA, catB], porCat, canchaPorCat)
    schedule.forEach((c, i) => {
      expect(map[c.id_llave]).toBe(i + 1)
    })
  })
})
