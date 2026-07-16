import { describe, it, expect } from 'vitest'
import { buildExportDataFromNombres, buildPorRondaFromNombres } from '@/lib/campeonato/bracket-from-nombres'
import { countPlayersInEntradas, layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'
import { validatePlayersForPdf, buildBracketPdfBuffer, categoriaExportablePdf } from '@/lib/campeonato/export-bracket-pdf'
import { combatesDesdePorRonda, combatesPeleables } from '@/lib/campeonato/schedule-canchas'

function ordenesPeleables(cat) {
  return combatesPeleables(combatesDesdePorRonda(cat.porRonda)).map((c) => c.orden_pista)
}

describe('bracket-from-nombres', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    it(`${n} nombres → porRonda con ${n} jugadores`, () => {
      const nombres = Array.from({ length: n }, (_, i) => `Jugador ${i + 1}`)
      const porRonda = buildPorRondaFromNombres(nombres)
      const layout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
      expect(countPlayersInEntradas(layout.entradas)).toBe(n)
    })
  }

  it('orden_pista secuencial por área (categoría completa antes de la siguiente)', () => {
    const data = buildExportDataFromNombres([
      { nombre: 'Cat A', nombres: ['P1', 'P2', 'P3'] },
      { nombre: 'Cat B', nombres: ['P1', 'P2'] },
      { nombre: 'Cat C', nombres: ['P1', 'P2', 'P3', 'P4'] },
    ])

    const todos = data.categorias.flatMap(ordenesPeleables)
    expect(todos).toEqual(Array.from({ length: todos.length }, (_, i) => i + 1))

    const [a, b, c] = data.categorias.map(ordenesPeleables)
    expect(Math.max(...a)).toBeLessThan(Math.min(...b))
    expect(Math.max(...b)).toBeLessThan(Math.min(...c))
  })

  it('genera PDF buffer para 10 categorías demo', async () => {
    const cats = Array.from({ length: 10 }, (_, i) => ({
      nombre: `Cat ${i + 1}`,
      nombres: Array.from({ length: i + 2 }, (_, j) => `P${j + 1}`),
    }))
    const data = buildExportDataFromNombres(cats)
    for (const cat of data.categorias) {
      const v = validatePlayersForPdf(cat)
      expect(v.ok).toBe(true)
      expect(categoriaExportablePdf(cat)).toBe(true)
    }
    const buf = await buildBracketPdfBuffer(data, null)
    expect(buf.length).toBeGreaterThan(5000)
  })
})
