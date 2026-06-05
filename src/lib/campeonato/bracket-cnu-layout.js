/** Layout árbol CNU (Campeonato Nacional Universitario) — como PDF oficial */

import { columnasBracket, colorByeEnBloque, rondasOrdenadas } from '@/lib/campeonato/bracket-export'

const ROWS_PER_MATCH = 4
const COL_SEED = 0
const COL_NAME = 1
const COL_TEAM = 2
const COL_BRACKET = 3

function fmtCombate(num, cancha) {
  if (!num) return ''
  const n = String(num).padStart(2, '0')
  return cancha ? `${cancha}/${n}` : n
}

function slotFromRaw(c, color = null) {
  if (!c?.nombres && !c?.id_linea) return { nombre: 'POR DEFINIR', academia: '', vacio: true, color }
  return { nombre: (c.nombres || 'POR DEFINIR').toUpperCase(), academia: c.academia || '', vacio: false, color }
}

/** Primera ronda completa: combates reales + byes (pasan directo a la siguiente ronda) */
export function entradasPrimeraRonda(porRonda) {
  const rondas = rondasOrdenadas(porRonda)
  if (!rondas.length) return []
  const maxR = rondas[0]
  const lista = (porRonda[maxR] || []).sort((a, b) => a.match_numero - b.match_numero)
  const expectedSlots = Math.pow(2, maxR - 1)
  const byMatch = new Map(lista.map((m) => [m.match_numero, m]))
  const out = []

  for (let mn = 1; mn <= expectedSlots; mn++) {
    const m = byMatch.get(mn)
    if (!m || m.estado === 'vacío') {
      out.push({
        es_bye: false,
        vacio: true,
        numero_combate: '',
        chung: slotFromRaw(null),
        hong: slotFromRaw(null),
      })
      continue
    }
    out.push({
      es_bye: Boolean(m.es_bye),
      vacio: false,
      numero_combate: m.es_bye ? '' : (m.orden_bracket || m.orden_pista || ''),
      chung: slotFromRaw(m.competidor1, m.color1 || (m.es_bye ? colorByeEnBloque(mn) : 'azul')),
      hong: m.es_bye ? null : slotFromRaw(m.competidor2, m.color2 || 'rojo'),
    })
  }

  return out
}

/** Brazo horizontal desde la fila del jugador hacia la columna del conector */
function armFromPlayer(addBorder, row, toCol) {
  for (let c = COL_NAME; c <= toCol; c++) addBorder(row, c, { bottom: true })
}

/** @returns {{ rows: number, cols: number, cells: Map<string, CellSpec>, merges: string[], roundLabels: string[] }} */
export function layoutCnuBracket(porRonda, { cancha } = {}) {
  const cols = columnasBracket(porRonda)
  const entradas = entradasPrimeraRonda(porRonda)
  if (!cols.length || !entradas.length) return null

  const numBlocks0 = entradas.length
  const numRows = numBlocks0 * ROWS_PER_MATCH
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
    cells.set(key, { ...prev, border: { ...(prev.border || {}), ...b } })
  }

  const outRow = (roundIdx, mi) => {
    const span = ROWS_PER_MATCH * 2 ** roundIdx
    return mi * span + span / 2 - 1
  }

  const drawPlayer = (r, p, seed, { chung = true, hong = false } = {}) => {
    setValue(r, COL_SEED, { v: seed, align: 'center', bold: true, bg: 'white' })
    setValue(r, COL_NAME, {
      v: p?.nombre || 'POR DEFINIR',
      bold: true,
      bg: 'gray',
      italic: p?.vacio,
      chung,
      hong,
      mergeAcademy: true,
    })
    setValue(r, COL_TEAM, { v: p?.academia || '', bg: 'gray', small: true, mergeAcademy: true })
    armFromPlayer(addBorder, r, COL_TEAM)
  }

  let seed = 1

  // ── Columna Name/Team + conector 1.ª ronda ──
  entradas.forEach((entry, bi) => {
    const rTop = bi * ROWS_PER_MATCH
    const rBot = rTop + 2
    const rMid = rTop + 1
    const center = outRow(0, bi)

    if (entry.es_bye) {
      const p = entry.chung?.vacio === false ? entry.chung : entry.hong
      const hong = p?.color === 'rojo'
      drawPlayer(rTop, p, seed++, { chung: !hong, hong })
      armFromPlayer(addBorder, center, COL_BRACKET)
      return
    }

    drawPlayer(rTop, entry.chung, seed++, { chung: true })
    drawPlayer(rBot, entry.hong, seed++, { hong: true })

    for (let r = rTop; r <= rBot; r++) addBorder(r, COL_BRACKET, { right: true })
    addBorder(rTop, COL_BRACKET, { top: true })
    addBorder(rBot, COL_BRACKET, { bottom: true })

    if (entry.numero_combate) {
      setValue(rMid, COL_BRACKET, {
        v: fmtCombate(entry.numero_combate, cancha),
        align: 'center',
        bold: true,
        matchNo: true,
      })
    }
  })

  // ── Rondas siguientes ──
  cols.forEach((col, roundIdx) => {
    if (roundIdx === 0) return

    const colBase = COL_BRACKET + roundIdx * 2
    const gapCol = colBase - 1
    const prevCol = colBase - 2
    const levelBlockCount = numBlocks0 / 2 ** (roundIdx - 1)

    col.combates.forEach((m, mi) => {
      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const vTop = outRow(roundIdx - 1, feedA)
      const vBot = feedB < levelBlockCount ? outRow(roundIdx - 1, feedB) : vTop
      const mid = outRow(roundIdx, mi)

      // Brazos horizontales (como PDF: línea desde cada feeder hacia la vertical)
      for (const r of [vTop, vBot]) {
        addBorder(r, prevCol, { bottom: true })
        addBorder(r, gapCol, { bottom: true })
      }

      const rStart = Math.min(vTop, vBot)
      const rEnd = Math.max(vTop, vBot)
      for (let r = rStart; r <= rEnd; r++) addBorder(r, colBase, { right: true })
      addBorder(rStart, colBase, { top: true })
      addBorder(rEnd, colBase, { bottom: true })

      // Salida hacia siguiente ronda (o Winner)
      addBorder(mid, colBase, { bottom: true })
      if (roundIdx === cols.length - 1) {
        addBorder(mid, colBase + 1, { bottom: true })
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

  for (let r = 0; r < numRows; r++) {
    if (cells.get(`${r},${COL_NAME}`)?.mergeAcademy) {
      merges.push(`B${r + 1}:C${r + 1}`)
    }
  }

  const roundLabels = ['Name / Team', ...cols.map((c) => c.label), 'Winner']

  return { rows: numRows, cols: totalCols, cells, merges, bracketCols: cols, roundLabels }
}

export function participantesPrimeraRonda(porRonda) {
  const rondas = rondasOrdenadas(porRonda)
  if (!rondas.length) return []
  const primera = rondas[0]
  const out = []
  for (const m of (porRonda[primera] || [])
    .filter((x) => x.estado !== 'vacío' && x.estado !== 'bye')
    .sort((a, b) => a.match_numero - b.match_numero)) {
    out.push(m.competidor1, m.competidor2)
  }
  return out
}

/** Fila central de un bloque o merge (misma fórmula que layoutCnuBracket) */
export function outRowCenter(roundIdx, mi) {
  const span = ROWS_PER_MATCH * 2 ** roundIdx
  return mi * span + span / 2 - 1
}

export { ROWS_PER_MATCH }
