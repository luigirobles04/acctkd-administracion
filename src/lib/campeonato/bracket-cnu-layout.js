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

  const setValue = (r, c, spec) => {
    const key = `${r},${c}`
    const prev = cells.get(key) || {}
    cells.set(key, { ...prev, ...spec })
  }

  const addBorder = (r, c, b) => {
    const key = `${r},${c}`
    const prev = cells.get(key) || {}
    const border = { ...(prev.border || {}), ...b }
    cells.set(key, { ...prev, border })
  }

  const outRow = (roundIdx, mi) => {
    const span = ROWS_PER_MATCH * Math.pow(2, roundIdx)
    return mi * span + span / 2 - 1
  }

  cols[0].combates.forEach((m, mi) => {
    const rTop = mi * ROWS_PER_MATCH
    const rBot = rTop + 2
    const rMid = rTop + 1
    const seedA = mi * 2 + 1
    const seedB = mi * 2 + 2

    setValue(rTop, 0, { v: seedA, align: 'center', bold: true, bg: 'white' })
    setValue(rTop, 1, { v: m.chung?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.chung?.vacio, chung: true })
    setValue(rTop, 2, { v: m.chung?.academia || '', bg: 'gray', small: true })

    setValue(rBot, 0, { v: seedB, align: 'center', bold: true, bg: 'white' })
    setValue(rBot, 1, { v: m.hong?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.hong?.vacio, hong: true })
    setValue(rBot, 2, { v: m.hong?.academia || '', bg: 'gray', small: true })

    const col0 = 3
    for (let r = rTop; r <= rBot; r++) addBorder(r, col0, { right: true })
    addBorder(rTop, col0, { top: true })
    addBorder(rBot, col0, { bottom: true })

    if (m.numero_combate) {
      setValue(rMid, col0, {
        v: fmtCombate(m.numero_combate, cancha),
        align: 'center',
        bold: true,
        matchNo: true,
      })
    }
  })

  cols.forEach((col, roundIdx) => {
    if (roundIdx === 0) return
    const colBase = 3 + roundIdx * 2
    const gapCol = colBase - 1
    const prevCol = colBase - 2
    const prevCount = cols[roundIdx - 1].combates.length

    col.combates.forEach((m, mi) => {
      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const vTop = outRow(roundIdx - 1, feedA)
      const vBot = feedB < prevCount ? outRow(roundIdx - 1, feedB) : vTop
      const mid = outRow(roundIdx, mi)

      // Brazos horizontales desde la vertical anterior
      for (const r of [vTop, vBot]) {
        addBorder(r, prevCol, { bottom: true })
        addBorder(r, gapCol, { bottom: true })
      }

      // Vertical de vTop a vBot (si hay un solo feeder, tramo mínimo)
      const rStart = Math.min(vTop, vBot)
      const rEnd = Math.max(vTop, vBot)
      for (let r = rStart; r <= rEnd; r++) addBorder(r, colBase, { right: true })
      addBorder(rStart, colBase, { top: true })
      addBorder(rEnd, colBase, { bottom: true })

      // Línea horizontal de salida hacia la siguiente ronda (si existe)
      if (roundIdx < cols.length - 1) {
        addBorder(mid, colBase, { bottom: true })
      }

      const label = m.chung?.vacio && m.hong?.vacio ? 'POR DEFINIR' : m.chung?.nombre || m.hong?.nombre || 'POR DEFINIR'
      if (roundIdx === cols.length - 1) {
        setValue(mid, 1, { v: label, bold: false, italic: true, bg: 'white' })
      }

      if (m.numero_combate) {
        setValue(mid, colBase, {
          v: fmtCombate(m.numero_combate, cancha),
          align: 'center',
          bold: true,
          matchNo: true,
        })
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
