import { describe, it, expect } from 'vitest'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'
import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'
import {
  calcLayout,
  drawCnuConnector,
  mergeFeederYs,
  blockFeederYs,
  dibujarBracketCategoriaPdf,
} from '@/lib/campeonato/export-bracket-pdf'

function makePartialPorRonda(nPlayers, maxR) {
  const bracketSize = 2 ** maxR
  const slots = bracketSize / 2
  const porRonda = {}
  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = Array.from({ length: count }, (_, i) => ({
      ronda: r,
      match_numero: i + 1,
      orden_llave: r === maxR ? i + 1 : i + 10,
      estado: r === maxR && i * 2 >= nPlayers ? 'vacío' : 'pendiente',
      es_bye: false,
      competidor1: r === maxR && i * 2 < nPlayers
        ? { id_linea: i * 2 + 1, nombres: `A${i * 2 + 1}`, academia: 'Club' }
        : null,
      competidor2: r === maxR && i * 2 + 1 < nPlayers
        ? { id_linea: i * 2 + 2, nombres: `A${i * 2 + 2}`, academia: 'Club' }
        : null,
      color1: 'azul',
      color2: 'rojo',
    }))
  }
  return { porRonda, slots }
}

function mockDoc() {
  const state = { lineCount: 0 }
  const doc = {
    setDrawColor: () => {},
    setLineWidth: () => {},
    line: () => { state.lineCount++ },
  }
  return { doc, state }
}

describe('drawCnuConnector', () => {
  it('dibuja T completa para dos feeders', () => {
    const { doc, state } = mockDoc()
    const before = state.lineCount
    drawCnuConnector(doc, 50, 60, 70, 90, 20, 40, 30, 0)
    expect(state.lineCount - before).toBeGreaterThanOrEqual(6)
  })

  it('dibuja passthrough para bye (mismo nivel)', () => {
    const { doc, state } = mockDoc()
    const before = state.lineCount
    drawCnuConnector(doc, 50, 60, 70, 90, 25, 25, 25, 0)
    expect(state.lineCount - before).toBeGreaterThanOrEqual(3)
  })
})

describe('mergeFeederYs alineado con layoutCnuBracket', () => {
  for (const n of [3, 4, 5, 6, 7, 8, 10]) {
    it(`${n} competidores: todos los cruces de rondas tienen yMid distinto`, () => {
      const maxR = Math.ceil(Math.log2(n))
      const { porRonda } = makePartialPorRonda(n, maxR)
      const entradas = entradasPrimeraRonda(porRonda)
      const cols = columnasBracket(porRonda, { inscritos: n, numBlocks: entradas.length })
      const layout = calcLayout(cols, entradas.length, entradas, 297, 210)

      for (let roundIdx = 1; roundIdx < cols.length; roundIdx++) {
        for (let mi = 0; mi < cols[roundIdx].combates.length; mi++) {
          const { yTop, yBot, yMid } = mergeFeederYs(roundIdx, mi, entradas.length, layout)
          expect(yMid).toBeGreaterThan(0)
          if (Math.abs(yTop - yBot) > 0.5) {
            expect(yMid).toBeGreaterThan(Math.min(yTop, yBot))
            expect(yMid).toBeLessThan(Math.max(yTop, yBot))
          }
        }
      }
    })
  }
})

describe('dibujarBracketCategoriaPdf conectores', () => {
  for (const [n, label] of [[3, '3 comp'], [4, '4 comp'], [7, '7 comp'], [10, '10 comp']]) {
    it(`genera PDF con líneas para ${label}`, async () => {
      const { jsPDF } = await import('jspdf')
      const maxR = Math.ceil(Math.log2(n))
      const { porRonda } = makePartialPorRonda(n, maxR)
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      let lines = 0
      const orig = doc.line.bind(doc)
      doc.line = (...args) => { lines++; return orig(...args) }

      const ok = dibujarBracketCategoriaPdf(
        doc,
        { nombre: 'Test', fecha_inicio: '2026-08-15' },
        { nombre: label, cancha: 1, inscritos: n, porRonda },
        { pageW: 297, pageH: 210 }
      )
      expect(ok).toBe(true)
      // Árbol mínimo: brazos jugadores + al menos un conector inter-ronda + winner
      expect(lines).toBeGreaterThan(n * 2)
    })
  }
})
