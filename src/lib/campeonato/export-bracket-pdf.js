import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
const GOLD_LIGHT = [255, 251, 235]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]
const LAYOUT_VERSION = 'v4'

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

function numBloquesLayout(entradas, inscritos) {
  const n = inscritos || entradas.filter(blockTieneJugador).length || 2
  return Math.max(2, Math.ceil(n / 2))
}

/** Escala índice de bloque del bracket (potencia de 2) a posición visual compacta */
function blockVisualIndex(bi, numBlocks, numBlocksLayout) {
  if (numBlocks <= 1) return 0
  return (bi / (numBlocks - 1)) * (numBlocksLayout - 1)
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
  const hasAcademia = !vacio && slot?.academia && h >= 8
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

export function yCenterBlock(bi, layout) {
  const vi = blockVisualIndex(bi, layout.numBlocks, layout.numBlocksLayout)
  const { treeTop, blockSpan, blockStep } = layout
  return treeTop + vi * blockStep + blockSpan / 2
}

export function yCenterMerge(numBlocks, roundIdx, mergeIdx, layout) {
  const spanBlocks = 2 ** (roundIdx + 1)
  const firstBlock = mergeIdx * spanBlocks
  const lastBlock = Math.min(firstBlock + spanBlocks - 1, numBlocks - 1)
  const yFirst = yCenterBlock(firstBlock, layout)
  const yLast = yCenterBlock(lastBlock, layout)
  return (yFirst + yLast) / 2
}

export function feederCenters(numBlocks, roundIdx, mergeIdx, layout, entradas) {
  if (roundIdx === 0) {
    const bi = mergeIdx * 2
    const bi2 = Math.min(bi + 1, numBlocks - 1)
    const topOk = blockTieneJugador(entradas[bi])
    const botOk = blockTieneJugador(entradas[bi2])
    const yA = yCenterBlock(bi, layout)
    const yB = yCenterBlock(bi2, layout)
    if (topOk && botOk) return { yA, yB, single: false }
    if (topOk) return { yA, yB: yA, single: true }
    if (botOk) return { yA: yB, yB, single: true }
    return { yA, yB, single: true }
  }

  const topOk = mergeTieneJugadores(entradas, roundIdx - 1, mergeIdx * 2)
  const botOk = mergeTieneJugadores(entradas, roundIdx - 1, mergeIdx * 2 + 1)
  const yA = yCenterMerge(numBlocks, roundIdx - 1, mergeIdx * 2, layout)
  const yB = yCenterMerge(numBlocks, roundIdx - 1, mergeIdx * 2 + 1, layout)
  if (topOk && botOk) return { yA, yB, single: false }
  if (topOk) return { yA, yB: yA, single: true }
  if (botOk) return { yA: yB, yB, single: true }
  return { yA, yB, single: true }
}

export function mergesEnRonda(numBlocks, roundIdx) {
  return Math.max(1, numBlocks / 2 ** (roundIdx + 1))
}

export function calcLayout(cols, numBlocks, numBlocksLayout, pageW, pageH) {
  const marginT = 28
  const marginB = 12
  const availH = pageH - marginT - marginB
  const numRounds = cols.length

  let boxH = 11
  let pairGap = 3.5
  let interBlock = 7

  const blockSpan = () => boxH * 2 + pairGap
  const blockStep = () => blockSpan() + interBlock
  const treeH = () => numBlocksLayout * blockSpan() + Math.max(0, numBlocksLayout - 1) * interBlock

  while (treeH() > availH && boxH > 4) {
    boxH = Math.max(4, boxH * 0.9)
    pairGap = Math.max(2, pairGap * 0.9)
    interBlock = Math.max(3, interBlock * 0.9)
  }

  const bs = blockSpan()
  const bst = blockStep()
  const treeTop = marginT + Math.max(0, (availH - treeH()) / 2)

  const marginL = 10
  const winW = 46
  const nameColW = 56
  const availW = pageW - marginL - 10
  const roundColW = Math.max(18, (availW - nameColW - winW - 8) / numRounds)
  const boxW = nameColW - 4

  const nameX = marginL
  const stubX = nameX + boxW + 5
  const roundX = Array.from({ length: numRounds }, (_, i) => stubX + 8 + roundColW * (i + 0.5))
  const winnerX = stubX + 8 + roundColW * numRounds + 4
  const fightFont = numBlocksLayout > 12 ? 7 : numBlocksLayout > 8 ? 8 : 9

  return {
    marginL,
    marginT,
    treeTop,
    boxW,
    boxH,
    pairGap,
    blockSpan: bs,
    blockStep: bst,
    interBlock,
    roundColW,
    nameX,
    stubX,
    roundX,
    winnerX,
    winW,
    fightFont,
    numBlocks,
    numBlocksLayout,
    numRounds,
  }
}

function drawTreeConnector(doc, xFrom, yA, yB, xMid, xTo, yOut, { single = false } = {}) {
  if (single || Math.abs(yA - yB) < 0.6) {
    const y = (yA + yB) / 2
    line(doc, xFrom, y, xMid, y)
    line(doc, xMid, y, xTo, yOut)
    return
  }
  const yMid = (yA + yB) / 2
  line(doc, xFrom, yA, xMid, yA)
  line(doc, xFrom, yB, xMid, yB)
  line(doc, xMid, yA, xMid, yB)
  line(doc, xMid, yMid, xTo, yOut)
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

function pairFeederYs(bi, layout, entradas) {
  const { boxH, pairGap } = layout
  const yC = yCenterBlock(bi, layout)
  const entry = entradas[bi]
  if (entry?.es_bye || entry?.vacio) return { yTop: yC, yBot: yC }
  const pairH = boxH * 2 + pairGap
  const yChung = yC - pairH / 2
  return {
    yTop: yChung + boxH / 2,
    yBot: yChung + boxH + pairGap + boxH / 2,
  }
}

function drawBlockArms(doc, bi, layout, entradas, cat, fightFont) {
  const { nameX, boxW, stubX } = layout
  const entry = entradas[bi]
  if (!blockTieneJugador(entry)) return

  const yC = yCenterBlock(bi, layout)
  const pair = pairFeederYs(bi, layout, entradas)
  const armEnd = stubX + 3

  if (entry.es_bye) {
    line(doc, nameX + boxW, yC, armEnd, yC)
    return
  }

  line(doc, nameX + boxW, pair.yTop, armEnd, pair.yTop)
  line(doc, nameX + boxW, pair.yBot, armEnd, pair.yBot)
  line(doc, armEnd, pair.yTop, armEnd, pair.yBot)

  if (entry.numero_combate) {
    drawFightBadge(doc, stubX + 7, yC, cat.cancha, entry.numero_combate, fightFont)
  }
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const entradas = entradasPrimeraRonda(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length || !entradas.length) return

  const numBlocks = entradas.length
  const numBlocksLayout = numBloquesLayout(entradas, cat.inscritos)

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, numBlocks, numBlocksLayout, pageW, pageH)
  const { nameX, boxW, boxH, pairGap, stubX, roundX, winnerX, fightFont } = layout

  drawColumnHeaders(doc, cols, layout, layout.marginT - 4)

  const xFromR0 = stubX + 10

  for (let roundIdx = 0; roundIdx < cols.length; roundIdx++) {
    const nMerges = mergesEnRonda(numBlocks, roundIdx)
    const xMid = roundX[roundIdx]
    const xTo = roundIdx < cols.length - 1 ? roundX[roundIdx + 1] - layout.roundColW * 0.3 : winnerX - 2
    const xFrom = roundIdx === 0 ? xFromR0 : roundX[roundIdx - 1] + layout.roundColW * 0.25

    for (let mi = 0; mi < nMerges; mi++) {
      if (!mergeTieneJugadores(entradas, roundIdx, mi)) continue

      const feeders = feederCenters(numBlocks, roundIdx, mi, layout, entradas)
      const yOut = yCenterMerge(numBlocks, roundIdx, mi, layout)
      drawTreeConnector(doc, xFrom, feeders.yA, feeders.yB, xMid, xTo, yOut, { single: feeders.single })

      if (roundIdx > 0) {
        const combate = cols[roundIdx]?.combates[mi]
        if (combate?.numero_combate) {
          drawFightBadge(doc, xMid, yOut, cat.cancha, combate.numero_combate, fightFont)
        }
      }
    }
  }

  for (let bi = 0; bi < numBlocks; bi++) {
    drawBlockArms(doc, bi, layout, entradas, cat, fightFont)
  }

  entradas.forEach((entry, bi) => {
    if (!blockTieneJugador(entry)) return
    const yC = yCenterBlock(bi, layout)
    const pairH = boxH * 2 + pairGap

    if (entry.es_bye) {
      const player = entry.chung?.vacio === false ? entry.chung : entry.hong
      if (player && !player.vacio) {
        drawCompetidorBox(doc, nameX, yC - boxH / 2, boxW, boxH, player, { colorSide: player.color || 'azul' })
      }
      return
    }

    if (entry.chung && !entry.chung.vacio) {
      drawCompetidorBox(doc, nameX, yC - pairH / 2, boxW, boxH, entry.chung, { colorSide: entry.chung.color || 'azul' })
    }
    if (entry.hong && !entry.hong.vacio) {
      drawCompetidorBox(doc, nameX, yC - pairH / 2 + boxH + pairGap, boxW, boxH, entry.hong, { colorSide: entry.hong.color || 'rojo' })
    }
  })

  if (mergeTieneJugadores(entradas, cols.length - 1, 0)) {
    const finalMatch = cols[cols.length - 1]?.combates[0]
    const yFinal = yCenterMerge(numBlocks, cols.length - 1, 0, layout)
    drawWinnerBox(doc, winnerX, yFinal, layout, finalMatch?.ganador)
  }

  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(`ACCTKD · World Taekwondo · ${LAYOUT_VERSION}`, pageW / 2, pageH - 6, { align: 'center' })
}

export function buildBracketPdfBuffer(data, { idCategoria = null } = {}) {
  const camp = data.campeonato?.nombre || 'Campeonato'
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
