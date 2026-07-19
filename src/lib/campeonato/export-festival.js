'use client'

import { jsPDF } from 'jspdf'
import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { WT_LOGO_PNG, ACADEMIA_LOGO_PNG } from '@/lib/campeonato/pdf-logos'

const DARK = [17, 17, 17]
const GRAY = [100, 116, 139]
const HEAD_BG = [192, 0, 10]
const ROW_ALT = [248, 250, 252]
const BORDER = [209, 213, 219]

function gruposActivos(grupos) {
  return (grupos || []).filter((g) => g.total > 0)
}

function trunc(doc, text, maxW) {
  let s = String(text ?? '')
  while (s.length > 1 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function drawPageChrome(doc, { campeonato, pageW, esPortada = false }) {
  try {
    doc.addImage(WT_LOGO_PNG, 'PNG', 10, 8, 26, 11.9, 'wtLogo', 'FAST')
  } catch (_) {}
  try {
    doc.addImage(ACADEMIA_LOGO_PNG, 'PNG', pageW - 10 - 13, 7, 13, 13, 'acLogo', 'FAST')
  } catch (_) {}

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(esPortada ? 18 : 12)
  doc.text(String(campeonato?.nombre || 'Campeonato'), pageW / 2, esPortada ? 14 : 12, { align: 'center' })

  if (esPortada) {
    doc.setFontSize(22)
    doc.setTextColor(192, 0, 10)
    doc.text('FESTIVAL', pageW / 2, 28, { align: 'center' })
    doc.text('KYORUGI', pageW / 2, 38, { align: 'center' })
  } else {
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text('FESTIVAL KYORUGI', pageW / 2, 18, { align: 'center' })
  }

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.35)
  doc.line(10, esPortada ? 44 : 26, pageW - 10, esPortada ? 44 : 26)
}

function buildFestivalPdfBlob(campeonato, grupos) {
  const activos = gruposActivos(grupos)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 10
  const topY = 48
  const bottomY = pageH - 10
  const rowH = 7
  const headH = 8

  const colW = [
    (pageW - marginL * 2) * 0.38,
    (pageW - marginL * 2) * 0.32,
    (pageW - marginL * 2) * 0.18,
    (pageW - marginL * 2) * 0.12,
  ]

  let y = topY
  let firstPage = true

  const newPage = (portada = false) => {
    if (!firstPage) doc.addPage()
    firstPage = false
    drawPageChrome(doc, { campeonato, pageW, esPortada: portada })
    y = portada ? topY : 30
  }

  const drawGroupHeader = (grupo) => {
    const headers = ['NOMBRE Y APELLIDO', 'INSTITUCION', grupo.edadLabel, 'GENERO']
    doc.setFillColor(...HEAD_BG)
    doc.rect(marginL, y, pageW - marginL * 2, headH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    let x = marginL
    for (let i = 0; i < headers.length; i++) {
      doc.text(trunc(doc, headers[i], colW[i] - 3), x + 2, y + headH - 2.5)
      x += colW[i]
    }
    y += headH
  }

  newPage(true)

  if (!activos.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...GRAY)
    doc.text('No hay participantes de festival inscritos.', pageW / 2, y + 10, { align: 'center' })
  }

  let rowIndex = 0
  for (const grupo of activos) {
    if (y + headH + rowH > bottomY) {
      newPage(false)
    }
    drawGroupHeader(grupo)
    rowIndex = 0

    for (const p of grupo.participantes) {
      if (y + rowH > bottomY) {
        newPage(false)
        drawGroupHeader(grupo)
        rowIndex = 0
      }
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(marginL, y, pageW - marginL * 2, rowH, 'F')
      }
      const cells = [p.nombre, p.academia, p.division, p.sexo]
      let x = marginL
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...DARK)
      for (let i = 0; i < cells.length; i++) {
        const align = i === 3 ? 'center' : 'left'
        const tx = align === 'center' ? x + colW[i] / 2 : x + 2
        doc.text(trunc(doc, cells[i], colW[i] - 3), tx, y + rowH - 2.3, { align })
        x += colW[i]
      }
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.15)
      doc.line(marginL, y + rowH, pageW - marginL, y + rowH)
      y += rowH
      rowIndex++
    }
    y += 4
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY)
    doc.text('ACCTKD · Taekwondo FestCup · World Taekwondo', pageW / 2, pageH - 5, { align: 'center' })
    doc.text(`Pág. ${p}/${pages}`, pageW - 10, pageH - 5, { align: 'right' })
  }

  return doc.output('blob')
}

export function descargarFestivalPdf(campeonato, grupos) {
  const blob = buildFestivalPdfBlob(campeonato, grupos)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `festival-kyorugi-${slugArchivo(campeonato?.nombre)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export function descargarFestivalExcel(campeonato, grupos) {
  const activos = gruposActivos(grupos)
  const bloques = activos
    .map((g) => {
      const filas = g.participantes
        .map((p, i) => {
          const bg = i % 2 ? XL.gray : '#ffffff'
          return `<tr>
            ${tdCell(p.nombre, { bg })}
            ${tdCell(p.academia, { bg })}
            ${tdCell(p.division, { bg, align: 'center' })}
            ${tdCell(p.sexo, { bg, align: 'center', bold: true })}
          </tr>`
        })
        .join('')
      return `
        <tr>${thCell('FESTIVAL KYORUGI — ' + g.division, XL.red, '#fff', 4)}</tr>
        <tr>${thCell('NOMBRE Y APELLIDO')}${thCell('INSTITUCION')}${thCell(g.edadLabel)}${thCell('GENERO')}</tr>
        ${filas}
        <tr><td colspan="4" style="height:10px"></td></tr>`
    })
    .join('')

  const total = activos.reduce((s, g) => s + g.total, 0)
  const html = `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 4)}</tr>
      <tr>${thCell('PLANILLA FESTIVAL KYORUGI', XL.red, '#fff', 4)}</tr>
      <tr><td colspan="4">${activos.length} grupos · ${total} participantes</td></tr>
      <tr><td colspan="4" style="height:6px"></td></tr>
      ${bloques}
    </table>`

  descargarExcelHtml(`festival-kyorugi-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Festival Kyorugi', html }])
}
