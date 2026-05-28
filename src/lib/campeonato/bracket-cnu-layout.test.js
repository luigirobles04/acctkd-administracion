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
})
