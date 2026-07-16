/**
 * v19: conectores semánticos (drawCnuConnector + mergeFeederActive, sin bordes ciegos).
 */
import { describe, it, expect } from 'vitest'
import { buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque } from '@/lib/campeonato/bracket-export'
import {
  dibujarBracketCategoriaPdf,
  validatePlayersForPdf,
  drawContentFromCnuLayout,
  calcPdfGeometryFromCnu,
  drawBordersFromCnuLayout,
} from '@/lib/campeonato/export-bracket-pdf'
import { layoutCnuBracket, countPlayersInEntradas } from '@/lib/campeonato/bracket-cnu-layout'

function makeCnuPorRonda(nPlayers) {
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(nPlayers, 2)))
  const maxR = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: nPlayers }, (_, i) => ({
    id: i + 1,
    id_linea: i + 1,
    nombres: `P${i + 1}`,
    academia: 'Club',
  }))]
  const slots = buildSlotsCnu(seeds, nPlayers)
  const porRonda = {}
  let ord = 1

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
        orden_pista: estado === 'vacío' || es_bye ? 0 : ord++,
        estado,
        es_bye,
        competidor1: id_linea1
          ? { id_linea: id_linea1, nombres: `P${id_linea1}`, academia: 'Club', color: es_bye ? colorByeEnBloque(m) : 'azul' }
          : null,
        competidor2: id_linea2
          ? { id_linea: id_linea2, nombres: `P${id_linea2}`, academia: 'Club', color: 'rojo' }
          : null,
        color1: es_bye ? colorByeEnBloque(m) : 'azul',
        color2: id_linea2 ? 'rojo' : null,
      })
    }
  }
  return porRonda
}

function mockDoc() {
  const noop = () => {}
  const state = { lineCount: 0 }
  const doc = {
    setDrawColor: noop,
    setFillColor: noop,
    setLineWidth: noop,
    line: () => { state.lineCount++ },
    setFont: noop,
    setFontSize: noop,
    setTextColor: noop,
    text: noop,
    roundedRect: noop,
    rect: noop,
    addImage: noop,
    getTextWidth: () => 10,
  }
  return { doc, state }
}

describe('v19 layoutCnuBracket PDF', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    it(`${n} comp: entradas tienen ${n} jugadores`, () => {
      const porRonda = makeCnuPorRonda(n)
      const layout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
      expect(countPlayersInEntradas(layout.entradas)).toBe(n)
    })

    it(`${n} comp: validatePlayersForPdf OK`, () => {
      const porRonda = makeCnuPorRonda(n)
      const cat = { nombre: `${n} comp`, cancha: 1, inscritos: n, porRonda }
      const v = validatePlayersForPdf(cat)
      expect(v.ok).toBe(true)
      expect(v.actual).toBe(n)
    })

    it(`${n} comp: líneas llegan desde nombre hasta winner`, () => {
      const porRonda = makeCnuPorRonda(n)
      const cnuLayout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
      const geom = calcPdfGeometryFromCnu(cnuLayout, 297, 210)
      const segs = []
      const doc = {
        setDrawColor: () => {},
        setLineWidth: () => {},
        setFont: () => {},
        setFontSize: () => {},
        getTextWidth: () => 10,
        line: (x1, y1, x2, y2) => segs.push({ x1, y1, x2, y2 }),
      }
      drawBordersFromCnuLayout(doc, cnuLayout, geom, cnuLayout.entradas, { cat: { cancha: 1 } })
      const horiz = segs.filter((s) => Math.abs(s.y1 - s.y2) < 0.01)
      expect(horiz.some((s) => Math.abs(s.x1 - geom.nameExit) < 0.5)).toBe(true)
      expect(horiz.some((s) => s.x2 >= geom.winnerX - 2)).toBe(true)
      expect(segs.every((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.3)).toBe(true)
    })

    it(`${n} comp: dibuja líneas desde bordes CNU`, () => {
      const porRonda = makeCnuPorRonda(n)
      const cnuLayout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
      const geom = calcPdfGeometryFromCnu(cnuLayout, 297, 210)
      const { doc, state } = mockDoc()
      drawBordersFromCnuLayout(doc, cnuLayout, geom, cnuLayout.entradas, { cat: { cancha: 1 } })
      expect(state.lineCount).toBeGreaterThan(n)
    })

    it(`${n} comp: drawContent dibuja ${n} nombres`, () => {
      const porRonda = makeCnuPorRonda(n)
      const cnuLayout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
      const geom = calcPdfGeometryFromCnu(cnuLayout, 297, 210)
      const { doc } = mockDoc()
      const { playersDrawn } = drawContentFromCnuLayout(doc, cnuLayout, geom, {
        cat: { cancha: 1 },
        entradas: cnuLayout.entradas,
      })
      expect(playersDrawn).toBe(n)
    })
  }

  it('footer incluye v19', async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const ok = dibujarBracketCategoriaPdf(
      doc,
      { nombre: 'Test' },
      { nombre: '4 comp', cancha: 1, inscritos: 4, porRonda: makeCnuPorRonda(4) },
      { pageW: 297, pageH: 210 }
    )
    expect(ok).toBe(true)
    const pages = doc.internal.pages
    const footerPage = Array.isArray(pages[1]) ? pages[1].join(' ') : String(pages[1] || '')
    expect(footerPage).toContain('ACBRACKET 1.0')
  })
})
