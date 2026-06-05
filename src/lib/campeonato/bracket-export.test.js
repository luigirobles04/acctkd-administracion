import { describe, it, expect } from 'vitest'
import {
  labelRondaExport,
  labelColumnaBracket,
  colorByeEnBloque,
  rondasOrdenadas,
  columnasBracket,
  combateEnBracket,
  ganadorNombre,
  categoriasOrdenadasExport,
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

describe('colorByeEnBloque', () => {
  it('bloque par = azul, impar = rojo', () => {
    expect(colorByeEnBloque(1)).toBe('azul')
    expect(colorByeEnBloque(2)).toBe('rojo')
    expect(colorByeEnBloque(4)).toBe('rojo')
  })
})

describe('labelColumnaBracket', () => {
  it('llave parcial de 9 usa Rnd 1 en vez de R16', () => {
    expect(labelColumnaBracket(4, { maxRonda: 4, inscritos: 9, numBlocks: 8 })).toBe('Rnd 1')
    expect(labelColumnaBracket(3, { maxRonda: 4, inscritos: 9, numBlocks: 8 })).toBe('Q-Final')
  })

  it('llave llena de 16 mantiene R16', () => {
    expect(labelColumnaBracket(4, { maxRonda: 4, inscritos: 16, numBlocks: 8 })).toBe('R16')
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

  it('prefiere orden_bracket sobre orden_pista para el número de combate', () => {
    const porRonda = {
      1: [{
        ronda: 1,
        match_numero: 1,
        estado: 'pendiente',
        orden_pista: 99,
        orden_bracket: 3,
        competidor1: { nombres: 'A', id_linea: 1 },
        competidor2: { nombres: 'B', id_linea: 2 },
      }],
    }
    expect(columnasBracket(porRonda)[0].combates[0].numero_combate).toBe(3)
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

describe('categoriasOrdenadasExport', () => {
  it('agrupa por área y ordena por campo orden dentro de cada área', () => {
    const cats = [
      { id_categoria: 1, nombre: 'B -30kg', cancha: 2, tiene_llave: true, orden: 2 },
      { id_categoria: 2, nombre: 'A -27kg', cancha: 1, tiene_llave: true, orden: 1 },
      { id_categoria: 3, nombre: 'C -33kg', cancha: 1, tiene_llave: true, orden: 2 },
      { id_categoria: 4, nombre: 'D -36kg', cancha: 2, tiene_llave: true, orden: 1 },
    ]
    const ids = categoriasOrdenadasExport(cats).map((c) => c.id_categoria)
    expect(ids).toEqual([2, 3, 4, 1])
  })
})
