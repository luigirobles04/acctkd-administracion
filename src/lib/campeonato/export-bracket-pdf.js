'use client'

import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas } from '@/lib/campeonato/bracket-export'

const RED = [192, 0, 10]
const GRAY = [100, 116, 139]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]
const GOLD = [180, 83, 9]

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function drawHeader(doc, campeonato, cat, pageW) {
  doc.setFillColor(...RED)
  doc.rect(0, 0, pageW, 22, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ACCTKD · Llaves Kyorugi', 12, 9)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(trunc(doc, campeonato?.nombre || 'Campeonato', pageW - 24), 12, 15)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(trunc(doc, cat.nombre, pageW - 24), 12, 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`${cat.inscritos} competidores · Área ${cat.cancha || '—'}`, 12, 36)

  if (campeonato?.fecha_inicio) {
    const f = new Date(campeonato.fecha_inicio)
    doc.text(f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }), pageW - 12, 36, {
      align: 'right',
    })
  }

  doc.setDrawColor(200, 200, 200)
  doc.line(12, 40, pageW - 12, 40)
}

function drawFightBadge(doc, x, y, num) {
  if (!num) return
  const label = `#${num}`
  const w = Math.max(16, doc.getTextWidth(label) + 6)
  doc.setFillColor(17, 24, 39)
  doc.roundedRect(x - w / 2, y - 4, w, 9, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(label, x, y + 1.8, { align: 'center' })
}

function drawCompetidorBox(doc, x, y, w, h, slot, { highlight = false, color = null } = {}) {
  const vacio = slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const fill = vacio ? [248, 250, 252] : highlight ? [255, 243, 199] : [255, 255, 255]

  doc.setFillColor(...fill)
  doc.setDrawColor(vacio ? 180 : highlight ? GOLD[0] : 180, vacio ? 180 : highlight ? GOLD[1] : 180, vacio ? 180 : highlight ? GOLD[2] : 180)
  doc.setLineWidth(highlight ? 0.6 : 0.35)
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1.2], 0)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, vacio ? 'S' : highlight ? 'FD' : 'S')
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([], 0)

  if (slot?.dorsal && !vacio) {
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(x + 2, y + 2, 16, 8, 1, 1, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text(String(slot.dorsal).slice(0, 10), x + 10, y + 7.2, { align: 'center' })
  }

  const nombre = (slot?.nombre || 'POR DEFINIR').toUpperCase()
  doc.setFont('helvetica', vacio ? 'normal' : 'bold')
  doc.setFontSize(vacio ? 7.5 : 8.5)
  doc.setTextColor(vacio ? GRAY[0] : color ? color[0] : 17, vacio ? GRAY[1] : color ? color[1] : 17, vacio ? GRAY[2] : color ? color[2] : 17)

  const lines = doc.splitTextToSize(nombre, w - 22)
  doc.text(lines.slice(0, 2), x + (vacio ? 4 : 20), y + (lines.length > 1 ? 6 : 8))

  if (!vacio && slot?.academia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    const acadLines = doc.splitTextToSize(slot.academia, w - 6)
    doc.text(acadLines.slice(0, 1), x + 4, y + h - 2.5)
  }
}

function drawBracketConnector(doc, xFrom, yTop, yBot, xMid, xTo, yOut) {
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.5)
  const yMid = (yTop + yBot) / 2
  doc.line(xFrom, yTop, xMid, yTop)
  doc.line(xFrom, yBot, xMid, yBot)
  doc.line(xMid, yTop, xMid, yBot)
  doc.line(xMid, yMid, xTo, yOut)
}

function drawColumnHeaders(doc, cols, startX, colW, boxW, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Nombre / Academia', startX, y)
  cols.forEach((col, i) => {
    doc.text(col.label, startX + boxW + 14 + i * colW + boxW * 0.1, y)
  })
  doc.text('Ganador', startX + boxW + 14 + cols.length * colW + 6, y)
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length) return

  drawHeader(doc, campeonato, cat, pageW)

  const marginL = 10
  const marginT = 48
  const boxW = 68
  const boxH = 18
  const gap = 2
  const colW = boxW + 22
  const firstCount = cols[0]?.combates.length || 1
  const totalH = firstCount * (boxH * 2 + gap + 6)

  drawColumnHeaders(doc, cols, marginL, colW, boxW, marginT - 4)

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
        color: CHUNG,
        highlight: Boolean(m.ganador && chung.nombre === m.ganador.toUpperCase()),
      })
      drawCompetidorBox(doc, x, yHong, boxW, boxH, hong, {
        color: HONG,
        highlight: Boolean(m.ganador && hong.nombre === m.ganador.toUpperCase()),
      })

      if (m.numero_combate) {
        drawFightBadge(doc, x + boxW + 10, yMid + boxH / 2, m.numero_combate)
      }

      if (colIdx < cols.length - 1) {
        const xFrom = x + boxW
        const xMid = x + boxW + 10
        const xTo = x + colW
        const targetIdx = Math.floor(matchIdx / 2)
        const target = matchPositions[colIdx + 1]?.[targetIdx]
        const yTarget = target ? target.yMid + boxH / 2 : yMid + boxH / 2

        drawBracketConnector(doc, xFrom, yChung + boxH / 2, yHong + boxH / 2, xMid, xTo, yTarget)
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
    doc.text('★ GANADOR', xWin + 3, yWin + 5)
    doc.setFontSize(8)
    doc.setTextColor(17, 17, 17)
    const ganadorTxt = finalMatch?.ganador?.toUpperCase() || 'POR DEFINIR'
    doc.text(trunc(doc, ganadorTxt, boxW), xWin + 3, yWin + 11)
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
