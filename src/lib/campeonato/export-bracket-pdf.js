import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda, ROWS_PER_MATCH } from '@/lib/campeonato/bracket-cnu-layout'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
const GOLD_LIGHT = [255, 251, 235]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]
const LAYOUT_VERSION = 'v5'

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

function mergeBlockRange(roundIdx, mergeIdx) {
  const span = 2 ** (roundIdx + 1)
  return { first: mergeIdx * span, last: mergeIdx * span + span - 1 }
}

function mergeTieneJugadores(entradas, roundIdx, mergeIdx) {
  const { first, last } = mergeBlockRange(roundIdx, mergeIdx)
  for (let bi = first; bi <= last && bi < entradas.length; bi++) {
    if (blockTieneJugador(entradas[bi])) return true
  }
  return false
}

function feederActivo(roundIdx, feedMi, entradas, numBlocks) {
  if (roundIdx === 1) {
    return feedMi < numBlocks && blockTieneJugador(entradas[feedMi])
  }
  return mergeTieneJugadores(entradas, roundIdx - 2, feedMi)
}

function roundMatchActivo(roundIdx, mi, entradas, numBlocks) {
  const feedA = mi * 2
  const feedB = mi * 2 + 1
  const levelPrev = numBlocks / 2 ** (roundIdx - 1)
  const topA = feederActivo(roundIdx, feedA, entradas, numBlocks)
  const botA = feedB < levelPrev && feederActivo(roundIdx, feedB, entradas, numBlocks)
  return topA || botA
}

function drawHeader(doc, campeonato, cat, pageW) {
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(trunc(doc, campeonato?.nombre || 'Campeonato', pageW - 24), pageW / 2, 9, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const subtitle = [cat.nombre, cat.cancha ? `Área ${cat.cancha}` : null, cat.inscritos ? `${cat.inscritos} competidores` : null].filter(Boolean).join(' · ')
  doc.text(trunc(doc, subtitle, pageW - 24), pageW / 2, 15, { align: 'center' })

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

  doc.setDrawColor(180, 180, 180)
  doc.line(10, 23, pageW - 10, 23)
}

function drawFightBadge(doc, x, y, area, num, fontSize = 9) {
  if (!num) return
  const label = area ? `${area}/${String(num).padStart(2, '0')}` : String(num)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const w = Math.max(14, doc.getTextWidth(label) + 6)
  const h = fontSize * 0.55 + 4
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.5)
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 1.5, 1.5, 'FD')
  doc.setTextColor(...DARK)
  doc.text(label, x, y + fontSize * 0.12, { align: 'center' })
}

function colorSideFrom(slot) {
  if (slot?.color === 'rojo') return 'rojo'
  if (slot?.color === 'azul') return 'azul'
  return null
}

function drawCompetidorBox(doc, x, y, w, h, slot, { colorSide = null } = {}) {
  const vacio = slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const label = (slot?.nombre || 'POR DEFINIR').toUpperCase()
  const side = colorSide || colorSideFrom(slot)
  const barW = Math.min(3.2, w * 0.06)

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(0.35)
  doc.roundedRect(x, y, w, h, 1.2, 1.2, 'FD')

  if (!vacio && side === 'azul') {
    doc.setFillColor(...CHUNG)
    doc.rect(x, y, barW, h, 'F')
  } else if (!vacio && side === 'rojo') {
    doc.setFillColor(...HONG)
    doc.rect(x, y, barW, h, 'F')
  }

  const nameX = x + barW + 2
  doc.setFont('helvetica', 'bold')
  const hasAcademia = !vacio && slot?.academia && h >= 7
  const nameSize = Math.max(5.5, h * (hasAcademia ? 0.38 : 0.46))
  doc.setFontSize(nameSize)
  if (side === 'azul') doc.setTextColor(...CHUNG)
  else if (side === 'rojo') doc.setTextColor(...HONG)
  else doc.setTextColor(...DARK)
  doc.text(trunc(doc, label, w - barW - 4), nameX, y + (hasAcademia ? h * 0.38 : h * 0.6))

  if (hasAcademia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(4, h * 0.26))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, w - barW - 4), nameX, y + h - 1.5)
  }
}

function line(doc, x1, y1, x2, y2) {
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.45)
  doc.line(x1, y1, x2, y2)
}

function rowsEnBloque(entry) {
  return blockTieneJugador(entry) ? ROWS_PER_MATCH : 1
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
  const spanBlocks = 2 ** roundIdx
  const first = mi * spanBlocks
  const last = Math.min(first + spanBlocks - 1, layout.numBlocks - 1)
  if (first > last) return yCenterBlock(first, layout)
  const start = layout.blockStartRow[first]
  const end = layout.blockStartRow[last] + rowsEnBloque(layout.entradas[last])
  return yFromRow((start + end) / 2 - 0.5, layout)
}

export function mergesEnRonda(numBlocks, roundIdx) {
  return Math.max(1, numBlocks / 2 ** (roundIdx + 1))
}

export function calcLayout(cols, numBlocks, entradas, pageW, pageH) {
  const marginT = 26
  const marginB = 10
  const availH = pageH - marginT - marginB
  const { blockStartRow, totalRows } = buildRowMap(entradas)
  const numRounds = cols.length

  let rowH = availH / totalRows
  while (rowH * totalRows > availH && rowH > 2.6) rowH *= 0.92

  const maxPairH = ROWS_PER_MATCH * rowH * 0.92
  let pairGap = Math.max(2.5, rowH * 0.5)
  let boxH = Math.min(Math.max(4.5, (maxPairH - pairGap) / 2), 11)
  if (boxH * 2 + pairGap > maxPairH) {
    boxH = Math.max(4.5, (maxPairH - 2) / 2)
    pairGap = Math.max(2, maxPairH - boxH * 2)
  }

  const treeH = totalRows * rowH
  const treeTop = marginT + Math.max(0, (availH - treeH) / 2)

  const marginL = 10
  const winW = 44
  const nameColW = 54
  const availW = pageW - marginL - 10
  const roundColW = Math.max(16, (availW - nameColW - winW - 6) / (numRounds + 0.5))
  const boxW = nameColW - 4

  const nameX = marginL
  const stubX = nameX + boxW + 4
  const roundX = Array.from({ length: numRounds }, (_, i) => stubX + 10 + roundColW * (i + 0.55))
  const winnerX = stubX + 10 + roundColW * (numRounds + 0.35)
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

/** Conector estilo CNU / tournamentmgr: horizontales + vertical solo entre dos feeders activos */
function drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, { topA, botA }) {
  if (!topA && !botA) return

  const ySingle = topA ? yTop : yBot
  const pareja = topA && botA && Math.abs(yTop - yBot) > 0.6

  if (!pareja) {
    line(doc, xPrev, ySingle, xNext, ySingle)
    return
  }

  line(doc, xPrev, yTop, xGap, yTop)
  line(doc, xPrev, yBot, xGap, yBot)
  line(doc, xGap, yTop, xVert, yTop)
  line(doc, xVert, yTop, xVert, yBot)
  line(doc, xGap, yBot, xVert, yBot)
  line(doc, xVert, yMid, xNext, yMid)
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { nameX, roundX, winnerX } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', nameX, y)
  cols.forEach((col, i) => {
    doc.text(col.label, roundX[i] - 6, y)
  })
  doc.text('Winner', winnerX + 4, y)
}

function drawWinnerBox(doc, x, yCenter, layout, nombre) {
  const { winW, boxH, pairGap } = layout
  const winH = Math.max(boxH * 2 + pairGap + 8, 24)
  const yWin = yCenter - winH / 2

  doc.setFillColor(...GOLD_LIGHT)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.4)
  doc.roundedRect(x, yWin, winW, winH, 3, 3, 'FD')

  doc.setFillColor(...GOLD)
  doc.rect(x, yWin, winW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('WINNER', x + winW / 2, yWin + 5.5, { align: 'center' })

  const label = (nombre || 'POR DEFINIR').toUpperCase()
  const vacio = !nombre || label === 'POR DEFINIR'
  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  doc.setFontSize(vacio ? 8 : 10)
  doc.setTextColor(...(vacio ? GRAY : DARK))
  doc.text(trunc(doc, label, winW - 10), x + winW / 2, yWin + winH / 2 + 3, { align: 'center' })
}

function blockPlayerYs(bi, layout) {
  const start = layout.blockStartRow[bi]
  const span = rowsEnBloque(layout.entradas[bi])
  const blockTop = layout.treeTop + start * layout.rowH
  const blockH = span * layout.rowH
  const { boxH, pairGap } = layout
  const pairH = boxH * 2 + pairGap
  const yChung = blockTop + (blockH - pairH) / 2
  const yMid = yCenterBlock(bi, layout)
  return {
    yTop: yChung + boxH / 2,
    yBot: yChung + boxH + pairGap + boxH / 2,
    yMid,
    yChung,
    pairH,
  }
}

function drawBlockArms(doc, bi, layout, entradas, cat, fightFont) {
  const { nameX, boxW, stubX, roundX } = layout
  const entry = entradas[bi]
  if (!blockTieneJugador(entry)) return

  const { yTop, yBot, yMid } = blockPlayerYs(bi, layout)
  const xVert = roundX[0]
  const xArmEnd = stubX + 3

  if (entry.es_bye) {
    line(doc, nameX + boxW, yMid, xVert, yMid)
    return
  }

  line(doc, nameX + boxW, yTop, xArmEnd, yTop)
  line(doc, nameX + boxW, yBot, xArmEnd, yBot)
  line(doc, xArmEnd, yTop, xVert, yTop)
  line(doc, xVert, yTop, xVert, yBot)
  line(doc, xArmEnd, yBot, xVert, yBot)

  if (entry.numero_combate) {
    drawFightBadge(doc, xVert - layout.roundColW * 0.12, yMid, cat.cancha, entry.numero_combate, fightFont)
  }
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const entradas = entradasPrimeraRonda(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length || !entradas.length) return

  const numBlocks = entradas.length

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, numBlocks, entradas, pageW, pageH)
  const { nameX, boxW, boxH, pairGap, roundX, winnerX, fightFont } = layout

  drawColumnHeaders(doc, cols, layout, layout.marginT - 4)

  for (let bi = 0; bi < numBlocks; bi++) {
    drawBlockArms(doc, bi, layout, entradas, cat, fightFont)
  }

  for (let roundIdx = 1; roundIdx < cols.length; roundIdx++) {
    const col = cols[roundIdx]
    const levelPrev = numBlocks / 2 ** (roundIdx - 1)
    const xPrev = roundX[roundIdx - 1]
    const xGap = roundX[roundIdx] - layout.roundColW * 0.35
    const xVert = roundX[roundIdx]
    const xNext = roundIdx < cols.length - 1 ? roundX[roundIdx + 1] - layout.roundColW * 0.35 : winnerX

    col.combates.forEach((combate, mi) => {
      if (!roundMatchActivo(roundIdx, mi, entradas, numBlocks)) return

      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const yTop = roundIdx === 1 ? yCenterBlock(feedA, layout) : yCenterMerge(roundIdx - 1, feedA, layout)
      const yBot = feedB < levelPrev
        ? (roundIdx === 1 ? yCenterBlock(feedB, layout) : yCenterMerge(roundIdx - 1, feedB, layout))
        : yTop
      const yMid = yCenterMerge(roundIdx, mi, layout)
      const topA = feederActivo(roundIdx, feedA, entradas, numBlocks)
      const botA = feedB < levelPrev && feederActivo(roundIdx, feedB, entradas, numBlocks)

      drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, { topA, botA })

      if (combate?.numero_combate) {
        drawFightBadge(doc, xVert, yMid, cat.cancha, combate.numero_combate, fightFont)
      }
    })
  }

  entradas.forEach((entry, bi) => {
    if (!blockTieneJugador(entry)) return
    const { yChung, pairH, yMid } = blockPlayerYs(bi, layout)

    if (entry.es_bye) {
      const player = entry.chung?.vacio === false ? entry.chung : entry.hong
      if (player && !player.vacio) {
        drawCompetidorBox(doc, nameX, yMid - boxH / 2, boxW, boxH, player, { colorSide: player.color || 'azul' })
      }
      return
    }

    if (entry.chung && !entry.chung.vacio) {
      drawCompetidorBox(doc, nameX, yChung, boxW, boxH, entry.chung, { colorSide: entry.chung.color || 'azul' })
    }
    if (entry.hong && !entry.hong.vacio) {
      drawCompetidorBox(doc, nameX, yChung + boxH + pairGap, boxW, boxH, entry.hong, { colorSide: entry.hong.color || 'rojo' })
    }
  })

  const finalIdx = cols.length - 1
  if (roundMatchActivo(finalIdx, 0, entradas, numBlocks)) {
    const finalMatch = cols[finalIdx]?.combates[0]
    const yFinal = yCenterMerge(finalIdx, 0, layout)
    drawWinnerBox(doc, winnerX, yFinal, layout, finalMatch?.ganador)
  }

  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(`ACCTKD · World Taekwondo · ${LAYOUT_VERSION}`, pageW / 2, pageH - 6, { align: 'center' })
}

export function buildBracketPdfBuffer(data, { idCategoria = null } = {}) {
  let cats = categoriasOrdenadasExport(data.categorias || [])
  if (idCategoria) cats = cats.filter((c) => c.id_categoria === idCategoria)
  if (!cats.length) throw new Error('No hay llaves generadas para exportar')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  cats.forEach((cat, i) => {
    if (i > 0) doc.addPage()
    dibujarBracketCategoriaPdf(doc, data.campeonato, cat, { pageW, pageH })
  })

  return Buffer.from(doc.output('arraybuffer'))
}

export function descargarLlavesBracketPdf(data) {
  const buffer = buildBracketPdfBuffer(data)
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

export function descargarCategoriaBracketPdf(data, idCategoria) {
  const buffer = buildBracketPdfBuffer(data, { idCategoria })
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
