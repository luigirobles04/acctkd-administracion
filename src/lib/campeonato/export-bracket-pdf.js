'use client'

import { jsPDF } from 'jspdf'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'

const RED = [192, 0, 10]
const GRAY = [100, 116, 139]

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function drawHeader(doc, campeonato, cat, pageW) {
  doc.setFillColor(...RED)
  doc.rect(0, 0, pageW, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('ACCTKD · Llaves Kyorugi', 10, 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(trunc(doc, campeonato?.nombre || '', pageW - 20), 10, 14)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(trunc(doc, cat.nombre, pageW - 20), 10, 28)
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(`${cat.inscritos} competidores · Área ${cat.cancha || '—'}`, 10, 34)
  doc.line(10, 37, pageW - 10, 37)
}

function drawCnuBracket(doc, cat, { pageW, pageH, marginTop = 42 }) {
  const layout = layoutCnuBracket(cat.porRonda)
  if (!layout) return

  const marginL = 8
  const availW = pageW - marginL - 8
  const availH = pageH - marginTop - 8
  const cellW = Math.min(22, availW / layout.cols)
  const cellH = Math.min(7, availH / layout.rows)

  doc.setFillColor(255, 255, 0)
  doc.rect(marginL, marginTop - 6, availW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Categoría ${cat.nombre}`, marginL + 2, marginTop - 1.5)

  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const spec = layout.cells.get(`${r},${c}`)
      if (!spec) continue
      const x = marginL + c * cellW
      const y = marginTop + r * cellH

      if (spec.bg === 'gray') {
        doc.setFillColor(232, 232, 232)
        doc.rect(x, y, cellW, cellH, 'F')
      }

      if (spec.border) {
        doc.setDrawColor(17, 17, 17)
        doc.setLineWidth(0.25)
        if (spec.border.top) doc.line(x, y, x + cellW, y)
        if (spec.border.bottom) doc.line(x, y + cellH, x + cellW, y + cellH)
        if (spec.border.right) doc.line(x + cellW, y, x + cellW, y + cellH)
        if (spec.border.left) doc.line(x, y, x, y + cellH)
      }

      if (spec.v != null) {
        doc.setTextColor(17, 17, 17)
        doc.setFont('helvetica', spec.matchNo ? 'bold' : spec.bold ? 'bold' : 'normal')
        doc.setFontSize(spec.matchNo ? 10 : spec.small ? 6 : 7)
        if (spec.italic) doc.setTextColor(...GRAY)
        const align = spec.align === 'center' ? x + cellW / 2 : x + 1
        doc.text(trunc(doc, String(spec.v), cellW - 2), align, y + cellH * 0.72, spec.align === 'center' ? { align: 'center' } : undefined)
      }
    }
  }
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  drawHeader(doc, campeonato, cat, pageW)
  drawCnuBracket(doc, cat, { pageW, pageH })
  doc.setFontSize(6)
  doc.setTextColor(...GRAY)
  doc.text('ACCTKD · World Taekwondo', pageW / 2, pageH - 4, { align: 'center' })
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
