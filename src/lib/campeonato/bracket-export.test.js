import { describe, it, expect } from 'vitest'
import {
  labelRondaExport,
  rondasOrdenadas,
  columnasBracket,
  combateEnBracket,
  ganadorNombre,
} from '@/lib/campeonato/bracket-export'

describe('labelRondaExport', () => {
  it('mapea rondas conocidas sin duplicar', () => {
    expect(labelRondaExport(1)).toBe('Final')
    expect(labelRondaExport(2)).toBe('S-Final')
    expect(labelRondaExport(3)).toBe('Q-Final')
    expect(labelRondaExport(4)).toBe('R16')
    expect(labelRondaExport(5)).toBe('R32')
    expect(labelRondaExport(6)).toBe('R64')
  })

  it('rondas no mapeadas usan fallback con potencia de 2', () => {
    expect(labelRondaExport(7)).toBe('R128')
  })

  it('en bracket de 32 (5 rondas) las etiquetas son únicas (regresión del bug Q-Final/Q-Final)', () => {
    const labels = [5, 4, 3, 2, 1].map(labelRondaExport)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toEqual(['R32', 'R16', 'Q-Final', 'S-Final', 'Final'])
  })
})

describe('combateEnBracket', () => {
  it('excluye vacío y bye', () => {
    expect(combateEnBracket({ estado: 'pendiente' })).toBe(true)
    expect(combateEnBracket({ estado: 'finalizado' })).toBe(true)
    expect(combateEnBracket({ estado: 'vacío' })).toBe(false)
    expect(combateEnBracket({ estado: 'bye' })).toBe(false)
    expect(combateEnBracket(null)).toBeFalsy()
  })
})

describe('rondasOrdenadas', () => {
  it('ordena de mayor a menor (R32 → Final) y filtra rondas vacías', () => {
    const porRonda = {
      1: [{ estado: 'pendiente' }],
      2: [{ estado: 'pendiente' }],
      3: [{ estado: 'vacío' }], // toda vacía → se excluye
    }
    expect(rondasOrdenadas(porRonda)).toEqual([2, 1])
  })
})

describe('ganadorNombre', () => {
  it('devuelve el nombre del competidor ganador', () => {
    const c = {
      ganador_id_linea: 5,
      id_linea1: 5,
      id_linea2: 6,
      competidor1: { nombres: 'ANA' },
      competidor2: { nombres: 'BETO' },
    }
    expect(ganadorNombre(c)).toBe('ANA')
    expect(ganadorNombre({ ...c, ganador_id_linea: 6 })).toBe('BETO')
    expect(ganadorNombre({ ...c, ganador_id_linea: null })).toBe('')
  })
})

describe('columnasBracket', () => {
  it('genera columnas con etiquetas y combates ordenados por match_numero', () => {
    const porRonda = {
      2: [
        { ronda: 2, match_numero: 2, estado: 'pendiente', competidor1: { nombres: 'X', id_linea: 1 }, color1: 'azul' },
        { ronda: 2, match_numero: 1, estado: 'pendiente', competidor1: { nombres: 'Y', id_linea: 2 }, color1: 'azul' },
      ],
      1: [{ ronda: 1, match_numero: 1, estado: 'pendiente', competidor1: { nombres: 'Z', id_linea: 3 } }],
    }
    const cols = columnasBracket(porRonda)
    expect(cols).toHaveLength(2)
    expect(cols[0].label).toBe('S-Final')
    expect(cols[1].label).toBe('Final')
    // ordenado por match_numero ascendente
    expect(cols[0].combates[0].match_numero).toBe(1)
    expect(cols[0].combates[1].match_numero).toBe(2)
  })

  it('asigna color azul a chung y rojo a hong por defecto', () => {
    const porRonda = {
      1: [{ ronda: 1, match_numero: 1, estado: 'pendiente', competidor1: { nombres: 'A', id_linea: 1 }, competidor2: { nombres: 'B', id_linea: 2 } }],
    }
    const cols = columnasBracket(porRonda)
    expect(cols[0].combates[0].chung.color).toBe('azul')
    expect(cols[0].combates[0].hong.color).toBe('rojo')
  })
})
