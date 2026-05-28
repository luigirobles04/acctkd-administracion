import { describe, it, expect } from 'vitest'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'

function porRonda32() {
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
  return { 5: mk(5, 16, true), 4: mk(4, 8, false), 3: mk(3, 4, false), 2: mk(2, 2, false), 1: mk(1, 1, false) }
}

describe('layoutCnuBracket stress', () => {
  it('genera layout de 32 sin error y con conectores en todas las rondas', () => {
    const layout = layoutCnuBracket(porRonda32(), { cancha: 3 })
    expect(layout.rows).toBe(64)
    expect(layout.cols).toBeGreaterThan(10)

    // Ronda 0 combate 0: vertical col 3
    for (const r of [0, 1, 2]) {
      expect(layout.cells.get(`${r},3`)?.border?.right).toBe(true)
    }

    // Ronda 4 (Final): col = 3 + 4*2 = 11
    expect(layout.cells.get('31,11')?.border?.right).toBe(true)

    // Formato area/NN en primera ronda
    expect(layout.cells.get('1,3')?.v).toBe('3/01')
  })
})
