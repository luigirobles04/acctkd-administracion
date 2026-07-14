import { describe, it, expect } from 'vitest'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'
import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'
import { buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import {
  calcLayout,
  drawCnuConnector,
  mergeFeederYs,
  blockFeederYs,
  dibujarBracketCategoriaPdf,
} from '@/lib/campeonato/export-bracket-pdf'

function makePartialPorRonda(nPlayers, maxR, { ordenBase = 1 } = {}) {
  const bracketSize = 2 ** maxR
  const slots = bracketSize / 2
  const porRonda = {}
  let orden = ordenBase
  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = Array.from({ length: count }, (_, i) => ({
      ronda: r,
      match_numero: i + 1,
      orden_pista: r === maxR ? orden + i : orden + slots + i,
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

/** Simula porRonda real con slots CNU (byes, play-ins 9/10 comp). */
function makeCnuPorRonda(nPlayers) {
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(nPlayers, 2)))
  const maxR = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: nPlayers }, (_, i) => ({ id: i + 1, id_linea: i + 1, nombres: `P${i + 1}`, academia: 'Club' }))]
  const slots = buildSlotsCnu(seeds, nPlayers)
  const porRonda = {}

  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = []
    for (let m = 1; m <= count; m++) {
      let id_linea1 = null
      let id_linea2 = null
      let es_bye = false
      let estado = 'pendiente'

      if (r === maxR) {
        const p1 = slots[(m - 1) * 2]
        const p2 = slots[(m - 1) * 2 + 1]
        id_linea1 = p1?.id_linea || null
        id_linea2 = p2?.id_linea || null
        if (p1 && !p2) {
          es_bye = true
          estado = 'saltado'
        } else if (!p1 && p2) {
          es_bye = true
          id_linea1 = p2.id_linea
          id_linea2 = null
          estado = 'saltado'
        } else if (!p1 && !p2) {
          estado = 'vacío'
        }
      }

      porRonda[r].push({
        ronda: r,
        match_numero: m,
        orden_pista: m + r * 100,
        estado,
        es_bye,
        competidor1: id_linea1 ? { id_linea: id_linea1, nombres: `P${id_linea1}`, academia: 'Club' } : null,
        competidor2: id_linea2 ? { id_linea: id_linea2, nombres: `P${id_linea2}`, academia: 'Club' } : null,
        color1: 'azul',
        color2: 'rojo',
      })
    }
  }
  return porRonda
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

  it('dibuja feeder único cuando activeTop es false', () => {
    const { doc, state } = mockDoc()
    const before = state.lineCount
    drawCnuConnector(doc, 50, 60, 70, 90, 20, 40, 30, 0, { activeTop: false, activeBot: true })
    expect(state.lineCount - before).toBeGreaterThanOrEqual(3)
  })

  it('no dibuja si ambos feeders inactivos', () => {
    const { doc, state } = mockDoc()
    const before = state.lineCount
    const pos = drawCnuConnector(doc, 50, 60, 70, 90, 20, 40, 30, 0, { activeTop: false, activeBot: false })
    expect(pos).toBeNull()
    expect(state.lineCount - before).toBe(0)
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

describe('columnasBracket numeración', () => {
  it('prioriza orden_pista (continuo por área) sobre orden_llave', () => {
    const porRonda = {
      2: [{
        ronda: 2,
        match_numero: 1,
        orden_pista: 47,
        orden_llave: 1,
        estado: 'pendiente',
        competidor1: { id_linea: 1, nombres: 'A' },
        competidor2: { id_linea: 2, nombres: 'B' },
        color1: 'azul',
        color2: 'rojo',
      }],
      1: [{
        ronda: 1,
        match_numero: 1,
        orden_pista: 49,
        orden_llave: 3,
        estado: 'pendiente',
        competidor1: null,
        competidor2: null,
        color1: 'azul',
        color2: 'rojo',
      }],
    }
    const cols = columnasBracket(porRonda, { inscritos: 2, numBlocks: 1 })
    expect(cols[0].combates[0].numero_combate).toBe(47)
    expect(cols[1].combates[0].numero_combate).toBe(49)
  })
})

describe('dibujarBracketCategoriaPdf conectores', () => {
  for (const [n, label] of [[3, '3 comp'], [4, '4 comp'], [6, '6 comp'], [7, '7 comp'], [9, '9 comp'], [10, '10 comp']]) {
    it(`genera PDF con líneas para ${label} (CNU slots)`, async () => {
      const { jsPDF } = await import('jspdf')
      const porRonda = makeCnuPorRonda(n)
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
      expect(lines).toBeGreaterThan(n * 2)
    })
  }
})
