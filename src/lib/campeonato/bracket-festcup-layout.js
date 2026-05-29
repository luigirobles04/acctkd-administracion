/** Layout árbol estilo FESTCUP para Excel — 3 filas/combate, bordes T+B conectados */

import { columnasBracket } from '@/lib/campeonato/bracket-export'

export const ROWS_PER_MATCH = 3
const NAME_COLS = [1, 2, 3, 4, 5]
const FIRST_CONN = 6

function fmtCombate(num, cancha) {
  if (!num) return ''
  const n = String(num).padStart(2, '0')
  return cancha ? `${cancha}/${n}` : String(num)
}

function rTop(roundIdx, mi) {
  return mi * ROWS_PER_MATCH * Math.pow(2, roundIdx)
}
function rMid(roundIdx, mi) {
  return rTop(roundIdx, mi) + 1
}
function rBot(roundIdx, mi) {
  return rTop(roundIdx, mi) + 2
}

export function layoutFestcupBracket(porRonda, { cancha } = {}) {
  const cols = columnasBracket(porRonda)
  if (!cols.length) return null

  const numMatches0 = cols[0].combates.length
  const numRows = numMatches0 * ROWS_PER_MATCH
  const totalCols = FIRST_CONN + cols.length * 2

  const cells = new Map()

  const setValue = (r, c, spec) => {
    const key = `${r},${c}`
    cells.set(key, { ...(cells.get(key) || {}), ...spec })
  }

  const addBorder = (r, c, b) => {
    const key = `${r},${c}`
    const prev = cells.get(key) || {}
    cells.set(key, { ...prev, border: { ...(prev.border || {}), ...b } })
  }

  const nameBottom = (r) => NAME_COLS.forEach((c) => addBorder(r, c, { bottom: true }))
  const nameTop = (r) => NAME_COLS.forEach((c) => addBorder(r, c, { top: true }))

  // ── Ronda 0 ──
  cols[0].combates.forEach((m, mi) => {
    const rt = rTop(0, mi)
    const rm = rMid(0, mi)
    const rb = rBot(0, mi)

    setValue(rt, 0, { v: mi * 2 + 1, align: 'center', bold: true })
    setValue(rt, 1, { v: m.chung?.nombre || 'POR DEFINIR', bold: true, chung: true, italic: m.chung?.vacio })
    setValue(rt, 2, { v: m.chung?.academia || '', small: true })

    setValue(rb, 0, { v: mi * 2 + 2, align: 'center', bold: true })
    setValue(rb, 1, { v: m.hong?.nombre || 'POR DEFINIR', bold: true, hong: true, italic: m.hong?.vacio })
    setValue(rb, 2, { v: m.hong?.academia || '', small: true })

    nameBottom(rt)
    nameTop(rm)
    nameBottom(rb)

    addBorder(rm, FIRST_CONN, { top: true, right: true })
    addBorder(rb, FIRST_CONN, { bottom: true, right: true })

    if (m.numero_combate) {
      setValue(rm, FIRST_CONN, { v: fmtCombate(m.numero_combate, cancha), align: 'center', matchNo: true })
    }
  })

  // ── Rondas 1..N ──
  for (let roundIdx = 1; roundIdx < cols.length; roundIdx++) {
    const connCol = FIRST_CONN + roundIdx * 2
    const prevConn = connCol - 2
    const prevCount = cols[roundIdx - 1].combates.length

    cols[roundIdx].combates.forEach((m, mi) => {
      const feedA = mi * 2
      const feedB = mi * 2 + 1

      const rStart = rBot(roundIdx - 1, feedA)
      const rEnd = feedB < prevCount ? rMid(roundIdx - 1, feedB) : rStart

      // Número de combate de la ronda anterior (feeder inferior) en prevConn
      if (feedB < prevCount) {
        const prevMatch = cols[roundIdx - 1].combates[feedB]
        if (prevMatch?.numero_combate) {
          addBorder(rEnd, prevConn, { top: true, right: true })
          setValue(rEnd, prevConn, {
            v: fmtCombate(prevMatch.numero_combate, cancha),
            align: 'center',
            matchNo: true,
          })
        }
      }

      // Vertical nueva ronda: TR en rStart, R en medio, BR en rEnd
      addBorder(rStart, connCol, { top: true, right: true })
      if (m.numero_combate) {
        setValue(rStart, connCol, { v: fmtCombate(m.numero_combate, cancha), align: 'center', matchNo: true })
      }

      for (let r = rStart + 1; r < rEnd; r++) {
        addBorder(r, connCol, { right: true })
      }

      if (rEnd > rStart) {
        addBorder(rEnd, connCol, { bottom: true, right: true })
      }

      // Puente hacia la siguiente ronda
      if (roundIdx < cols.length - 1) {
        const rBridge = rEnd + 1
        if (rBridge < numRows) {
          addBorder(rBridge, connCol, { right: true })
          addBorder(rBridge, connCol + 1, { bottom: true, left: true })
        }
      }

      if (roundIdx === cols.length - 1) {
        const label = m.chung?.vacio && m.hong?.vacio ? 'POR DEFINIR' : m.chung?.nombre || m.hong?.nombre || 'POR DEFINIR'
        setValue(rMid(roundIdx, mi), 1, { v: label, italic: true })
      }
    })
  }

  return { rows: numRows, cols: totalCols, cells, merges: [] }
}
