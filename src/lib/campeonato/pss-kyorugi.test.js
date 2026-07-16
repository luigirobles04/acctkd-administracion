import { describe, expect, it } from 'vitest'
import { avanzarGanadorLocal } from '@/lib/campeonato/pss-kyorugi'

describe('avanzarGanadorLocal', () => {
  it('avanza ganador a siguiente llave (semifinal → final)', () => {
    const combates = [
      {
        id_llave: 10,
        id_categoria: 1,
        ronda: 2,
        match_numero: 1,
        id_linea1: 101,
        id_linea2: 102,
        color1: 'azul',
        color2: 'rojo',
        estado: 'pendiente',
        es_bye: false,
        siguiente_llave: 20,
        competidor1: { id_linea: 101, dorsal: 'A1', nombres: 'Uno' },
        competidor2: { id_linea: 102, dorsal: 'A2', nombres: 'Dos' },
      },
      {
        id_llave: 20,
        id_categoria: 1,
        ronda: 1,
        match_numero: 1,
        id_linea1: 0,
        id_linea2: 0,
        estado: 'pendiente',
        es_bye: false,
        siguiente_llave: null,
        competidor1: null,
        competidor2: null,
      },
    ]

    const out = avanzarGanadorLocal(combates, 10, 101, { puntaje1: 12, puntaje2: 8 })
    const sf = out.find((c) => c.id_llave === 10)
    const fin = out.find((c) => c.id_llave === 20)

    expect(sf.estado).toBe('finalizado')
    expect(sf.ganador_id_linea).toBe(101)
    expect(fin.id_linea1).toBe(101)
    expect(fin.competidor1?.dorsal).toBe('A1')
    expect(fin.estado).toBe('pendiente')
  })
})
