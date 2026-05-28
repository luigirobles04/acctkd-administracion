'use client'

import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
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

function drawFightBadge(doc, x, y, area, num, fontSize = 10, maxW = 18) {
  if (!num) return
  const label = area ? `${area}/${String(num).padStart(2, '0')}` : String(num)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const w = Math.min(maxW, Math.max(12, doc.getTextWidth(label) + 4))
  const h = fontSize * 0.55 + 3
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.45)
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 1.2, 1.2, 'FD')
  doc.setTextColor(...DARK)
  doc.text(label, x, y + fontSize * 0.1, { align: 'center' })
}

function colorSideFrom(slot) {
  if (slot?.color === 'rojo') return 'rojo'
  if (slot?.color === 'azul') return 'azul'
  return null
}

function drawCompetidorBox(doc, x, y, w, h, slot, { highlight = false, colorSide = null } = {}) {
  const vacio = slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const label = (slot?.nombre || 'POR DEFINIR').toUpperCase()
  const side = colorSide || colorSideFrom(slot)
  const barW = Math.min(3.2, w * 0.06)
  const fill = vacio ? [250, 251, 252] : highlight ? [255, 251, 235] : [255, 255, 255]

  // Caja con borde claro
  doc.setFillColor(...fill)
  doc.setDrawColor(highlight ? GOLD[0] : 150, highlight ? GOLD[1] : 150, highlight ? GOLD[2] : 150)
  doc.setLineWidth(highlight ? 0.6 : 0.35)
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([1.1, 1.1], 0)
  doc.roundedRect(x, y, w, h, 1.2, 1.2, vacio ? 'S' : 'FD')
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([], 0)

  // Barra de color de peto (Chung/Hong)
  if (!vacio && side === 'azul') {
    doc.setFillColor(...CHUNG)
    doc.rect(x, y, barW, h, 'F')
  } else if (!vacio && side === 'rojo') {
    doc.setFillColor(...HONG)
    doc.rect(x, y, barW, h, 'F')
  }

  // Nombre
  const nameX = x + barW + 2
  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  const hasAcademia = !vacio && slot?.academia && h >= 8.5
  const nameSize = vacio ? Math.max(5.5, h * 0.4) : Math.max(6, h * (hasAcademia ? 0.42 : 0.48))
  doc.setFontSize(nameSize)
  if (vacio) doc.setTextColor(...GRAY)
  else if (side === 'azul') doc.setTextColor(...CHUNG)
  else if (side === 'rojo') doc.setTextColor(...HONG)
  else doc.setTextColor(...DARK)
  doc.text(trunc(doc, label, w - barW - 4), nameX, y + (hasAcademia ? h * 0.42 : h * 0.6))

  // Academia (segunda línea)
  if (hasAcademia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(4.5, h * 0.3))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, w - barW - 4), nameX, y + h - 1.8)
  }
}

function drawBracketConnector(doc, xFrom, yTop, yBot, xMid, xTo, yOut) {
  doc.setDrawColor(40, 40, 40)
  doc.setLineWidth(0.65)
  const yMid = (yTop + yBot) / 2
  doc.line(xFrom, yTop, xMid, yTop)
  doc.line(xFrom, yBot, xMid, yBot)
  doc.line(xMid, yTop, xMid, yBot)
  doc.line(xMid, yMid, xTo, yOut)
}

function calcLayout(cols, pageW, pageH) {
  const marginT = 30
  const marginB = 12
  const availH = pageH - marginT - marginB
  const availW = pageW - 24
  const firstCount = Math.max(1, cols[0]?.combates.length || 1)
  const numRoundCols = cols.length + 1

  let boxH = 15
  let gap = 2.5
  let boxW = 56
  let colGap = 24

  const interBlock = () => Math.max(4, boxH * 0.85)
  const blockH = () => firstCount * (boxH * 2 + gap) + Math.max(0, firstCount - 1) * interBlock()

  while (blockH() + boxH * 0.5 > availH && boxH > 5) {
    boxH = Math.max(5, boxH * 0.91)
    gap = Math.max(1.2, gap * 0.91)
  }

  const minBoxW = cols.length >= 5 ? 26 : cols.length >= 4 ? 32 : 40
  const minColGap = cols.length >= 5 ? 11 : 14
  let colW = boxW + colGap
  let totalW = numRoundCols * colW + boxW + 24
  if (totalW > availW) {
    const scale = availW / totalW
    boxW = Math.max(minBoxW, boxW * scale)
    colGap = Math.max(minColGap, colGap * scale)
    colW = boxW + colGap
    totalW = numRoundCols * colW + boxW + 24
    if (totalW > availW) {
      const scale2 = availW / totalW
      boxW = Math.max(minBoxW * 0.85, boxW * scale2)
      colGap = Math.max(minColGap * 0.85, colGap * scale2)
      colW = boxW + colGap
    }
  }

  const totalH = blockH()
  const marginL = Math.max(8, (pageW - (numRoundCols * colW + boxW + 24)) / 2)
  const fightFont = firstCount > 12 ? 7 : firstCount > 8 ? 8 : firstCount > 4 ? 9 : 10
  const connectorMid = Math.min(14, colGap * 0.55)

  return { marginL, marginT, boxW, boxH, gap, colW, colGap, totalH, firstCount, fightFont, connectorMid }
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { marginL, boxW, colW, connectorMid } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', marginL, y)
  cols.forEach((col, i) => {
    doc.text(col.label, marginL + (i + 1) * colW + boxW * 0.1, y)
  })
  doc.text('Winner', marginL + (cols.length + 1) * colW + 2, y)
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length) return

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, pageW, pageH)
  const { marginL, marginT, boxW, boxH, gap, colW, totalH, fightFont, connectorMid } = layout

  drawColumnHeaders(doc, cols, layout, marginT - 4)

  const matchPositions = []
  cols.forEach((col, colIdx) => {
    const count = col.combates.length
    matchPositions[colIdx] = col.combates.map((m, i) => {
      let yChung
      if (colIdx === 0) {
        const span = totalH / count
        yChung = marginT + i * span + (span - (boxH * 2 + gap)) / 2
      } else {
        const feedA = matchPositions[colIdx - 1][i * 2]
        const feedB = matchPositions[colIdx - 1][i * 2 + 1] || feedA
        const centerY = (feedA.yBadge + feedB.yBadge) / 2
        yChung = centerY - (boxH + gap / 2)
      }
      const yHong = yChung + boxH + gap
      const yBadge = yChung + boxH / 2 + (yHong - yChung) / 2
      const x = marginL + colIdx * colW
      return { m, yChung, yHong, yBadge, x, colIdx }
    })
  })

  // 1) Conectores primero (debajo de las cajas)
  matchPositions.forEach((colMatches, colIdx) => {
    colMatches.forEach(({ yChung, yHong, yBadge, x }, matchIdx) => {
      const badgeX = x + boxW + connectorMid
      if (colIdx < cols.length - 1) {
        const targetIdx = Math.floor(matchIdx / 2)
        const target = matchPositions[colIdx + 1]?.[targetIdx]
        const yTarget = target ? target.yBadge : yBadge
        drawBracketConnector(doc, x + boxW, yChung + boxH / 2, yHong + boxH / 2, badgeX, x + colW, yTarget)
      }
    })
  })

  const finalPos = matchPositions[cols.length - 1]?.[0]
  if (finalPos) {
    const xWin = finalPos.x + boxW + connectorMid + 2
    drawBracketConnector(
      doc,
      finalPos.x + boxW,
      finalPos.yChung + boxH / 2,
      finalPos.yHong + boxH / 2,
      finalPos.x + boxW + connectorMid,
      xWin,
      finalPos.yBadge
    )
  }

  // 2) Cajas y badges encima
  matchPositions.forEach((colMatches, colIdx) => {
    colMatches.forEach(({ m, yChung, yHong, yBadge, x }, matchIdx) => {
      const chung = m.chung || { nombre: 'POR DEFINIR', vacio: true }
      const hong = m.hong || { nombre: 'POR DEFINIR', vacio: true }

      drawCompetidorBox(doc, x, yChung, boxW, boxH, chung, {
        highlight: Boolean(m.ganador && chung.nombre === m.ganador.toUpperCase()),
        colorSide: chung.color || 'azul',
      })
      drawCompetidorBox(doc, x, yHong, boxW, boxH, hong, {
        highlight: Boolean(m.ganador && hong.nombre === m.ganador.toUpperCase()),
        colorSide: hong.color || 'rojo',
      })

      const badgeX = x + boxW + connectorMid
      if (m.numero_combate) {
        drawFightBadge(doc, badgeX, yBadge, cat.cancha, m.numero_combate, fightFont, Math.max(10, connectorMid * 2.2))
      }
    })
  })

  const finalCol = cols[cols.length - 1]
  const finalMatch = finalCol?.combates[0]
  if (finalPos) {
    const xWin = finalPos.x + boxW + connectorMid + 2
    const yWin = finalPos.yBadge - boxH / 2

    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.7)
    doc.roundedRect(xWin, yWin, boxW + 4, boxH + 4, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GOLD)
    doc.text('Winner', xWin + 3, yWin + 5)
    doc.setFontSize(Math.max(7, boxH * 0.45))
    doc.setTextColor(17, 17, 17)
    doc.text(trunc(doc, (finalMatch?.ganador || 'POR DEFINIR').toUpperCase(), boxW), xWin + 3, yWin + 11)
  }

  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('ACCTKD · World Taekwondo', pageW / 2, pageH - 6, { align: 'center' })
}

export function descargarLlavesBracketPdf(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const cats = (data.categorias || []).filter((c) => c.tiene_llave && c.porRonda)
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
