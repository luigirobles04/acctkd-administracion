import { describe, it, expect } from 'vitest'
import { buildPorRondaFromNombres } from '@/lib/campeonato/bracket-from-nombres'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'
import {
  calcPdfGeometryFromCnu,
  drawConnectorsSemantic,
  connectorDepth,
  vertColIndex,
} from '@/lib/campeonato/export-bracket-pdf'

function collectLines(n) {
  const nombres = Array.from({ length: n }, (_, i) => `P${i + 1}`)
  const porRonda = buildPorRondaFromNombres(nombres)
  const layout = layoutCnuBracket(porRonda, { cancha: 1, inscritos: n })
  const geom = calcPdfGeometryFromCnu(layout, 297, 210)
  const segs = []
  const doc = {
    setDrawColor: () => {},
    setLineWidth: () => {},
    setFont: () => {},
    setFontSize: () => {},
    getTextWidth: () => 10,
    line: (x1, y1, x2, y2) => segs.push({ x1, y1, x2, y2 }),
  }
  drawConnectorsSemantic(doc, geom, layout, layout.entradas, { cat: { cancha: 1 }, badgesOut: [] })
  return { segs, geom, layout, depth: connectorDepth(layout.entradas.length, layout.bracketCols) }
}

function shortVerticals(segs, minLen = 2, maxLen = 15) {
  return segs.filter((s) => {
    if (Math.abs(s.x1 - s.x2) > 0.01) return false
    const len = Math.abs(s.y2 - s.y1)
    return len > minLen && len < maxLen
  })
}

describe('conectores sin líneas extra', () => {
  for (const n of [2, 3, 4, 5, 11]) {
    it(`${n} comp: sin vertical corta suelta en zona gap`, () => {
      const { segs, geom, depth } = collectLines(n)
      const xCol3 = geom.xRight[3]
      const xCol5 = geom.xRight[5]
      const midX = (xCol3 + xCol5) / 2

      const stray = shortVerticals(segs).filter((v) => v.x1 > xCol3 + 1 && v.x1 < xCol5 - 1)
      expect(stray.length, `depth=${depth} stray=${JSON.stringify(stray)}`).toBe(0)

      // sin segmentos horizontales duplicados superpuestos (misma y, casi mismo x)
      const horiz = segs.filter((s) => Math.abs(s.y1 - s.y2) < 0.01)
      for (let i = 0; i < horiz.length; i++) {
        for (let j = i + 1; j < horiz.length; j++) {
          const a = horiz[i]
          const b = horiz[j]
          if (Math.abs(a.y1 - b.y1) > 0.5) continue
          const overlap = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
          if (overlap > 5) {
            const same = Math.abs(a.x1 - b.x1) < 1 && Math.abs(a.x2 - b.x2) < 1
            expect(same || overlap < 20, `horiz dup y=${a.y1.toFixed(1)}`).toBe(true)
          }
        }
      }
    })
  }

  it('2 comp: una sola línea horizontal continua hacia winner', () => {
    const { segs, geom } = collectLines(2)
    const yMid = segs.find((s) => Math.abs(s.x1 - s.x2) > 0.01 && s.x2 >= geom.winnerX - 1)?.y1
    const toWinner = segs.filter(
      (s) =>
        Math.abs(s.y1 - s.y2) < 0.01 &&
        s.x2 >= geom.winnerX - 1 &&
        s.x1 >= geom.xRight[3] - 1 &&
        (yMid == null || Math.abs(s.y1 - yMid) < 1)
    )
    expect(toWinner.length).toBe(1)
    expect(toWinner[0].x1).toBeLessThanOrEqual(geom.xRight[3] + 1)
    expect(toWinner[0].x2).toBeGreaterThanOrEqual(geom.winnerX - 1)
  })
})

export { vertColIndex }
