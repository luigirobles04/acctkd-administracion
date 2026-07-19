import { describe, it, expect } from 'vitest'
import { calcularPodioCategoria } from './podio-kyorugi.js'

describe('podio oro único', () => {
  it('otorga oro cuando final tiene motivo unico y un solo competidor', () => {
    const combates = [
      { ronda: 2, estado: 'saltado', es_bye: true, id_linea1: 10, es_exhibicion: false },
      {
        ronda: 1,
        estado: 'finalizado',
        id_linea1: 10,
        id_linea2: null,
        ganador_id_linea: 10,
        motivo_resultado: 'unico',
        es_exhibicion: false,
      },
    ]
    const r = calcularPodioCategoria(combates)
    expect(r.estado).toBe('completo')
    expect(r.podio.oro).toBe(10)
    expect(r.podio.plata).toBeNull()
  })

  it('ignora combates de exhibición en podio', () => {
    const combates = [
      {
        ronda: 0,
        estado: 'finalizado',
        id_linea1: 1,
        id_linea2: 2,
        ganador_id_linea: 1,
        es_exhibicion: true,
      },
      {
        ronda: 1,
        estado: 'pendiente',
        id_linea1: 3,
        id_linea2: 4,
        es_exhibicion: false,
      },
    ]
    const r = calcularPodioCategoria(combates)
    expect(r.estado).toBe('en_curso')
  })
})
