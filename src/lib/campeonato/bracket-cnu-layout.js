/** Layout árbol CNU para Excel/PDF — columnas de ronda con conectores */

import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'

const ROWS_PER_MATCH = 4

function fmtCombate(num, cancha) {
  if (!num) return ''
  const n = String(num).padStart(2, '0')
  return cancha ? `${cancha}/${n}` : n
}

/** @returns {{ rows: number, cols: number, cells: Map<string, CellSpec>, merges: string[] }} */
export function layoutCnuBracket(porRonda, { cancha } = {}) {
  const cols = columnasBracket(porRonda)
  if (!cols.length) return null

  const numMatches0 = cols[0].combates.length
  const numRows = numMatches0 * ROWS_PER_MATCH
  const bracketCols = cols.length * 2 + 1
  const totalCols = 3 + bracketCols

  const cells = new Map()
  const merges = []

  const set = (r, c, spec) => {
    cells.set(`${r},${c}`, spec)
  }

  // Fila de "salida" (donde sale el ganador) de cada combate. Para ronda 0 es
  // la fila central entre chung (mi*4) y hong (mi*4+2) → mi*4+1.
  const outRow = (roundIdx, mi) => {
    const span = ROWS_PER_MATCH * Math.pow(2, roundIdx)
    return mi * span + span / 2 - 1
  }

  // Combina bordes en una celda sin perder los previos
  const addBorder = (r, c, b) => {
    const prev = cells.get(`${r},${c}`) || {}
    const border = { ...(prev.border || {}), ...b }
    cells.set(`${r},${c}`, { ...prev, border })
  }

  cols[0].combates.forEach((m, mi) => {
    const rTop = mi * ROWS_PER_MATCH
    const rBot = rTop + 2
    const rMid = rTop + 1
    const seedA = mi * 2 + 1
    const seedB = mi * 2 + 2

    set(rTop, 0, { v: seedA, align: 'center', bold: true, bg: 'white' })
    set(rTop, 1, { v: m.chung?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.chung?.vacio, chung: true })
    set(rTop, 2, { v: m.chung?.academia || '', bg: 'gray', small: true })

    set(rBot, 0, { v: seedB, align: 'center', bold: true, bg: 'white' })
    set(rBot, 1, { v: m.hong?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.hong?.vacio, hong: true })
    set(rBot, 2, { v: m.hong?.academia || '', bg: 'gray', small: true })

    const col0 = 3
    // Vertical completo de rTop a rBot + tapas horizontales
    for (let r = rTop; r <= rBot; r++) addBorder(r, col0, { right: true })
    addBorder(rTop, col0, { top: true })
    addBorder(rBot, col0, { bottom: true })

    if (m.numero_combate) {
      set(rMid, col0, { v: fmtCombate(m.numero_combate, cancha), align: 'center', bold: true, matchNo: true, border: { right: true } })
    }
  })

  cols.forEach((col, roundIdx) => {
    if (roundIdx === 0) return
    const colBase = 3 + roundIdx * 2
    const gapCol = colBase - 1

    col.combates.forEach((m, mi) => {
      const vTop = outRow(roundIdx - 1, mi * 2)       // salida del feeder superior
      const vBot = outRow(roundIdx - 1, mi * 2 + 1)   // salida del feeder inferior
      const mid = outRow(roundIdx, mi)

      // Brazos horizontales: del feeder hasta la vertical de este combate
      addBorder(vTop, gapCol, { bottom: true })
      addBorder(vBot, gapCol, { bottom: true })

      // Vertical completo de vTop a vBot (sin huecos)
      for (let r = vTop; r <= vBot; r++) addBorder(r, colBase, { right: true })

      const label = m.chung?.vacio && m.hong?.vacio ? 'POR DEFINIR' : m.chung?.nombre || m.hong?.nombre || 'POR DEFINIR'
      if (roundIdx === cols.length - 1) {
        set(mid, 1, { v: label, bold: false, italic: true, bg: 'white' })
      }

      if (m.numero_combate) {
        const prev = cells.get(`${mid},${colBase}`) || {}
        set(mid, colBase, { ...prev, v: fmtCombate(m.numero_combate, cancha), align: 'center', bold: true, matchNo: true })
      }
    })
  })

  return { rows: numRows, cols: totalCols, cells, merges, bracketCols: cols }
}

export function participantesPrimeraRonda(porRonda) {
  const rondas = rondasOrdenadas(porRonda)
  if (!rondas.length) return []
  const primera = rondas[0]
  const out = []
  for (const m of (porRonda[primera] || []).filter((x) => x.estado !== 'vacío' && x.estado !== 'bye').sort((a, b) => a.match_numero - b.match_numero)) {
    out.push(m.competidor1, m.competidor2)
  }
  return out
}

export { ROWS_PER_MATCH }
