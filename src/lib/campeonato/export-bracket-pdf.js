import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
const GOLD_LIGHT = [255, 251, 235]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]
const LAYOUT_VERSION = 'v3'

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
  const nameSize = Math.max(5.5, h * (hasAcademia ? 0.4 : 0.48))
  doc.setFontSize(nameSize)
  if (side === 'azul') doc.setTextColor(...CHUNG)
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

function line(doc, x1, y1, x2, y2) {
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.45)
  doc.line(x1, y1, x2, y2)
}

export function yCenterBlock(bi, layout) {
  const { treeTop, blockSpan, blockStep } = layout
  return treeTop + bi * blockStep + blockSpan / 2
}

export function yCenterMerge(numBlocks, roundIdx, mergeIdx, layout) {
  const spanBlocks = 2 ** (roundIdx + 1)
  const firstBlock = mergeIdx * spanBlocks
  const lastBlock = Math.min(firstBlock + spanBlocks - 1, numBlocks - 1)
  const yFirst = yCenterBlock(firstBlock, layout)
  const yLast = yCenterBlock(lastBlock, layout)
  return (yFirst + yLast) / 2
}

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
  const marginB = 12
  const availH = pageH - marginT - marginB
  const numRounds = cols.length

  let boxH = 12
  let gap = 2
  let interBlock = 3

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
    interBlock,
    roundColW,
    nameX,
    stubX,
    roundX,
    winnerX,
    winW,
    fightFont,
    numBlocks,
    numRounds,
  }
}

function drawMergeConnector(doc, xFrom, yA, yB, xMid, xTo, yOut) {
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
  if (entry?.es_bye || entry?.vacio) return { yTop: yC, yBot: yC }
  const pairH = boxH * 2 + gap
  const yChung = yC - pairH / 2
  return {
    yTop: yChung + boxH / 2,
    yBot: yChung + boxH + gap + boxH / 2,
  }
}

/** Brazo individual por bloque (sin columna vertical compartida que amontona todo) */
function drawBlockArms(doc, bi, layout, entradas, cat, fightFont) {
  const { nameX, boxW, stubX } = layout
  const entry = entradas[bi]
  if (entry?.vacio) return

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

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, numBlocks, pageW, pageH)
  const { nameX, boxW, boxH, gap, stubX, roundX, winnerX, fightFont } = layout

  drawColumnHeaders(doc, cols, layout, layout.marginT - 4)

  const xFromR0 = stubX + 10

  // 1) Conectores entre rondas (un merge por pareja)
  for (let roundIdx = 0; roundIdx < cols.length; roundIdx++) {
    const nMerges = mergesEnRonda(numBlocks, roundIdx)
    const xMid = roundX[roundIdx]
    const xTo = roundIdx < cols.length - 1 ? roundX[roundIdx + 1] - layout.roundColW * 0.3 : winnerX - 2
    const xFrom = roundIdx === 0 ? xFromR0 : roundX[roundIdx - 1] + layout.roundColW * 0.25

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

  // 2) Brazos desde cada bloque hacia el árbol (sin columna única compartida)
  for (let bi = 0; bi < numBlocks; bi++) {
    drawBlockArms(doc, bi, layout, entradas, cat, fightFont)
  }

  // 3) Solo cajas de jugadores en Name/Team (nunca POR DEFINIR en rondas siguientes)
  entradas.forEach((entry, bi) => {
    if (entry.vacio) return
    const yC = yCenterBlock(bi, layout)
    const pairH = boxH * 2 + gap

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
      drawCompetidorBox(doc, nameX, yC - pairH / 2 + boxH + gap, boxW, boxH, entry.hong, { colorSide: entry.hong.color || 'rojo' })
    }
  })

  const finalMatch = cols[cols.length - 1]?.combates[0]
  const yFinal = yCenterMerge(numBlocks, cols.length - 1, 0, layout)
  drawWinnerBox(doc, winnerX, yFinal, layout, finalMatch?.ganador)

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

/** @deprecated Usar API servidor; conservado para tests */
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
