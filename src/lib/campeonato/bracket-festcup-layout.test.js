import { describe, it, expect } from 'vitest'
import { layoutFestcupBracket } from '@/lib/campeonato/bracket-festcup-layout'

function porRonda4() {
  const mk = (ronda, n, comp) =>
    Array.from({ length: n }, (_, i) => ({
      ronda,
      match_numero: i + 1,
      orden_pista: comp ? i + 1 : i + 10,
      estado: 'pendiente',
      competidor1: comp ? { nombres: 'CHUNG' + i, academia: 'Club A' } : null,
      competidor2: comp ? { nombres: 'HONG' + i, academia: 'Club B' } : null,
      color1: 'azul',
      color2: 'rojo',
    }))
  return { 2: mk(2, 2, true), 1: mk(1, 1, false) }
}

describe('layoutFestcupBracket', () => {
  it('genera 6 filas para 4 competidores (2 combates × 3 filas)', () => {
    const layout = layoutFestcupBracket(porRonda4())
    expect(layout.rows).toBe(6)
  })

  it('usa patrón FESTCUP: bottom en jugador, top en spacer, TR/BR en conector', () => {
    const layout = layoutFestcupBracket(porRonda4(), { cancha: 1 })
    expect(layout.cells.get('0,1')?.border?.bottom).toBe(true)
    expect(layout.cells.get('1,1')?.border?.top).toBe(true)
    expect(layout.cells.get('1,6')?.border?.top).toBe(true)
    expect(layout.cells.get('1,6')?.border?.right).toBe(true)
    expect(layout.cells.get('1,6')?.v).toBe('1/01')
    expect(layout.cells.get('2,6')?.border?.bottom).toBe(true)
    expect(layout.cells.get('2,6')?.border?.right).toBe(true)
  })

  it('conecta ronda 1 con vertical en col 8', () => {
    const layout = layoutFestcupBracket(porRonda4(), { cancha: 1 })
    expect(layout.cells.get('2,8')?.border?.top).toBe(true)
    expect(layout.cells.get('2,8')?.border?.right).toBe(true)
    expect(layout.cells.get('4,8')?.border?.bottom).toBe(true)
  })
})
