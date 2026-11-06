'use client'

import { jsPDF } from 'jspdf'
import { WT_LOGO_PNG, ACADEMIA_LOGO_PNG } from '@/lib/campeonato/pdf-logos'
import { slugArchivo } from '@/lib/campeonato/export-utils'

const DARK = [17, 17, 17]
const GRAY = [100, 116, 139]
const HEAD_BG = [192, 0, 10]
const SECTION_BG = [254, 243, 199]
const ROW_ALT = [248, 250, 252]
const BORDER = [209, 213, 219]

function drawPageChrome(doc, { campeonato, titulo, subtitulo, pageW }) {
  try {
    doc.addImage(WT_LOGO_PNG, 'PNG', 10, 8, 26, 11.9, 'wtLogo', 'FAST')
  } catch (_) {}
  try {
    doc.addImage(ACADEMIA_LOGO_PNG, 'PNG', pageW - 10 - 13, 7, 13, 13, 'acLogo', 'FAST')
  } catch (_) {}

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(String(campeonato?.nombre || 'Campeonato'), pageW / 2, 12, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(String(titulo || ''), pageW / 2, 18, { align: 'center' })

  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRAY)
    doc.text(String(subtitulo), pageW / 2, 23, { align: 'center' })
  }

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.35)
  doc.line(10, 26, pageW - 10, 26)
}

function trunc(doc, text, maxW) {
  let s = String(text ?? '')
  while (s.length > 1 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

/**
 * Genera un PDF de tabla con cabecera de marca (logos WT + academia).
 * @param {object} opts
 * @param {object} opts.campeonato
 * @param {string} opts.titulo
 * @param {string} [opts.subtitulo]
 * @param {Array<{header:string,width:number,align?:string}>} opts.columns  ancho en mm
 * @param {Array<{title?:string, rows:Array<Array<string>>}>} opts.sections
 * @param {'portrait'|'landscape'} [opts.orientation]
 * @returns {Blob}
 */
export function buildTablePdfDoc({ campeonato, titulo, subtitulo, columns, sections, orientation = 'portrait' }) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 10
  const topY = 30
  const bottomY = pageH - 10
  const rowH = 7
  const headH = 8

  const totalW = columns.reduce((s, c) => s + c.width, 0)
  const scale = (pageW - marginL * 2) / totalW
  const cols = columns.map((c) => ({ ...c, w: c.width * scale }))

  let y = topY

  const newPage = (first = false) => {
    if (!first) doc.addPage()
    drawPageChrome(doc, { campeonato, titulo, subtitulo, pageW })
    y = topY
  }

  const drawColHeader = () => {
    let x = marginL
    doc.setFillColor(...HEAD_BG)
    doc.rect(marginL, y, pageW - marginL * 2, headH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    for (const c of cols) {
      const align = c.align || 'left'
      const tx = align === 'center' ? x + c.w / 2 : align === 'right' ? x + c.w - 2 : x + 2
      doc.text(trunc(doc, c.header, c.w - 3), tx, y + headH - 2.5, { align })
      x += c.w
    }
    y += headH
  }

  newPage(true)
  drawColHeader()

  let rowIndex = 0
  for (const section of sections) {
    if (section.formaBanner) {
      const bannerH = 11
      if (y + bannerH + 4 > bottomY) {
        newPage()
        drawColHeader()
      }
      doc.setFillColor(...DARK)
      doc.rect(marginL, y, pageW - marginL * 2, bannerH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      const label = String(section.formaBanner).toUpperCase()
      doc.text(trunc(doc, label, pageW - marginL * 2 - 4), pageW / 2, y + 7.2, { align: 'center' })
      y += bannerH + 2
      rowIndex = 0
      continue
    }

    if (section.title) {
      if (y + rowH + 2 > bottomY) {
        newPage()
        drawColHeader()
      }
      doc.setFillColor(...SECTION_BG)
      doc.rect(marginL, y, pageW - marginL * 2, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...DARK)
      doc.text(trunc(doc, section.title, pageW - marginL * 2 - 4), marginL + 2, y + rowH - 2)
      y += rowH
      rowIndex = 0
    }

    for (const row of section.rows) {
      let rowHeight = rowH
      const cellLines = []
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i]
        const cell = row[i]
        const val = cell && typeof cell === 'object' ? cell.text : cell
        const multiline = cell && typeof cell === 'object' && cell.multiline
        if (multiline && val) {
          const lines = doc.splitTextToSize(String(val), c.w - 3)
          cellLines[i] = lines
          rowHeight = Math.max(rowHeight, Math.max(1, lines.length) * 4.2 + 2)
        } else {
          cellLines[i] = null
        }
      }

      if (y + rowHeight > bottomY) {
        newPage()
        drawColHeader()
        rowIndex = 0
      }
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(marginL, y, pageW - marginL * 2, rowHeight, 'F')
      }

      let x = marginL
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i]
        const cell = row[i]
        const val = cell && typeof cell === 'object' ? cell.text : cell
        const color = cell && typeof cell === 'object' && cell.color ? cell.color : DARK
        const bold = cell && typeof cell === 'object' && cell.bold
        doc.setTextColor(...color)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const align = c.align || 'left'
        const tx = align === 'center' ? x + c.w / 2 : align === 'right' ? x + c.w - 2 : x + 2
        if (cellLines[i]?.length) {
          doc.text(cellLines[i], tx, y + 4, { align, lineHeightFactor: 1.15 })
        } else {
          doc.text(trunc(doc, val ?? '', c.w - 3), tx, y + rowHeight - 2.3, { align })
        }
        x += c.w
      }
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.15)
      doc.line(marginL, y + rowHeight, pageW - marginL, y + rowHeight)
      y += rowHeight
      rowIndex++
    }
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text(`ACCTKD · Taekwondo FestCup · World Taekwondo`, pageW / 2, pageH - 5, { align: 'center' })
    doc.text(`Pág. ${p}/${pages}`, pageW - 10, pageH - 5, { align: 'right' })
  }

  return doc
}

export function buildTablePdfBlob(opts) {
  return buildTablePdfDoc(opts).output('blob')
}

/** Node / scripts — escribe PDF en disco */
export function buildTablePdfBuffer(opts) {
  return Buffer.from(buildTablePdfDoc(opts).output('arraybuffer'))
}

export function descargarTablaPdf(opts, filename) {
  const blob = buildTablePdfBlob(opts)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export { slugArchivo }
