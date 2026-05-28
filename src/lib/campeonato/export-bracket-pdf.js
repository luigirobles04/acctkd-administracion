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

function drawCompetidorBox(doc, x, y, w, h, slot, { highlight = false, color = null } = {}) {
  doc.setFillColor(255, highlight ? 243 : 255, highlight ? 199 : 255)
  doc.setDrawColor(highlight ? GOLD[0] : 180, highlight ? GOLD[1] : 180, highlight ? GOLD[2] : 180)
  doc.setLineWidth(highlight ? 0.6 : 0.35)
  doc.roundedRect(x, y, w, h, 2, 2, highlight ? 'FD' : 'S')

  if (slot?.dorsal) {
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(x + 2, y + 2, 14, 7, 1, 1, 'F')
    doc.setFontSize(6)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'bold')
    doc.text(String(slot.dorsal).slice(0, 8), x + 9, y + 6.5, { align: 'center' })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(color ? color[0] : 17, color ? color[1] : 17, color ? color[2] : 17)
  doc.text(trunc(doc, (slot?.nombre || 'Por definir').toUpperCase(), w - 20), x + 18, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text(trunc(doc, slot?.academia || '', w - 8), x + 4, y + 12)
}

function drawMatchConnectors(doc, x1, y1, x2, yMid, x3) {
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.4)
  doc.line(x1, y1, x2, y1)
  doc.line(x1, y1 + 14, x2, y1 + 14)
  doc.line(x2, y1, x2, y1 + 14)
  doc.line(x2, yMid, x3, yMid)
}

function drawColumnHeaders(doc, cols, startX, colW, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Nombre / Academia', startX, y)
  cols.forEach((col, i) => {
    doc.text(col.label, startX + colW * (i + 1) + colW * 0.15, y)
  })
  doc.text('Ganador', startX + colW * (cols.length + 1) + 8, y)
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length) return

  drawHeader(doc, campeonato, cat, pageW)

  const marginL = 12
  const marginT = 48
  const boxW = 52
  const boxH = 14
  const colW = 58
  const maxFirst = (cols[0]?.combates.length || 1) * 2
  const rowSpan = Math.max(2, maxFirst)
  const totalH = rowSpan * (boxH + 2)

  drawColumnHeaders(doc, cols, marginL, colW, marginT - 4)

  const firstCol = cols[0]
  const firstMatches = firstCol.combates
  const slotYs = []

  firstMatches.forEach((m, i) => {
    const baseY = marginT + (i * (totalH / firstMatches.length)) + 2
    const yChung = baseY
    const yHong = baseY + boxH + 1
    slotYs.push({ yChung, yHong, mid: baseY + boxH / 2 + 0.5 })

    drawCompetidorBox(doc, marginL, yChung, boxW, boxH, m.chung, { color: CHUNG })
    drawCompetidorBox(doc, marginL, yHong, boxW, boxH, m.hong, { color: HONG })

    if (cols.length > 1) {
      drawMatchConnectors(doc, marginL + boxW, yChung + boxH / 2, marginL + boxW + 8, slotYs[i].mid + boxH / 2, marginL + boxW + 16)
    }
  })

  cols.slice(1).forEach((col, colIdx) => {
    const x = marginL + boxW + 18 + colIdx * colW
    col.combates.forEach((m, i) => {
      const span = totalH / col.combates.length
      const yTop = marginT + i * span + span / 2 - boxH - 1
      const yBot = yTop + boxH + 2
      const yMid = yTop + boxH + 1

      drawCompetidorBox(doc, x, yTop, boxW, boxH, m.chung, {
        color: CHUNG,
        highlight: Boolean(m.ganador && m.chung?.nombre === m.ganador.toUpperCase()),
      })
      drawCompetidorBox(doc, x, yBot, boxW, boxH, m.hong, {
        color: HONG,
        highlight: Boolean(m.ganador && m.hong?.nombre === m.ganador.toUpperCase()),
      })

      if (colIdx < cols.length - 2) {
        drawMatchConnectors(doc, x + boxW, yTop + boxH / 2, x + boxW + 8, yMid, x + boxW + 16)
      }
    })
  })

  const finalCol = cols[cols.length - 1]
  const finalMatch = finalCol?.combates[0]
  if (finalMatch?.ganador) {
    const xWin = marginL + boxW + 18 + (cols.length - 1) * colW + boxW + 10
    const yWin = marginT + totalH / 2 - boxH / 2
    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.7)
    doc.roundedRect(xWin, yWin, boxW + 4, boxH + 2, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GOLD)
    doc.text('★ GANADOR', xWin + 3, yWin + 5)
    doc.setFontSize(8)
    doc.setTextColor(17, 17, 17)
    doc.text(trunc(doc, finalMatch.ganador.toUpperCase(), boxW), xWin + 3, yWin + 11)
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
