import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport, porRondaFiltrado } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda, ROWS_PER_MATCH, outRowCenter, layoutCnuBracket, countPlayersInEntradas, COL_SEED, COL_NAME, COL_TEAM, COL_BRACKET } from '@/lib/campeonato/bracket-cnu-layout'
import { WT_LOGO_PNG, ACADEMIA_LOGO_PNG } from '@/lib/campeonato/pdf-logos'
import { BUCKET, extractStoragePath } from '@/lib/campeonato/foto-competidor'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const LINE = [55, 55, 55]
const GOLD = [180, 83, 9]
const GOLD_LIGHT = [255, 251, 235]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]
const BOX_FILL = [248, 249, 251]
/** Identificador del motor de llaves Kyorugi (PDF). */
export const ACBRACKET_VERSION = 'ACBRACKET 1.0'

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function blockTieneJugador(entry) {
  if (!entry || entry.vacio) return false
  if (entry.es_bye) {
    const p = entry.chung?.vacio === false ? entry.chung : entry.hong
    return Boolean(p && !p.vacio)
  }
  return Boolean(
    (entry.chung && !entry.chung.vacio) || (entry.hong && !entry.hong.vacio)
  )
}

/** Profundidad de conectores: al menos cols.length - 1 o niveles del árbol. */
export function connectorDepth(numBlocks, cols) {
  const fromCols = Math.max(0, (cols?.length ?? 0) - 1)
  let fromBlocks = 0
  let n = numBlocks
  while (n > 1) {
    fromBlocks++
    n /= 2
  }
  return Math.max(fromCols, fromBlocks, numBlocks > 1 ? 1 : 0)
}

/** ¿El subárbol del feeder tiene algún jugador activo? */
export function mergeFeederActive(roundIdx, feedIdx, numBlocks, entradas) {
  if (roundIdx < 1 || feedIdx < 0) return false
  // En la 1.ª columna de conectores, feedIdx es índice de bloque directo
  if (roundIdx === 1) {
    if (feedIdx >= numBlocks) return false
    return blockTieneJugador(entradas[feedIdx])
  }
  const blocksPerFeeder = 2 ** (roundIdx - 1)
  const blockStart = feedIdx * blocksPerFeeder
  const blockEnd = Math.min(blockStart + blocksPerFeeder - 1, numBlocks - 1)
  for (let bi = blockStart; bi <= blockEnd; bi++) {
    if (blockTieneJugador(entradas[bi])) return true
  }
  return false
}

/** Y en mm desde fila del grid CNU (misma fórmula que layoutCnuBracket). */
export function yFromOutRow(rowIdx, layout) {
  return layout.treeTop + (rowIdx + 0.5) * layout.rowH
}

/** Posiciones de conectores del bloque bi en la 1.ª columna del árbol. */
export function blockFeederYs(bi, layout) {
  const rTop = bi * ROWS_PER_MATCH
  const rBot = rTop + 2
  const rMid = outRowCenter(0, bi)
  return {
    yTop: yFromOutRow(rTop, layout),
    yBot: yFromOutRow(rBot, layout),
    yMid: yFromOutRow(rMid, layout),
  }
}

/** Posiciones yTop/yBot/yMid para un cruce en roundIdx (columna cols[roundIdx]). */
export function mergeFeederYs(roundIdx, mi, numBlocks, layout) {
  const levelBlockCount = numBlocks / 2 ** (roundIdx - 1)
  const feedA = mi * 2
  const feedB = mi * 2 + 1
  const yTop = yFromOutRow(outRowCenter(roundIdx - 1, feedA), layout)
  const yBot = feedB < levelBlockCount
    ? yFromOutRow(outRowCenter(roundIdx - 1, feedB), layout)
    : yTop
  const yMid = yFromOutRow(outRowCenter(roundIdx, mi), layout)
  return { yTop, yBot, yMid }
}

function drawHeaderLogos(doc, pageW) {
  // WT logo left, academia logo right. Aliases keep a single embed reused on every page.
  try {
    doc.addImage(WT_LOGO_PNG, 'PNG', 10, 2.5, 30, 13.7, 'wtLogo', 'FAST')
  } catch (_) {}
  try {
    doc.addImage(ACADEMIA_LOGO_PNG, 'PNG', pageW - 10 - 15, 2, 15, 15, 'acLogo', 'FAST')
  } catch (_) {}
}

function drawHeader(doc, campeonato, cat, pageW) {
  drawHeaderLogos(doc, pageW)

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(trunc(doc, campeonato?.nombre || 'Campeonato', pageW - 90), pageW / 2, 9, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const subtitle = [cat.nombre, cat.cancha ? `Área ${cat.cancha}` : null, cat.inscritos ? `${cat.inscritos} competidores` : null].filter(Boolean).join(' · ')
  doc.text(trunc(doc, subtitle, pageW - 90), pageW / 2, 15, { align: 'center' })

  if (campeonato?.fecha_inicio) {
    const f = new Date(campeonato.fecha_inicio)
    doc.setFontSize(8)
    doc.text(
      f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }),
      pageW / 2,
      20,
      { align: 'center' }
    )
  }

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.35)
  doc.line(10, 23, pageW - 10, 23)
}

function measureFightBadge(doc, area, num, fontSize = 9) {
  if (!num) return { w: 0, h: 0, label: '' }
  const label = area ? `${area}/${String(num).padStart(2, '0')}` : String(num)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const w = Math.max(14, doc.getTextWidth(label) + 7)
  const h = fontSize * 0.55 + 4.5
  return { w, h, label }
}

function drawFightBadge(doc, x, y, area, num, fontSize = 9) {
  const { w, h, label } = measureFightBadge(doc, area, num, fontSize)
  if (!label) return { w: 0, h: 0 }

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.45)
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 1.8, 1.8, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  doc.setTextColor(...DARK)
  doc.text(label, x, y + fontSize * 0.12, { align: 'center' })
  return { w, h }
}

function colorSideFrom(slot) {
  if (slot?.color === 'rojo') return 'rojo'
  if (slot?.color === 'azul') return 'azul'
  return null
}

function drawCompetidorBox(doc, x, y, w, h, slot, { colorSide = null, logoCache = {} } = {}) {
  const vacio = slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const label = (slot?.nombre || 'POR DEFINIR').toUpperCase()
  const side = colorSide || colorSideFrom(slot)
  const barW = Math.min(3.4, w * 0.065)
  const logoPath = extractStoragePath(slot?.academia_logo)
  const logo = logoPath ? logoCache[logoPath] : null
  const logoW = logo ? Math.min(7.5, h * 0.82) : 0
  const textMaxW = w - barW - 5 - (logoW ? logoW + 2.5 : 0)

  doc.setFillColor(...BOX_FILL)
  doc.setDrawColor(160, 165, 175)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y, w, h, 1.8, 1.8, 'FD')

  if (!vacio && side === 'azul') {
    doc.setFillColor(...CHUNG)
    doc.rect(x, y, barW, h, 'F')
  } else if (!vacio && side === 'rojo') {
    doc.setFillColor(...HONG)
    doc.rect(x, y, barW, h, 'F')
  }

  if (logo && logoW > 0) {
    try {
      doc.addImage(logo.dataUrl, logo.format, x + w - logoW - 1.5, y + (h - logoW) / 2, logoW, logoW, logo.alias, 'FAST')
    } catch (_) {}
  }

  const nameX = x + barW + 2.5
  doc.setFont('helvetica', 'bold')
  const hasAcademia = !vacio && slot?.academia && h >= 7.5
  const nameSize = Math.max(5.5, h * (hasAcademia ? 0.38 : 0.46))
  doc.setFontSize(nameSize)
  if (side === 'azul') doc.setTextColor(...CHUNG)
  else if (side === 'rojo') doc.setTextColor(...HONG)
  else doc.setTextColor(...DARK)
  doc.text(trunc(doc, label, textMaxW), nameX, y + (hasAcademia ? h * 0.38 : h * 0.6))

  if (hasAcademia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(4.2, h * 0.26))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, textMaxW), nameX, y + h - 1.6)
  }
}

function line(doc, x1, y1, x2, y2) {
  if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) return
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.4)
  doc.line(x1, y1, x2, y2)
}

function rowsEnBloque(entry) {
  return ROWS_PER_MATCH
}

export function buildRowMap(entradas) {
  const blockStartRow = []
  let total = 0
  for (let bi = 0; bi < entradas.length; bi++) {
    blockStartRow[bi] = total
    total += rowsEnBloque(entradas[bi])
  }
  return { blockStartRow, totalRows: total }
}

export function yFromRow(row, layout) {
  return layout.treeTop + (row + 0.5) * layout.rowH
}

export function yCenterBlock(bi, layout) {
  const start = layout.blockStartRow[bi]
  const span = rowsEnBloque(layout.entradas[bi])
  return yFromRow(start + span / 2 - 0.5, layout)
}

export function yCenterMerge(roundIdx, mi, layout) {
  return yFromOutRow(outRowCenter(roundIdx, mi), layout)
}

export function mergesEnRonda(numBlocks, roundIdx) {
  return Math.max(1, numBlocks / 2 ** (roundIdx + 1))
}

/** Altura máxima del contenido del bracket (mm) para no invadir footer ni siguiente categoría. */
export function maxBracketContentY(layout, cols) {
  const { treeTop, rowH, boxH, pairGap, entradas, numBlocks } = layout
  let maxY = treeTop

  for (let bi = 0; bi < numBlocks; bi++) {
    if (!blockTieneJugador(entradas[bi])) continue
    const { yTop, yBot, yMid } = blockFeederYs(bi, layout)
    if (entradas[bi].es_bye) {
      maxY = Math.max(maxY, yMid + boxH / 2)
    } else {
      maxY = Math.max(maxY, yBot + boxH / 2)
    }
  }

  const finalIdx = Math.max(0, cols.length - 1)
  const yFinal = yFromOutRow(outRowCenter(finalIdx, 0), layout)
  const winH = Math.max(boxH * 2 + pairGap + 10, 26)
  maxY = Math.max(maxY, yFinal + winH / 2)

  return maxY
}

export function calcLayout(cols, numBlocks, entradas, pageW, pageH) {
  const marginT = 27
  const marginB = 11
  const maxContentBottom = pageH - marginB - 2
  const availH = pageH - marginT - marginB
  const { blockStartRow, totalRows } = buildRowMap(entradas)
  const depth = connectorDepth(numBlocks, cols)
  const numRounds = Math.max(cols.length, depth > 0 ? depth : 1)

  let rowH = availH / totalRows
  while (rowH * totalRows > availH && rowH > 2.5) rowH *= 0.92

  const maxPairH = ROWS_PER_MATCH * rowH * 0.9
  let pairGap = Math.max(3, rowH * 0.55)
  let boxH = Math.min(Math.max(5, (maxPairH - pairGap) / 2), 11.5)
  if (boxH * 2 + pairGap > maxPairH) {
    boxH = Math.max(4.5, (maxPairH - 2) / 2)
    pairGap = Math.max(2.5, maxPairH - boxH * 2)
  }

  // Re-escalar si cajas de nombre o cuadro WINNER sobrepasan el área útil
  for (let guard = 0; guard < 24; guard++) {
    const treeH = totalRows * rowH
    const treeTop = marginT + Math.max(0, (availH - treeH) / 2)
    const probe = {
      marginL: 10,
      marginT,
      treeTop,
      rowH,
      boxW: 52,
      boxH,
      pairGap,
      roundColW: 17,
      numBlocks,
      totalRows,
      blockStartRow,
      entradas,
    }
    if (maxBracketContentY(probe, cols) <= maxContentBottom) break
    rowH *= 0.92
    const nextMaxPairH = ROWS_PER_MATCH * rowH * 0.9
    pairGap = Math.max(2.5, rowH * 0.5)
    boxH = Math.min(Math.max(4.2, (nextMaxPairH - pairGap) / 2), 10.5)
    if (boxH * 2 + pairGap > nextMaxPairH) {
      boxH = Math.max(4, (nextMaxPairH - 2) / 2)
      pairGap = Math.max(2, nextMaxPairH - boxH * 2)
    }
  }

  const treeH = totalRows * rowH
  const treeTop = marginT + Math.max(0, (availH - treeH) / 2)

  const marginL = 10
  const winW = 46
  const nameColW = 56
  const availW = pageW - marginL - 10
  const roundColW = Math.max(17, (availW - nameColW - winW - 8) / (numRounds + 0.55))
  const boxW = nameColW - 4

  const nameX = marginL
  const stubX = nameX + boxW + 5
  const roundX = Array.from({ length: numRounds }, (_, i) => stubX + 12 + roundColW * (i + 0.52))
  const winnerX = stubX + 12 + roundColW * (numRounds + 0.38)
  const fightFont = numBlocks > 12 ? 7 : numBlocks > 8 ? 8 : 9

  return {
    marginL,
    marginT,
    treeTop,
    rowH,
    boxW,
    boxH,
    pairGap,
    roundColW,
    nameX,
    stubX,
    roundX,
    winnerX,
    winW,
    fightFont,
    numBlocks,
    numRounds,
    totalRows,
    blockStartRow,
    entradas,
  }
}

/** Salida horizontal con hueco para el badge (evita línea atravesando el número). */
function lineToNextWithBadgeGap(doc, xFrom, y, xTo, badgeW) {
  if (xTo <= xFrom + 0.5) return (xFrom + xTo) / 2
  const gap = Math.max(badgeW + 2, 8)
  const span = xTo - xFrom
  if (span <= gap + 4) {
    line(doc, xFrom, y, xTo, y)
    return (xFrom + xTo) / 2
  }
  const xStart = xFrom + Math.max(2, (span - gap) * 0.38)
  const xEnd = xStart + gap
  line(doc, xFrom, y, xStart, y)
  line(doc, xEnd, y, xTo, y)
  return (xStart + xEnd) / 2
}

/** Conector CNU: T completa, passthrough (bye) o feeder único. */
export function drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, badgeW = 0, opts = {}) {
  const { activeTop = true, activeBot = true } = opts
  if (!activeTop && !activeBot) return null

  const sameLevel = Math.abs(yTop - yBot) < 0.5
  const singleFeeder = !activeTop || !activeBot || sameLevel

  if (singleFeeder) {
    const y = activeTop && activeBot ? yMid : activeTop ? yTop : yBot
    line(doc, xPrev, y, xVert, y)
    const bx = lineToNextWithBadgeGap(doc, xVert, y, xNext, badgeW)
    return { x: bx, y }
  }

  line(doc, xPrev, yTop, xVert, yTop)
  line(doc, xPrev, yBot, xVert, yBot)
  line(doc, xVert, yTop, xVert, yBot)
  const bx = lineToNextWithBadgeGap(doc, xVert, yMid, xNext, badgeW)
  return { x: bx, y: yMid }
}

function drawTreeConnectors(doc, layout, cols, numBlocks, entradas, cat, badgeByNum) {
  const { roundX, winnerX, roundColW, fightFont } = layout
  const depth = connectorDepth(numBlocks, cols)

  for (let level = 1; level <= depth; level++) {
    const merges = Math.max(1, numBlocks / 2 ** level)
    const colIdx = Math.min(level, cols.length - 1)
    const col = cols[colIdx]
    const xPrev = roundX[Math.min(level - 1, roundX.length - 1)]
    const xVert = roundX[Math.min(level, roundX.length - 1)]
    const xGap = xVert - roundColW * 0.32
    const xNext = level >= depth
      ? winnerX
      : roundX[Math.min(level + 1, roundX.length - 1)] - roundColW * 0.32

    for (let mi = 0; mi < merges; mi++) {
      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const { yTop, yBot, yMid } = mergeFeederYs(level, mi, numBlocks, layout)
      const activeTop = mergeFeederActive(level, feedA, numBlocks, entradas)
      const activeBot = mergeFeederActive(level, feedB, numBlocks, entradas)
      const combate = col?.combates?.[mi]
      if (!activeTop && !activeBot) {
        if (!combate?.numero_combate) continue
        queueBadge(badgeByNum, {
          x: xVert - roundColW * 0.08,
          y: yMid,
          num: combate.numero_combate,
        })
        continue
      }
      const badgeSize = combate?.numero_combate
        ? measureFightBadge(doc, cat.cancha, combate.numero_combate, fightFont)
        : { w: 0 }
      const pos = drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, badgeSize.w, {
        activeTop,
        activeBot,
      })
      if (combate?.numero_combate) {
        const bx = pos?.x ?? xVert - roundColW * 0.08
        const by = pos?.y ?? yMid
        queueBadge(badgeByNum, { x: bx, y: by, num: combate.numero_combate })
      }
    }
  }
}

/** Coloca badges de combates que no se dibujaron en conectores/brazos. */
function ensureAllBadgesPlaced(cols, layout, numBlocks, badgeByNum) {
  const { roundX, roundColW } = layout
  for (let colIdx = 0; colIdx < cols.length; colIdx++) {
    cols[colIdx].combates.forEach((combate, mi) => {
      if (!combate?.numero_combate || badgeByNum.has(Number(combate.numero_combate))) return
      let x
      let y
      if (colIdx === 0) {
        const blockIdx = Math.min((combate.match_numero || mi + 1) - 1, numBlocks - 1)
        const { yMid } = blockFeederYs(blockIdx, layout)
        x = roundX[0] - roundColW * 0.08
        y = yMid
      } else {
        const { yMid } = mergeFeederYs(colIdx, mi, numBlocks, layout)
        x = roundX[Math.min(colIdx, roundX.length - 1)] - roundColW * 0.08
        y = yMid
      }
      queueBadge(badgeByNum, { x, y, num: combate.numero_combate })
    })
  }
}

function queueBadge(badgeByNum, { num, x, y }) {
  if (num == null || num === '') return
  const key = Number(num)
  if (!Number.isFinite(key)) return
  if (!badgeByNum.has(key)) badgeByNum.set(key, { x, y, num: key })
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { nameX, roundX, winnerX } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', nameX, y)
  roundX.forEach((x, i) => {
    const label = cols[i]?.label ?? ''
    if (label) doc.text(label, x, y, { align: 'center' })
  })
  doc.text('Winner', winnerX + layout.winW / 2, y, { align: 'center' })
}

function drawWinnerBox(doc, x, yCenter, layout, nombre) {
  const { winW, boxH, pairGap } = layout
  const winH = Math.max(boxH * 2 + pairGap + 10, 26)
  const yWin = yCenter - winH / 2

  doc.setFillColor(...GOLD_LIGHT)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.3)
  doc.roundedRect(x, yWin, winW, winH, 3, 3, 'FD')

  doc.setFillColor(...GOLD)
  doc.rect(x, yWin, winW, 8.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('WINNER', x + winW / 2, yWin + 5.8, { align: 'center' })

  const label = (nombre || 'POR DEFINIR').toUpperCase()
  const vacio = !nombre || label === 'POR DEFINIR'
  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  doc.setFontSize(vacio ? 8 : 10)
  doc.setTextColor(...(vacio ? GRAY : DARK))
  doc.text(trunc(doc, label, winW - 10), x + winW / 2, yWin + winH / 2 + 3, { align: 'center' })
}

function blockPlayerYs(bi, layout) {
  const { yTop, yBot, yMid } = blockFeederYs(bi, layout)
  const { boxH, pairGap } = layout
  const yChung = yTop - boxH / 2
  const yArmTop = yTop
  const yArmBot = yChung + boxH + pairGap + boxH / 2
  return {
    yTop,
    yBot,
    yMid,
    yArmTop,
    yArmBot,
    yChung,
    pairH: boxH * 2 + pairGap,
  }
}

export function categoriaExportablePdf(cat) {
  const entradas = entradasPrimeraRonda(cat?.porRonda, { inscritos: cat?.inscritos })
  const rondas = rondasOrdenadas(cat?.porRonda)
  if (!rondas.length || !entradas.length) return false
  return entradas.some((e) => blockTieneJugador(e))
}

export { countPlayersInEntradas }

function isVertCol(c) {
  return c >= COL_BRACKET && (c - COL_BRACKET) % 2 === 0
}

function isGapCol(c) {
  return c >= COL_BRACKET && (c - COL_BRACKET) % 2 === 1
}

/** Geometría PDF: columnas vert (anchas) y gap (estrechas) como el Excel CNU. */
export function calcPdfGeometryFromCnu(cnuLayout, pageW, pageH) {
  const marginT = 27
  const marginB = 11
  const maxContentBottom = pageH - marginB - 2
  const availH = pageH - marginT - marginB
  const rows = cnuLayout.rows
  const totalCols = cnuLayout.cols

  let rowH = availH / rows
  while (rowH * rows > availH && rowH > 2.2) rowH *= 0.92

  let boxH = Math.min(Math.max(4.5, ROWS_PER_MATCH * rowH * 0.22), 11)
  let pairGap = Math.max(2, rowH * 0.45)

  for (let guard = 0; guard < 24; guard++) {
    const treeTop = marginT + Math.max(0, (availH - rows * rowH) / 2)
    const lastRow = rows - 1
    const yBottom = treeTop + (lastRow + 0.5) * rowH + boxH / 2
    const yWin = treeTop + (outRowCenter(Math.max(0, cnuLayout.bracketCols.length - 1), 0) + 0.5) * rowH
    const winH = Math.max(boxH * 2 + pairGap + 10, 26)
    if (Math.max(yBottom, yWin + winH / 2) <= maxContentBottom) break
    rowH *= 0.92
    boxH = Math.min(Math.max(4, ROWS_PER_MATCH * rowH * 0.2), 10)
    pairGap = Math.max(1.8, rowH * 0.4)
  }

  const treeTop = marginT + Math.max(0, (availH - rows * rowH) / 2)
  const marginL = 10
  const winW = 46
  const nameX = marginL
  const boxW = 52
  const nameExit = nameX + boxW
  const winnerX = pageW - marginL - winW
  const bracketStart = nameExit + 6

  let numVert = 0
  let numGap = 0
  for (let c = COL_BRACKET; c < totalCols; c++) {
    if (isVertCol(c)) numVert++
    else numGap++
  }

  const gapW = 4.5
  const vertW = Math.max(11, (winnerX - bracketStart - numGap * gapW) / Math.max(1, numVert))
  const xLeft = new Array(totalCols)
  const xRight = new Array(totalCols)
  const xMid = new Array(totalCols)

  xLeft[COL_SEED] = nameX
  xRight[COL_SEED] = nameX
  xLeft[COL_NAME] = nameX
  xRight[COL_NAME] = nameX + boxW
  xLeft[COL_TEAM] = nameX
  xRight[COL_TEAM] = nameX + boxW

  let x = bracketStart
  for (let c = COL_BRACKET; c < totalCols; c++) {
    const w = isVertCol(c) ? vertW : gapW
    xLeft[c] = x
    xRight[c] = x + w
    xMid[c] = x + w / 2
    x += w
  }

  const fightFont = rows > 48 ? 7 : rows > 32 ? 8 : 9
  const yRow = (r) => treeTop + (r + 0.5) * rowH

  const vertCols = []
  for (let c = COL_BRACKET; c < totalCols; c++) {
    if (isVertCol(c)) vertCols.push(c)
  }

  return {
    marginT,
    treeTop,
    rowH,
    boxW,
    boxH,
    pairGap,
    nameX,
    nameExit,
    winnerX,
    winW,
    fightFont,
    bracketStart,
    vertW,
    gapW,
    yRow,
    xLeft,
    xRight,
    xMid,
    vertCols,
    totalCols,
  }
}


function vertColIndex(level) {
  return COL_BRACKET + level * 2
}

function connectorXsFromGeom(geom, level, depth, colsLen) {
  const vi = Math.min(Math.max(0, level), Math.max(0, colsLen - 1))
  const viPrev = Math.min(Math.max(0, level - 1), Math.max(0, colsLen - 1))
  const vertCol = Math.min(vertColIndex(vi), geom.totalCols - 1)
  const prevVertCol = Math.min(vertColIndex(viPrev), geom.totalCols - 1)
  const gapAfter = Math.min(vertCol + 1, geom.totalCols - 1)
  return {
    xPrev: geom.xRight[prevVertCol] ?? geom.nameExit,
    xGap: geom.xLeft[vertCol] ?? geom.xRight[prevVertCol],
    xVert: geom.xRight[vertCol] ?? geom.winnerX,
    xNext: level >= depth ? geom.winnerX : (geom.xRight[gapAfter] ?? geom.winnerX),
  }
}

function queueBadgeOut(badgesOut, num, x, y) {
  if (num == null || num === '') return
  const key = Number(num)
  if (!Number.isFinite(key)) return
  if (!badgesOut.some((b) => b.num === key)) badgesOut.push({ x, y, num: key })
}

/** Brazos 1.ª ronda: name → stub → vertical col 3. */
function drawBlockArmsCnu(doc, bi, geom, entradas, cat, badgesOut) {
  const entry = entradas[bi]
  if (!blockTieneJugador(entry)) return

  const { yTop, yBot, yMid } = blockFeederYs(bi, geom)
  const xVert = geom.xRight[COL_BRACKET]
  const xStub = geom.nameExit + 4

  if (entry.es_bye) {
    line(doc, geom.nameExit, yMid, xVert, yMid)
    if (entry.numero_combate) {
      queueBadgeOut(badgesOut, entry.numero_combate, geom.xMid[COL_BRACKET], yMid)
    }
    return
  }

  line(doc, geom.nameExit, yTop, xStub, yTop)
  line(doc, geom.nameExit, yBot, xStub, yBot)
  line(doc, xStub, yTop, xVert, yTop)
  line(doc, xStub, yBot, xVert, yBot)
  line(doc, xVert, yTop, xVert, yBot)

  if (entry.numero_combate) {
    queueBadgeOut(badgesOut, entry.numero_combate, geom.xMid[COL_BRACKET], yMid)
  }
}

function drawFinalArmToWinnerCnu(doc, geom, cols, entradas, cat, badgesOut) {
  const finalMatch = cols[cols.length - 1]?.combates?.[0]
  if (!finalMatch?.numero_combate) return
  const { yMid } = blockFeederYs(0, geom)
  // 2 comp: badge ya en col Final (drawBlockArmsCnu); línea continua sin hueco
  line(doc, geom.xRight[COL_BRACKET], yMid, geom.winnerX, yMid)
}

function drawTreeConnectorsCnu(doc, geom, cols, numBlocks, entradas, cat, badgesOut) {
  const depth = connectorDepth(numBlocks, cols)

  for (let level = 1; level <= depth; level++) {
    const vi = Math.min(level, Math.max(0, cols.length - 1))
    const viPrev = Math.min(level - 1, Math.max(0, cols.length - 1))
    if (vertColIndex(vi) === vertColIndex(viPrev)) continue

    const merges = Math.max(1, numBlocks / 2 ** level)
    const colIdx = Math.min(level, cols.length - 1)
    const col = cols[colIdx]
    const { xPrev, xGap, xVert, xNext } = connectorXsFromGeom(geom, level, depth, cols.length)

    if (xNext <= xVert + 0.5) continue

    for (let mi = 0; mi < merges; mi++) {
      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const { yTop, yBot, yMid } = mergeFeederYs(level, mi, numBlocks, geom)
      const activeTop = mergeFeederActive(level, feedA, numBlocks, entradas)
      const activeBot = mergeFeederActive(level, feedB, numBlocks, entradas)
      const combate = col?.combates?.[mi]

      if (!activeTop && !activeBot) {
        if (combate?.numero_combate) {
          queueBadgeOut(badgesOut, combate.numero_combate, geom.xMid[Math.min(vertColIndex(level), geom.totalCols - 1)], yMid)
        }
        continue
      }

      const badgeSize = combate?.numero_combate
        ? measureFightBadge(doc, cat.cancha, combate.numero_combate, geom.fightFont)
        : { w: 0 }

      const pos = drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, badgeSize.w, {
        activeTop,
        activeBot,
      })

      if (combate?.numero_combate) {
        queueBadgeOut(badgesOut, combate.numero_combate, pos?.x ?? geom.xMid[Math.min(vertColIndex(level), geom.totalCols - 1)], pos?.y ?? yMid)
      }
    }
  }
}

function ensureAllBadgesCnu(cols, geom, numBlocks, badgesOut) {
  for (let colIdx = 0; colIdx < cols.length; colIdx++) {
    cols[colIdx].combates.forEach((combate, mi) => {
      if (!combate?.numero_combate) return
      const num = Number(combate.numero_combate)
      if (badgesOut.some((b) => b.num === num)) return
      let x
      let y
      if (colIdx === 0) {
        const blockIdx = Math.min((combate.match_numero || mi + 1) - 1, numBlocks - 1)
        const { yMid } = blockFeederYs(blockIdx, geom)
        x = geom.xMid[COL_BRACKET]
        y = yMid
      } else {
        const { yMid } = mergeFeederYs(colIdx, mi, numBlocks, geom)
        x = geom.xMid[Math.min(vertColIndex(colIdx), geom.totalCols - 1)]
        y = yMid
      }
      queueBadgeOut(badgesOut, num, x, y)
    })
  }
}

/** Dibuja conectores con lógica semántica (bye, slots vacíos, T-merge). */
export function drawConnectorsSemantic(doc, geom, cnuLayout, entradas, { cat, badgesOut = [] } = {}) {
  const cols = cnuLayout.bracketCols
  const numBlocks = entradas.length

  for (let bi = 0; bi < numBlocks; bi++) {
    drawBlockArmsCnu(doc, bi, geom, entradas, cat, badgesOut)
  }

  drawTreeConnectorsCnu(doc, geom, cols, numBlocks, entradas, cat, badgesOut)

  const depth = connectorDepth(numBlocks, cols)
  if (numBlocks === 1 && cols.length >= 1 && depth === 0) {
    drawFinalArmToWinnerCnu(doc, geom, cols, entradas, cat, badgesOut)
  }

  ensureAllBadgesCnu(cols, geom, numBlocks, badgesOut)
}

/** @deprecated Usar drawConnectorsSemantic — conservado para tests legacy. */
export function drawBordersFromCnuLayout(doc, cnuLayout, geom, entradas, opts = {}) {
  drawConnectorsSemantic(doc, geom, cnuLayout, entradas, opts)
}

function parseBadgeLabel(raw, cancha) {
  const s = String(raw || '').trim()
  if (!s) return null
  const m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return { num: Number(m[2]), area: Number(m[1]) || cancha }
  const n = Number(s)
  if (Number.isFinite(n)) return { num: n, area: cancha }
  return null
}

function drawColumnHeadersFromLayout(doc, cnuLayout, geom) {
  const labels = cnuLayout.roundLabels || []
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', geom.nameX, geom.marginT - 3)
  let bracketIdx = 0
  for (let i = 1; i < labels.length - 1; i++) {
    const col = COL_BRACKET + bracketIdx * 2
    doc.text(labels[i], geom.xMid[col], geom.marginT - 3, { align: 'center' })
    bracketIdx++
  }
  doc.text('Winner', geom.winnerX + geom.winW / 2, geom.marginT - 3, { align: 'center' })
}

/** Dibuja nombres desde layout CNU; retorna conteo de jugadores. */
export function drawContentFromCnuLayout(doc, cnuLayout, geom, { cat, logoCache = {}, entradas }) {
  let playersDrawn = 0
  const { nameX, boxW, boxH } = geom

  for (let bi = 0; bi < entradas.length; bi++) {
    const entry = entradas[bi]
    if (!blockTieneJugador(entry)) continue
    const rTop = bi * ROWS_PER_MATCH
    const rBot = rTop + 2

    if (entry.es_bye) {
      const player = entry.chung?.vacio === false ? entry.chung : entry.hong
      const rMid = outRowCenter(0, bi)
      if (player && !player.vacio) {
        drawCompetidorBox(doc, nameX, geom.yRow(rMid) - boxH / 2, boxW, boxH, player, {
          colorSide: player.color === 'rojo' ? 'rojo' : 'azul',
          logoCache,
        })
        playersDrawn++
      }
      continue
    }

    if (entry.chung && !entry.chung.vacio) {
      drawCompetidorBox(doc, nameX, geom.yRow(rTop) - boxH / 2, boxW, boxH, entry.chung, {
        colorSide: entry.chung.color || 'azul',
        logoCache,
      })
      playersDrawn++
    }
    if (entry.hong && !entry.hong.vacio) {
      drawCompetidorBox(doc, nameX, geom.yRow(rBot) - boxH / 2, boxW, boxH, entry.hong, {
        colorSide: entry.hong.color || 'rojo',
        logoCache,
      })
      playersDrawn++
    }
  }

  return { playersDrawn }
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210, logoCache = {} } = {}) {
  const porRonda = porRondaFiltrado(cat.porRonda, cat.inscritos)
  const cnuLayout = layoutCnuBracket(porRonda, { cancha: cat.cancha, inscritos: cat.inscritos })
  if (!cnuLayout?.entradas?.length) return false
  if (!cnuLayout.entradas.some((e) => blockTieneJugador(e))) return false

  const entradas = cnuLayout.entradas
  const cols = cnuLayout.bracketCols
  if (!cols?.length) return false

  drawHeader(doc, campeonato, cat, pageW)
  const geom = calcPdfGeometryFromCnu(cnuLayout, pageW, pageH)

  drawColumnHeadersFromLayout(doc, cnuLayout, geom)

  const badgesOut = []
  drawConnectorsSemantic(doc, geom, cnuLayout, entradas, { cat, badgesOut })

  const { playersDrawn } = drawContentFromCnuLayout(doc, cnuLayout, geom, {
    cat,
    logoCache,
    entradas,
  })

  const finalIdx = Math.max(0, cols.length - 1)
  const yFinal = geom.yRow(outRowCenter(finalIdx, 0))
  const finalMatchWin = cols[finalIdx]?.combates?.[0]
  drawWinnerBox(doc, geom.winnerX, yFinal, geom, finalMatchWin?.ganador)

  for (const b of badgesOut) {
    drawFightBadge(doc, b.x, b.y, cat.cancha, b.num, geom.fightFont)
  }

  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(`${ACBRACKET_VERSION} · ACCTKD · Taekwondo FestCup · World Taekwondo`, pageW / 2, pageH - 6, { align: 'center' })
  return true
}

/** Valida que entradas del layout incluyen todos los inscritos. */
export function validatePlayersForPdf(cat) {
  const porRonda = porRondaFiltrado(cat.porRonda, cat.inscritos)
  const cnuLayout = layoutCnuBracket(porRonda, { cancha: cat.cancha, inscritos: cat.inscritos })
  if (!cnuLayout?.entradas) return { ok: false, expected: cat.inscritos || 0, actual: 0 }
  const actual = countPlayersInEntradas(cnuLayout.entradas)
  const expected = cat.inscritos ?? actual
  return { ok: actual === expected, expected, actual }
}

function collectLogoPathsFromCategorias(categorias) {
  const paths = new Set()
  for (const cat of categorias || []) {
    for (const lista of Object.values(cat.porRonda || {})) {
      for (const m of lista || []) {
        for (const c of [m.competidor1, m.competidor2]) {
          const p = extractStoragePath(c?.academia_logo)
          if (p) paths.add(p)
        }
      }
    }
  }
  return [...paths]
}

export async function loadAcademiaLogosForPdf(sb, categorias) {
  const paths = collectLogoPathsFromCategorias(categorias)
  const cache = {}
  let aliasIdx = 0
  for (const path of paths) {
    try {
      const { data, error } = await sb.storage.from(BUCKET).download(path)
      if (error || !data) continue
      const buf = Buffer.from(await data.arrayBuffer())
      const format = path.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG'
      cache[path] = {
        format,
        dataUrl: `data:image/${format === 'PNG' ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`,
        alias: `acl${aliasIdx++}`,
      }
    } catch (_) {}
  }
  return cache
}

export async function buildBracketPdfBuffer(data, sb, { idCategoria = null, cancha = null } = {}) {
  let cats = categoriasOrdenadasExport(data.categorias || [])
  if (idCategoria) cats = cats.filter((c) => c.id_categoria === idCategoria)
  if (cancha != null) cats = cats.filter((c) => Number(c.cancha) === Number(cancha))
  cats = cats.filter(categoriaExportablePdf)
  if (!cats.length) throw new Error('No hay llaves generadas para exportar')

  const logoCache = sb ? await loadAcademiaLogosForPdf(sb, cats) : {}

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  let firstPage = true
  for (const cat of cats) {
    if (!firstPage) doc.addPage()
    const drew = dibujarBracketCategoriaPdf(doc, data.campeonato, cat, { pageW, pageH, logoCache })
    if (drew) {
      firstPage = false
    } else if (!firstPage) {
      doc.deletePage(doc.getNumberOfPages())
    }
  }

  if (firstPage) throw new Error('No hay llaves generadas para exportar')

  return Buffer.from(doc.output('arraybuffer'))
}

export async function descargarLlavesBracketPdf(data) {
  const buffer = await buildBracketPdfBuffer(data, null)
  const camp = data.campeonato?.nombre || 'Campeonato'
  const slug = (camp || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)

  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llaves-graficas-${slug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function descargarCategoriaBracketPdf(data, idCategoria) {
  const buffer = await buildBracketPdfBuffer(data, null, { idCategoria })
  const cat = (data.categorias || []).find((c) => c.id_categoria === idCategoria)
  const slug = (cat?.nombre || 'categoria')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 40)

  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llave-${slug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
