import { describe, it, expect } from 'vitest'
import { calcularPodioPoomsaeCategoria } from './podio-poomsae'

const p = (id, puntaje, calificado = true, extra = {}) => ({
  id_linea: id,
  dorsal: `D${id}`,
  nombres: `Atleta ${id}`,
  academia: `Acad ${id}`,
  puntaje,
  calificado,
  ...extra,
})

describe('calcularPodioPoomsaeCategoria', () => {
  it('sin inscritos', () => {
    expect(calcularPodioPoomsaeCategoria({ participantes: [] })).toEqual({
      estado: 'sin_inscritos',
      podio: null,
    })
    expect(calcularPodioPoomsaeCategoria(null).estado).toBe('sin_inscritos')
  })

  it('sin calificar', () => {
    const r = calcularPodioPoomsaeCategoria({ participantes: [p(1, null, false), p(2, null, false)] })
    expect(r.estado).toBe('sin_calificar')
    expect(r.podio).toBeNull()
  })

  it('en curso mientras falten calificaciones y no esté cerrada', () => {
    const r = calcularPodioPoomsaeCategoria({
      participantes: [p(1, 8.2), p(2, null, false), p(3, null, false)],
      cerrada: false,
    })
    expect(r.estado).toBe('en_curso')
    expect(r.progreso).toEqual({ calificados: 1, total: 3 })
  })

  it('categoría cerrada genera podio aunque falten calificaciones', () => {
    const r = calcularPodioPoomsaeCategoria({
      participantes: [p(1, 8.2), p(2, 7.5), p(3, null, false)],
      cerrada: true,
    })
    expect(r.estado).toBe('completo')
    expect(r.podio.oro.id_linea).toBe(1)
    expect(r.podio.plata.id_linea).toBe(2)
    expect(r.podio.bronce).toEqual([])
  })

  it('ordena por puntaje descendente: oro, plata, bronce', () => {
    const r = calcularPodioPoomsaeCategoria({
      participantes: [p(1, 7.1), p(2, 9.3), p(3, 8.0), p(4, 6.5)],
    })
    expect(r.estado).toBe('completo')
    expect(r.podio.oro.id_linea).toBe(2)
    expect(r.podio.oro.puntaje).toBe(9.3)
    expect(r.podio.plata.id_linea).toBe(3)
    expect(r.podio.bronce.map((b) => b.id_linea)).toEqual([1])
    expect(r.progreso).toEqual({ calificados: 4, total: 4 })
  })

  it('un solo participante → solo oro', () => {
    const r = calcularPodioPoomsaeCategoria({ participantes: [p(1, 8.8)] })
    expect(r.estado).toBe('completo')
    expect(r.podio.oro.id_linea).toBe(1)
    expect(r.podio.plata).toBeNull()
    expect(r.podio.bronce).toEqual([])
  })

  it('participante con puntaje 0 calificado cuenta en el ranking', () => {
    const r = calcularPodioPoomsaeCategoria({ participantes: [p(1, 0), p(2, 5)] })
    expect(r.estado).toBe('completo')
    expect(r.podio.oro.id_linea).toBe(2)
    expect(r.podio.plata.id_linea).toBe(1)
  })
})
