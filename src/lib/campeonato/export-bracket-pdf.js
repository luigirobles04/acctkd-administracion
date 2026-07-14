import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, categoriasOrdenadasExport } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda, ROWS_PER_MATCH, outRowCenter } from '@/lib/campeonato/bracket-cnu-layout'
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
const LAYOUT_VERSION = 'v8'

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

export function calcLayout(cols, numBlocks, entradas, pageW, pageH) {
  const marginT = 27
  const marginB = 11
  const availH = pageH - marginT - marginB
  const { blockStartRow, totalRows } = buildRowMap(entradas)
  const numRounds = cols.length

  let rowH = availH / totalRows
  while (rowH * totalRows > availH && rowH > 2.5) rowH *= 0.92

  const maxPairH = ROWS_PER_MATCH * rowH * 0.9
  let pairGap = Math.max(3, rowH * 0.55)
  let boxH = Math.min(Math.max(5, (maxPairH - pairGap) / 2), 11.5)
  if (boxH * 2 + pairGap > maxPairH) {
    boxH = Math.max(4.5, (maxPairH - 2) / 2)
    pairGap = Math.max(2.5, maxPairH - boxH * 2)
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
function lineToNextWithBadgeGap(doc, xVert, y, xNext, badgeW) {
  const gap = Math.max(badgeW + 2, 10)
  const xStart = xVert + Math.min(gap * 0.35, Math.max(2, (xNext - xVert) * 0.12))
  const xEnd = xStart + gap
  if (xEnd >= xNext - 0.5) {
    line(doc, xVert, y, xNext, y)
    return (xVert + xNext) / 2
  }
  line(doc, xVert, y, xStart, y)
  line(doc, xEnd, y, xNext, y)
  return (xStart + xEnd) / 2
}

/** Conector CNU: T completa, passthrough (bye) o feeder único (slot vacío en 1.ª ronda). */
export function drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, badgeW = 0, opts = {}) {
  const { activeTop = true, activeBot = true } = opts
  if (!activeTop && !activeBot) return null

  const sameLevel = Math.abs(yTop - yBot) < 0.5
  const singleFeeder = !activeTop || !activeBot || sameLevel

  if (singleFeeder) {
    const y = activeTop && activeBot ? yMid : activeTop ? yTop : yBot
    line(doc, xPrev, y, xGap, y)
    line(doc, xGap, y, xVert, y)
    if (Math.abs(y - yMid) > 0.5) {
      line(doc, xVert, y, xVert, yMid)
    }
    const bx = lineToNextWithBadgeGap(doc, xVert, yMid, xNext, badgeW)
    return { x: bx, y: yMid }
  }

  line(doc, xPrev, yTop, xGap, yTop)
  line(doc, xPrev, yBot, xGap, yBot)
  line(doc, xGap, yTop, xVert, yTop)
  line(doc, xVert, yTop, xVert, yBot)
  line(doc, xGap, yBot, xVert, yBot)
  const bx = lineToNextWithBadgeGap(doc, xVert, yMid, xNext, badgeW)
  return { x: bx, y: yMid }
}

function feederActiveRound1(roundIdx, feedIdx, entradas) {
  if (roundIdx !== 1) return true
  if (feedIdx < 0 || feedIdx >= entradas.length) return false
  return blockTieneJugador(entradas[feedIdx])
}

function queueBadge(badgeByNum, { num, x, y }) {
  if (!num) return
  if (!badgeByNum.has(num)) badgeByNum.set(num, { x, y, num })
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { nameX, roundX, winnerX } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', nameX, y)
  cols.forEach((col, i) => {
    doc.text(col.label, roundX[i], y, { align: 'center' })
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
  return {
    yTop,
    yBot,
    yMid,
    yChung: yTop - boxH / 2,
    pairH: boxH * 2 + pairGap,
  }
}

export function categoriaExportablePdf(cat) {
  const entradas = entradasPrimeraRonda(cat?.porRonda)
  const rondas = rondasOrdenadas(cat?.porRonda)
  if (!rondas.length || !entradas.length) return false
  return entradas.some((e) => blockTieneJugador(e))
}

function drawBlockArms(doc, bi, layout, entradas) {
  const { nameX, boxW, stubX, roundX } = layout
  const entry = entradas[bi]
  if (!blockTieneJugador(entry)) return null

  const { yTop, yBot, yMid } = blockPlayerYs(bi, layout)
  const xVert = roundX[0]
  const xArmEnd = stubX + 4

  if (entry.es_bye) {
    line(doc, nameX + boxW, yMid, xVert, yMid)
    return null
  }

  line(doc, nameX + boxW, yTop, xArmEnd, yTop)
  line(doc, nameX + boxW, yBot, xArmEnd, yBot)
  line(doc, xArmEnd, yTop, xVert, yTop)
  line(doc, xVert, yTop, xVert, yBot)
  line(doc, xArmEnd, yBot, xVert, yBot)

  if (entry.numero_combate) {
    const badgeY = entry.es_bye ? yMid : (yTop + yBot) / 2
    return { x: xVert - layout.roundColW * 0.08, y: badgeY, num: entry.numero_combate }
  }
  return null
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210, logoCache = {} } = {}) {
  const entradas = entradasPrimeraRonda(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!rondas.length || !entradas.length || !entradas.some((e) => blockTieneJugador(e))) return false

  const numBlocks = entradas.length
  const cols = columnasBracket(cat.porRonda, { inscritos: cat.inscritos, numBlocks })
  if (!cols.length) return false

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, numBlocks, entradas, pageW, pageH)
  const { nameX, boxW, boxH, pairGap, roundX, winnerX, fightFont } = layout
  const badgeByNum = new Map()

  drawColumnHeaders(doc, cols, layout, layout.marginT - 3)

  for (let bi = 0; bi < numBlocks; bi++) {
    const b = drawBlockArms(doc, bi, layout, entradas)
    if (b) queueBadge(badgeByNum, b)
  }

  // 2 competidores: una sola columna (Final) — conectar roundX[0] → Winner
  if (cols.length === 1 && numBlocks >= 1) {
    const combate = cols[0]?.combates?.[0]
    const { yMid } = blockFeederYs(0, layout)
    const badgeSize = combate?.numero_combate
      ? measureFightBadge(doc, cat.cancha, combate.numero_combate, fightFont)
      : { w: 0 }
    const bx = lineToNextWithBadgeGap(doc, roundX[0], yMid, winnerX, badgeSize.w)
    if (combate?.numero_combate) {
      queueBadge(badgeByNum, { x: bx, y: yMid, num: combate.numero_combate })
    }
  }

  for (let roundIdx = 1; roundIdx < cols.length; roundIdx++) {
    const col = cols[roundIdx]
    const xPrev = roundX[roundIdx - 1]
    const xGap = roundX[roundIdx] - layout.roundColW * 0.32
    const xVert = roundX[roundIdx]
    const xNext = roundIdx < cols.length - 1 ? roundX[roundIdx + 1] - layout.roundColW * 0.32 : winnerX

    col.combates.forEach((combate, mi) => {
      const feedA = mi * 2
      const feedB = mi * 2 + 1
      const { yTop, yBot, yMid } = mergeFeederYs(roundIdx, mi, numBlocks, layout)
      const activeTop = feederActiveRound1(roundIdx, feedA, entradas)
      const activeBot = feederActiveRound1(roundIdx, feedB, entradas)
      const badgeSize = combate?.numero_combate
        ? measureFightBadge(doc, cat.cancha, combate.numero_combate, fightFont)
        : { w: 0 }
      const pos = drawCnuConnector(doc, xPrev, xGap, xVert, xNext, yTop, yBot, yMid, badgeSize.w, {
        activeTop,
        activeBot,
      })

      if (combate?.numero_combate && pos) {
        queueBadge(badgeByNum, { x: pos.x, y: pos.y, num: combate.numero_combate })
      }
    })
  }

  entradas.forEach((entry, bi) => {
    if (!blockTieneJugador(entry)) return
    const { yChung, pairH, yMid } = blockPlayerYs(bi, layout)

    if (entry.es_bye) {
      const player = entry.chung?.vacio === false ? entry.chung : entry.hong
      if (player && !player.vacio) {
        drawCompetidorBox(doc, nameX, yMid - boxH / 2, boxW, boxH, player, {
          colorSide: player.color === 'rojo' ? 'rojo' : 'azul',
          logoCache,
        })
      }
      return
    }

    if (entry.chung && !entry.chung.vacio) {
      drawCompetidorBox(doc, nameX, yChung, boxW, boxH, entry.chung, { colorSide: entry.chung.color || 'azul', logoCache })
    }
    if (entry.hong && !entry.hong.vacio) {
      drawCompetidorBox(doc, nameX, yChung + boxH + pairGap, boxW, boxH, entry.hong, { colorSide: entry.hong.color || 'rojo', logoCache })
    }
  })

  const finalIdx = cols.length - 1
  const finalMatch = cols[finalIdx]?.combates[0]
  const yFinal = yFromOutRow(outRowCenter(finalIdx, 0), layout)
  drawWinnerBox(doc, winnerX, yFinal, layout, finalMatch?.ganador)

  for (const b of badgeByNum.values()) {
    drawFightBadge(doc, b.x, b.y, cat.cancha, b.num, fightFont)
  }

  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(`ACCTKD · Taekwondo FestCup · World Taekwondo · ${LAYOUT_VERSION}`, pageW / 2, pageH - 6, { align: 'center' })
  return true
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
