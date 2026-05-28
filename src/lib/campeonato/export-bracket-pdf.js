'use client'

import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function drawHeader(doc, campeonato, cat, pageW) {
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(trunc(doc, campeonato?.nombre || 'Campeonato', pageW - 24), pageW / 2, 11, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    trunc(doc, `${cat.nombre} · Área ${cat.cancha || '—'} · ${cat.inscritos} competidores`, pageW - 24),
    pageW / 2,
    17,
    { align: 'center' }
  )

  if (campeonato?.fecha_inicio) {
    const f = new Date(campeonato.fecha_inicio)
    doc.text(
      f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }),
      pageW / 2,
      22,
      { align: 'center' }
    )
  }

  doc.setDrawColor(180, 180, 180)
  doc.line(10, 25, pageW - 10, 25)
}

function drawFightBadge(doc, x, y, area, num, fontSize = 9) {
  if (!num) return
  const label = area ? `${area}/${num}` : String(num)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const w = Math.max(12, doc.getTextWidth(label) + 4)
  doc.setFillColor(255, 255, 255)
  doc.rect(x - w / 2, y - fontSize * 0.4, w, fontSize + 1.2, 'F')
  doc.setTextColor(...DARK)
  doc.text(label, x, y + fontSize * 0.15, { align: 'center' })
}

function drawCompetidorBox(doc, x, y, w, h, slot, { highlight = false, bye = false } = {}) {
  const vacio = bye || slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const label = bye ? 'BYE' : (slot?.nombre || 'POR DEFINIR').toUpperCase()
  const fill = vacio ? [248, 250, 252] : highlight ? [255, 251, 235] : [255, 255, 255]

  doc.setFillColor(...fill)
  doc.setDrawColor(vacio ? 180 : highlight ? GOLD[0] : 160, vacio ? 180 : highlight ? GOLD[1] : 160, vacio ? 180 : highlight ? GOLD[2] : 160)
  doc.setLineWidth(highlight ? 0.55 : 0.35)
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1.2], 0)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, vacio ? 'S' : highlight ? 'FD' : 'S')
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([], 0)

  if (!vacio && !bye) {
    doc.setFillColor(225, 225, 225)
    doc.roundedRect(x + 2, y + 2, 9, 4.5, 1, 1, 'F')
    doc.setFontSize(4.2)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.text('PER', x + 6.5, y + 4.8, { align: 'center' })
  }

  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  doc.setFontSize(vacio ? Math.max(6, h * 0.42) : Math.max(6.5, h * 0.46))
  doc.setTextColor(...(vacio ? GRAY : DARK))

  const nameX = vacio ? x + 4 : x + 13
  const lines = doc.splitTextToSize(label, w - (vacio ? 8 : 16))
  doc.text(lines.slice(0, 1), nameX, y + h * 0.42)

  if (!vacio && !bye && slot?.academia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(5, h * 0.34))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, w - 6), x + 4, y + h - 2)
  }
}

function drawBracketConnector(doc, xFrom, yTop, yBot, xMid, xTo, yOut) {
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.45)
  const yMid = (yTop + yBot) / 2
  doc.line(xFrom, yTop, xMid, yTop)
  doc.line(xFrom, yBot, xMid, yBot)
  doc.line(xMid, yTop, xMid, yBot)
  doc.line(xMid, yMid, xTo, yOut)
}

function calcLayout(cols, pageW, pageH) {
  const marginT = 52
  const marginB = 10
  const availH = pageH - marginT - marginB
  const firstCount = Math.max(1, cols[0]?.combates.length || 1)
  const numCols = cols.length + 1

  let boxH = 18
  let gap = 2
  let boxW = 62
  let colGap = 20
  let colW = boxW + colGap

  const blockH = (n) => n * (boxH * 2 + gap) + Math.max(0, n - 1) * 4
  let totalH = blockH(firstCount)

  if (totalH > availH) {
    const scale = availH / totalH
    boxH = Math.max(8, boxH * scale)
    gap = Math.max(1, gap * scale)
    totalH = blockH(firstCount)
  }

  let totalW = numCols * colW + boxW + 24
  const availW = pageW - 16
  if (totalW > availW) {
    const scale = availW / totalW
    boxW = Math.max(40, boxW * scale)
    colW = boxW + colGap * scale
    colGap *= scale
    totalW = numCols * colW + boxW + 24
  }

  const marginL = Math.max(8, (pageW - totalW) / 2)
  const fightFont = firstCount > 8 ? 8 : firstCount > 4 ? 9 : 10

  return { marginL, marginT, boxW, boxH, gap, colW, colGap, totalH, firstCount, fightFont }
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { marginL, boxW, colW } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', marginL, y)
  cols.forEach((col, i) => {
    doc.text(col.label, marginL + boxW + 12 + i * colW + boxW * 0.08, y)
  })
  doc.text('Winner', marginL + boxW + 12 + cols.length * colW + 6, y)
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length) return

  drawHeader(doc, campeonato, cat, pageW)
  const layout = calcLayout(cols, pageW, pageH)
  const { marginL, marginT, boxW, boxH, gap, colW, totalH, fightFont } = layout

  drawColumnHeaders(doc, cols, layout, marginT - 4)

  const matchPositions = cols.map((col, colIdx) => {
    const count = col.combates.length
    return col.combates.map((m, i) => {
      const span = totalH / count
      const blockTop = marginT + i * span + (span - (boxH * 2 + gap)) / 2
      const yChung = blockTop
      const yHong = blockTop + boxH + gap
      const yMid = blockTop + boxH + gap / 2
      const x = marginL + colIdx * colW
      return { m, yChung, yHong, yMid, x, colIdx }
    })
  })

  matchPositions.forEach((colMatches, colIdx) => {
    colMatches.forEach(({ m, yChung, yHong, yMid, x }, matchIdx) => {
      const chung = m.chung || { nombre: 'POR DEFINIR', vacio: true }
      const hong = m.hong || { nombre: 'POR DEFINIR', vacio: true }

      drawCompetidorBox(doc, x, yChung, boxW, boxH, chung, {
        highlight: Boolean(m.ganador && chung.nombre === m.ganador.toUpperCase()),
      })
      drawCompetidorBox(doc, x, yHong, boxW, boxH, hong, {
        highlight: Boolean(m.ganador && hong.nombre === m.ganador.toUpperCase()),
      })

      if (m.numero_combate) {
        drawFightBadge(doc, x + boxW + 10, yMid + boxH / 2, cat.cancha, m.numero_combate, fightFont)
      }

      if (colIdx < cols.length - 1) {
        const targetIdx = Math.floor(matchIdx / 2)
        const target = matchPositions[colIdx + 1]?.[targetIdx]
        const yTarget = target ? target.yMid + boxH / 2 : yMid + boxH / 2
        drawBracketConnector(doc, x + boxW, yChung + boxH / 2, yHong + boxH / 2, x + boxW + 10, x + colW, yTarget)
      }
    })
  })

  const finalCol = cols[cols.length - 1]
  const finalMatch = finalCol?.combates[0]
  const finalPos = matchPositions[cols.length - 1]?.[0]
  if (finalPos) {
    const xWin = finalPos.x + boxW + 14
    const yWin = finalPos.yMid + boxH / 2 - boxH / 2

    drawBracketConnector(
      doc,
      finalPos.x + boxW,
      finalPos.yChung + boxH / 2,
      finalPos.yHong + boxH / 2,
      finalPos.x + boxW + 10,
      xWin,
      yWin + boxH / 2
    )

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
