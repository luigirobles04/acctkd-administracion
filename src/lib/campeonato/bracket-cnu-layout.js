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

  cols[0].combates.forEach((m, mi) => {
    const rTop = mi * ROWS_PER_MATCH
    const rBot = rTop + 2
    const seedA = mi * 2 + 1
    const seedB = mi * 2 + 2

    set(rTop, 0, { v: seedA, align: 'center', bold: true, bg: 'white' })
    set(rTop, 1, { v: m.chung?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.chung?.vacio, chung: true })
    set(rTop, 2, { v: m.chung?.academia || '', bg: 'gray', small: true })

    set(rBot, 0, { v: seedB, align: 'center', bold: true, bg: 'white' })
    set(rBot, 1, { v: m.hong?.nombre || 'POR DEFINIR', bold: true, bg: 'gray', italic: m.hong?.vacio, hong: true })
    set(rBot, 2, { v: m.hong?.academia || '', bg: 'gray', small: true })

    const col0 = 3
    set(rTop, col0, { border: { top: true, right: true } })
    set(rTop + 1, col0, { border: { right: true } })
    set(rBot, col0, { border: { bottom: true, right: true } })

    if (m.numero_combate) {
      set(rTop + 1, col0, { v: fmtCombate(m.numero_combate, cancha), align: 'center', bold: true, matchNo: true })
    }
  })

  cols.forEach((col, roundIdx) => {
    if (roundIdx === 0) return
    const colBase = 3 + roundIdx * 2
    const span = ROWS_PER_MATCH * Math.pow(2, roundIdx)

    col.combates.forEach((m, mi) => {
      const blockTop = mi * span
      const mid = blockTop + Math.floor(span / 2) - 1
      const rTop = blockTop
      const rBot = blockTop + span - 2

      set(rTop, colBase, { border: { top: true, right: true } })
      set(mid, colBase, { border: { right: true } })
      set(rBot, colBase, { border: { bottom: true, right: true } })

      if (colBase > 3) {
        set(rTop, colBase - 1, { border: { top: true } })
        set(rBot, colBase - 1, { border: { bottom: true } })
        set(mid, colBase - 1, { border: { right: true } })
      }

      const label = m.chung?.vacio && m.hong?.vacio ? 'POR DEFINIR' : m.chung?.nombre || m.hong?.nombre || 'POR DEFINIR'
      if (roundIdx === cols.length - 1) {
        set(mid, 1, { v: label, bold: false, italic: true, bg: 'white' })
      }

      if (m.numero_combate) {
        set(mid, colBase, { v: fmtCombate(m.numero_combate, cancha), align: 'center', bold: true, matchNo: true })
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
