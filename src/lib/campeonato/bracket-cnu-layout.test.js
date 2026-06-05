import { describe, it, expect } from 'vitest'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'

function porRonda8() {
  // 4 combates ronda 3 (Q-Final como primera con 8), 2 ronda 2, 1 final
  const mk = (ronda, n, withComp) =>
    Array.from({ length: n }, (_, i) => ({
      ronda,
      match_numero: i + 1,
      orden_pista: withComp ? i + 1 : '',
      estado: 'pendiente',
      competidor1: withComp ? { id_linea: i * 2 + 1, nombres: `A${i}`, academia: 'Club' } : null,
      competidor2: withComp ? { id_linea: i * 2 + 2, nombres: `B${i}`, academia: 'Club' } : null,
      color1: 'azul',
      color2: 'rojo',
    }))
  return { 3: mk(3, 4, true), 2: mk(2, 2, false), 1: mk(1, 1, false) }
}

describe('layoutCnuBracket', () => {
  it('genera filas y columnas coherentes para 8 competidores', () => {
    const layout = layoutCnuBracket(porRonda8())
    expect(layout).toBeTruthy()
    // 4 combates × 4 filas = 16 filas
    expect(layout.rows).toBe(16)
    // 3 + (3 rondas*2 + 1) = 10 columnas
    expect(layout.cols).toBe(10)
  })

  it('las verticales del árbol no tienen huecos (todas las filas del tramo tienen borde derecho)', () => {
    const layout = layoutCnuBracket(porRonda8())
    // Ronda 0 (Q-Final) combate 0: vertical en col 3, filas 0..2 deben tener border.right
    for (const r of [0, 1, 2]) {
      const spec = layout.cells.get(`${r},3`)
      expect(spec?.border?.right, `fila ${r} col 3 debe tener borde derecho`).toBe(true)
    }
  })

  it('aplica formato area/0N a los números de combate', () => {
    const layout = layoutCnuBracket(porRonda8(), { cancha: 2 })
    // El match number de ronda 0 combate 0 está en fila 1, col 3
    const spec = layout.cells.get(`1,3`)
    expect(spec?.matchNo).toBe(true)
    expect(spec?.v).toBe('2/01')
  })

  it('sin cancha usa solo el número con padding', () => {
    const layout = layoutCnuBracket(porRonda8())
    const spec = layout.cells.get(`1,3`)
    expect(spec?.v).toBe('01')
  })

  it('no muestra POR DEFINIR en columna de nombres en rondas siguientes', () => {
    const layout = layoutCnuBracket(porRonda8(), { cancha: 1 })
    for (const [key, spec] of layout.cells) {
      const [, col] = key.split(',').map(Number)
      if (col !== 1) continue
      if (spec.v === 'POR DEFINIR' && !spec.chung && !spec.hong) {
        expect.fail(`POR DEFINIR suelto en ${key}`)
      }
    }
  })

  it('brazos horizontales desde fila del jugador (cols B-C)', () => {
    const layout = layoutCnuBracket(porRonda8())
    expect(layout.cells.get('0,1')?.border?.bottom).toBe(true)
    expect(layout.cells.get('0,2')?.border?.bottom).toBe(true)
    expect(layout.cells.get('2,1')?.border?.bottom).toBe(true)
  })

  it('marca chung/hong para colorear nombres', () => {
    const layout = layoutCnuBracket(porRonda8())
    expect(layout.cells.get('0,1')?.chung).toBe(true)
    expect(layout.cells.get('2,1')?.hong).toBe(true)
  })

  it('dibuja brazos horizontales entre rondas (gap col + prev col)', () => {
    const layout = layoutCnuBracket(porRonda8())
    // Ronda 1 combate 0: feeders en filas 1 y 5, gap col 4, prev col 3
    expect(layout.cells.get('1,4')?.border?.bottom).toBe(true)
    expect(layout.cells.get('5,4')?.border?.bottom).toBe(true)
    expect(layout.cells.get('1,3')?.border?.bottom).toBe(true)
    expect(layout.cells.get('5,3')?.border?.bottom).toBe(true)
    // Vertical ronda 1 en col 5 filas 1..5
    for (const r of [1, 2, 3, 4, 5]) {
      expect(layout.cells.get(`${r},5`)?.border?.right, `fila ${r} col 5`).toBe(true)
    }
  })

  it('no pierde bordes al poner número de combate', () => {
    const layout = layoutCnuBracket(porRonda8(), { cancha: 1 })
    const spec = layout.cells.get('1,3')
    expect(spec?.v).toBe('1/01')
    expect(spec?.border?.right).toBe(true)
  })

  it('6 pers. con byes: 4 bloques (2 byes + 2 QF) y 16 filas', () => {
    const porRonda = {
      3: [
        {
          ronda: 3,
          match_numero: 1,
          orden_pista: 10,
          es_bye: true,
          estado: 'saltado',
          competidor1: { id_linea: 1, nombres: 'P1', academia: 'A' },
          competidor2: null,
          color1: 'azul',
        },
        {
          ronda: 3,
          match_numero: 2,
          orden_pista: 11,
          estado: 'pendiente',
          competidor1: { id_linea: 2, nombres: 'P2', academia: 'B' },
          competidor2: { id_linea: 3, nombres: 'P3', academia: 'C' },
          color1: 'azul',
          color2: 'rojo',
        },
        {
          ronda: 3,
          match_numero: 3,
          orden_pista: 12,
          estado: 'pendiente',
          competidor1: { id_linea: 4, nombres: 'P4', academia: 'D' },
          competidor2: { id_linea: 5, nombres: 'P5', academia: 'A' },
          color1: 'azul',
          color2: 'rojo',
        },
        {
          ronda: 3,
          match_numero: 4,
          orden_pista: 0,
          es_bye: true,
          estado: 'saltado',
          competidor1: { id_linea: 6, nombres: 'P6', academia: 'B' },
          competidor2: null,
          color1: 'azul',
        },
      ],
      2: [
        { ronda: 2, match_numero: 1, orden_pista: 17, estado: 'pendiente', competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo' },
        { ronda: 2, match_numero: 2, orden_pista: 18, estado: 'pendiente', competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo' },
      ],
      1: [{ ronda: 1, match_numero: 1, orden_pista: 25, estado: 'pendiente', competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo' }],
    }
    const layout = layoutCnuBracket(porRonda, { cancha: 4 })
    expect(layout.rows).toBe(16)
    expect(layout.cells.get('0,1')?.v).toBe('P1')
    expect(layout.cells.get('4,1')?.v).toBe('P2')
    expect(layout.cells.get('8,1')?.v).toBe('P4')
    expect(layout.cells.get('12,1')?.v).toBe('P6')
    // Bye superior: brazo horizontal sin vertical QF
    expect(layout.cells.get('1,3')?.border?.bottom).toBe(true)
    expect(layout.cells.get('1,3')?.border?.right).toBeFalsy()
    // QF: vertical en col 3
    expect(layout.cells.get('5,3')?.border?.right).toBe(true)
    // SF conecta bloques 0 y 1
    expect(layout.cells.get('1,4')?.border?.bottom).toBe(true)
    expect(layout.cells.get('5,4')?.border?.bottom).toBe(true)
  })

  it('árbol con un solo feeder (bye) no rompe conectores', () => {
    const porRonda = {
      2: [
        {
          ronda: 2,
          match_numero: 1,
          orden_pista: 1,
          estado: 'pendiente',
          competidor1: { id_linea: 1, nombres: 'A', academia: 'X' },
          competidor2: { id_linea: 2, nombres: 'B', academia: 'Y' },
          color1: 'azul',
          color2: 'rojo',
        },
      ],
      1: [
        {
          ronda: 1,
          match_numero: 1,
          orden_pista: 2,
          estado: 'pendiente',
          competidor1: null,
          competidor2: null,
          color1: 'azul',
          color2: 'rojo',
        },
      ],
    }
    const layout = layoutCnuBracket(porRonda, { cancha: 1 })
    expect(layout).toBeTruthy()
    expect(layout.cells.get('1,5')?.border?.right).toBe(true)
  })
})
