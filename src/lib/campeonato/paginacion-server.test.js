import { describe, it, expect } from 'vitest'
import { parsePaginacion, totalPaginas } from './paginacion-server'

function params(obj) {
  return new URLSearchParams(obj)
}

describe('parsePaginacion', () => {
  it('usa defaults sin parámetros', () => {
    const p = parsePaginacion(params({}))
    expect(p).toEqual({ page: 1, limit: 50, desde: 0, hasta: 49 })
  })

  it('calcula offsets de páginas siguientes', () => {
    const p = parsePaginacion(params({ page: '3', limit: '30' }))
    expect(p).toEqual({ page: 3, limit: 30, desde: 60, hasta: 89 })
  })

  it('clampa limit al máximo permitido', () => {
    const p = parsePaginacion(params({ limit: '99999' }), { limitDefecto: 50, limitMax: 100 })
    expect(p.limit).toBe(100)
  })

  it('rechaza valores inválidos o maliciosos sin romper', () => {
    expect(parsePaginacion(params({ page: '-5', limit: 'abc' })).page).toBe(1)
    expect(parsePaginacion(params({ page: 'NaN', limit: '-1' })).limit).toBe(50)
    expect(parsePaginacion(params({ page: '0' })).desde).toBe(0)
    expect(parsePaginacion(null).page).toBe(1)
  })

  it('trunca decimales', () => {
    const p = parsePaginacion(params({ page: '2.9', limit: '10.7' }))
    expect(p.page).toBe(2)
    expect(p.limit).toBe(10)
  })
})

describe('totalPaginas', () => {
  it('mínimo 1 página aunque no haya filas', () => {
    expect(totalPaginas(0, 50)).toBe(1)
    expect(totalPaginas(null, 50)).toBe(1)
  })

  it('redondea hacia arriba', () => {
    expect(totalPaginas(101, 50)).toBe(3)
    expect(totalPaginas(100, 50)).toBe(2)
    expect(totalPaginas(1, 50)).toBe(1)
  })
})
