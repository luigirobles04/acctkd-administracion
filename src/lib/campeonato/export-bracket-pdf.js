'use client'

import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
const GOLD_LIGHT = [255, 251, 235]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
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
  const w = Math.max(13, doc.getTextWidth(label) + 5)
  const h = fontSize * 0.55 + 3.5
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
  const fill = vacio ? [250, 251, 252] : [255, 255, 255]

  doc.setFillColor(...fill)
  doc.setDrawColor(vacio ? 180 : 120, vacio ? 185 : 120, vacio ? 195 : 120)
  doc.setLineWidth(0.35)
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1.2], 0)
  doc.roundedRect(x, y, w, h, 1.2, 1.2, vacio ? 'S' : 'FD')
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([], 0)

  if (!vacio && side === 'azul') {
    doc.setFillColor(...CHUNG)
    doc.rect(x, y, barW, h, 'F')
  } else if (!vacio && side === 'rojo') {
    doc.setFillColor(...HONG)
    doc.rect(x, y, barW, h, 'F')
  }

  const nameX = x + barW + 2
  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  const hasAcademia = !vacio && slot?.academia && h >= 8
  const nameSize = vacio ? Math.max(5, h * 0.4) : Math.max(5.5, h * (hasAcademia ? 0.4 : 0.48))
  doc.setFontSize(nameSize)
  if (vacio) doc.setTextColor(...GRAY)
  else if (side === 'azul') doc.setTextColor(...CHUNG)
  else if (side === 'rojo') doc.setTextColor(...HONG)
  else doc.setTextColor(...DARK)
  doc.text(trunc(doc, label, w - barW - 4), nameX, y + (hasAcademia ? h * 0.4 : h * 0.62))

  if (hasAcademia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(4, h * 0.28))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, w - barW - 4), nameX, y + h - 1.6)
  }
}

/** Centro Y del bloque bi de la 1.ª ronda */
export function yCenterBlock(bi, layout) {
  const { treeTop, blockSpan, blockStep } = layout
  return treeTop + bi * blockStep + blockSpan / 2
}

/** Centro Y de la salida del merge mi en la ronda roundIdx (0 = primera fusión tras nombres) */
export function yCenterMerge(numBlocks, roundIdx, mergeIdx, layout) {
  const spanBlocks = 2 ** (roundIdx + 1)
  const firstBlock = mergeIdx * spanBlocks
  const lastBlock = Math.min(firstBlock + spanBlocks - 1, numBlocks - 1)
  const yFirst = yCenterBlock(firstBlock, layout)
  const yLast = yCenterBlock(lastBlock, layout)
  return (yFirst + yLast) / 2
}

/** Y de los dos feeders que alimentan el merge mi en roundIdx */
export function feederCenters(numBlocks, roundIdx, mergeIdx, layout) {
  if (roundIdx === 0) {
    const bi = mergeIdx * 2
    return {
      yA: yCenterBlock(bi, layout),
      yB: yCenterBlock(Math.min(bi + 1, numBlocks - 1), layout),
    }
  }
  return {
    yA: yCenterMerge(numBlocks, roundIdx - 1, mergeIdx * 2, layout),
    yB: yCenterMerge(numBlocks, roundIdx - 1, mergeIdx * 2 + 1, layout),
  }
}

export function mergesEnRonda(numBlocks, roundIdx) {
  return Math.max(1, numBlocks / 2 ** (roundIdx + 1))
}

export function calcLayout(cols, numBlocks, pageW, pageH) {
  const marginT = 28
  const marginB = 10
  const availH = pageH - marginT - marginB
  const numRounds = cols.length

  let boxH = 13
  let gap = 2
  let interBlock = 3
  let boxW = 52
  let roundColW = 20

  const blockSpan = () => boxH * 2 + gap
  const blockStep = () => blockSpan() + interBlock
  const treeH = () => numBlocks * blockSpan() + Math.max(0, numBlocks - 1) * interBlock

  while (treeH() > availH && boxH > 3.5) {
    boxH = Math.max(3.5, boxH * 0.88)
    gap = Math.max(0.8, gap * 0.88)
    interBlock = Math.max(1, interBlock * 0.88)
  }

  const bs = blockSpan()
  const bst = blockStep()
  const totalH = treeH()
  const treeTop = marginT + Math.max(0, (availH - totalH) / 2)

  const winW = boxW + 12
  const totalW = boxW + numRounds * roundColW + winW + 16
  const availW = pageW - 16
  if (totalW > availW) {
    const scale = availW / totalW
    boxW = Math.max(36, boxW * scale)
    roundColW = Math.max(14, roundColW * scale)
  }

  const marginL = Math.max(6, (pageW - (boxW + numRounds * roundColW + winW + 16)) / 2)
  const nameX = marginL
  const roundX = Array.from({ length: numRounds }, (_, i) => marginL + boxW + i * roundColW + roundColW * 0.55)
  const winnerX = marginL + boxW + numRounds * roundColW + 6
  const fightFont = numBlocks > 12 ? 7 : numBlocks > 8 ? 8 : 9

  return {
    marginL,
    marginT,
    treeTop,
    boxW,
    boxH,
    gap,
    blockSpan: bs,
    blockStep: bst,
    totalH,
    interBlock,
    roundColW,
    nameX,
    roundX,
    winnerX,
    winW,
    fightFont,
    numBlocks,
    numRounds,
  }
}

function drawMergeConnector(doc, xFrom, yA, yB, xMid, xTo, yOut) {
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.5)
  const yMid = (yA + yB) / 2
  doc.line(xFrom, yA, xMid, yA)
  doc.line(xFrom, yB, xMid, yB)
  doc.line(xMid, yA, xMid, yB)
  doc.line(xMid, yMid, xTo, yOut)
}

function drawSingleConnector(doc, xFrom, y, xMid, xTo, yOut) {
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.5)
  doc.line(xFrom, y, xMid, y)
  doc.line(xMid, y, xTo, yOut)
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { nameX, roundX, winnerX, boxW } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', nameX, y)
  cols.forEach((col, i) => {
    doc.text(col.label, roundX[i] - 4, y)
  })
  doc.text('Winner', winnerX + boxW * 0.15, y)
}

function drawWinnerBox(doc, x, yCenter, layout, nombre) {
  const { winW, boxH, gap } = layout
  const winH = Math.max(boxH * 2 + gap + 8, 24)
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

function pairFeederYs(bi, layout, entradas) {
  const { boxH, gap } = layout
  const yC = yCenterBlock(bi, layout)
  const entry = entradas[bi]
  if (entry?.es_bye) return { yTop: yC, yBot: yC, single: true }
  const pairH = boxH * 2 + gap
  const yChung = yC - pairH / 2
  return {
    yTop: yChung + boxH / 2,
    yBot: yChung + boxH + gap + boxH / 2,
    single: false,
  }
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const entradas = entradasPrimeraRonda(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length || !entradas.length) return

  const numBlocks = entradas.length

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, numBlocks, pageW, pageH)
  const { nameX, boxW, boxH, gap, roundX, winnerX, fightFont } = layout

  drawColumnHeaders(doc, cols, layout, layout.marginT - 4)

  const stubX = nameX + boxW + Math.min(8, layout.roundColW * 0.35)

  // Brazos desde cada jugador hacia el primer poste del árbol
  entradas.forEach((entry, bi) => {
    const yC = yCenterBlock(bi, layout)
    if (entry?.es_bye) {
      drawSingleConnector(doc, nameX + boxW, yC, stubX, stubX, yC)
      return
    }
    const pair = pairFeederYs(bi, layout, entradas)
    drawMergeConnector(doc, nameX + boxW, pair.yTop, pair.yBot, stubX, stubX, yC)
  })

  // ── Un merge por pareja de feeders (evita líneas duplicadas/amontonadas) ──
  for (let roundIdx = 0; roundIdx < cols.length; roundIdx++) {
    const nMerges = mergesEnRonda(numBlocks, roundIdx)
    const xMid = roundX[roundIdx]
    const xTo = roundIdx < cols.length - 1 ? roundX[roundIdx + 1] - layout.roundColW * 0.25 : winnerX
    const xFrom = roundIdx === 0 ? stubX : roundX[roundIdx - 1] + 2

    for (let mi = 0; mi < nMerges; mi++) {
      const { yA, yB } = feederCenters(numBlocks, roundIdx, mi, layout)
      const yOut = yCenterMerge(numBlocks, roundIdx, mi, layout)
      drawMergeConnector(doc, xFrom, yA, yB, xMid, xTo, yOut)

      const badgeCol = roundIdx + 1 < cols.length ? cols[roundIdx + 1] : cols[roundIdx]
      const combate = badgeCol?.combates[mi]
      if (combate?.numero_combate) {
        drawFightBadge(doc, xMid, yOut, cat.cancha, combate.numero_combate, fightFont)
      }
    }
  }

  // ── Solo la 1.ª columna lleva cajas de jugadores ──
  entradas.forEach((entry, bi) => {
    const yC = yCenterBlock(bi, layout)
    const pairH = boxH * 2 + gap

    if (entry.es_bye) {
      const player = entry.chung?.vacio === false ? entry.chung : entry.hong
      drawCompetidorBox(doc, nameX, yC - boxH / 2, boxW, boxH, player, {
        colorSide: player?.color || 'azul',
      })
      return
    }

    const yChung = yC - pairH / 2
    drawCompetidorBox(doc, nameX, yChung, boxW, boxH, entry.chung, { colorSide: entry.chung?.color || 'azul' })
    drawCompetidorBox(doc, nameX, yChung + boxH + gap, boxW, boxH, entry.hong, { colorSide: entry.hong?.color || 'rojo' })

    if (entry.numero_combate) {
      const badgeX = stubX + (roundX[0] - stubX) * 0.45
      drawFightBadge(doc, badgeX, yC, cat.cancha, entry.numero_combate, fightFont)
    }
  })

  const finalMatch = cols[cols.length - 1]?.combates[0]
  const yFinal = yCenterMerge(numBlocks, cols.length - 1, 0, layout)
  drawWinnerBox(doc, winnerX, yFinal, layout, finalMatch?.ganador)

  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('ACCTKD · World Taekwondo', pageW / 2, pageH - 6, { align: 'center' })
}

export function descargarLlavesBracketPdf(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const cats = categoriasOrdenadasExport(data.categorias || [])
  if (!cats.length) throw new Error('No hay llaves generadas para exportar')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  cats.forEach((cat, i) => {
    if (i > 0) doc.addPage()
    dibujarBracketCategoriaPdf(doc, data.campeonato, cat, { pageW, pageH })
  })

  const slug = (camp || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)

  doc.save(`llaves-graficas-${slug}.pdf`)
}

export function descargarCategoriaBracketPdf(data, idCategoria) {
  const cat = (data.categorias || []).find((c) => c.id_categoria === idCategoria)
  if (!cat?.porRonda) throw new Error('Categoría sin llave')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  dibujarBracketCategoriaPdf(doc, data.campeonato, cat, {
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
  })

  const slug = cat.nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 40)
  doc.save(`llave-${slug}.pdf`)
}
