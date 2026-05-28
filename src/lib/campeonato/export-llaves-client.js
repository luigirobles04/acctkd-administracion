'use client'

import autoTable from 'jspdf-autotable'
import { jsPDF } from 'jspdf'
import { agruparPorArea, hojaAreaHtmlExcel } from '@/lib/campeonato/bracket-export'
import { descargarLlavesBracketPdf, descargarCategoriaBracketPdf } from '@/lib/campeonato/export-bracket-pdf'
import { descargarExcelHtml, tdCell, thCell, XL, slugArchivo } from '@/lib/campeonato/export-excel-html'

export async function descargarLlavesExcel(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const areas = agruparPorArea(data.categorias)
  const sheets = []

  let resHtml = `<table><tr>${thCell('LLAVES KYORUGI · RESUMEN', XL.red, '#fff', 7)}</tr></table>`
  resHtml += `<p style="font-size:11pt;margin:8px 0;">${camp} · ${data.totales?.competidores || 0} competidores · ${data.totales?.categorias || 0} categorías</p>`
  resHtml += '<table><thead><tr>'
  resHtml += ['Categoría', 'División', 'Género', 'Inscritos', 'Combates', 'Área', 'Llave'].map((c) => thCell(c, XL.dark)).join('')
  resHtml += '</tr></thead><tbody>'
  ;(data.resumen || []).forEach((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : XL.gray
    resHtml += '<tr>'
    resHtml += tdCell(r.categoria, { bg, bold: true })
    resHtml += tdCell(r.division, { bg, align: 'center' })
    resHtml += tdCell(r.genero, { bg, align: 'center' })
    resHtml += tdCell(r.inscritos, { bg, align: 'center' })
    resHtml += tdCell(r.combates, { bg, align: 'center' })
    resHtml += tdCell(r.cancha, { bg, align: 'center' })
    resHtml += tdCell(r.llave, { bg: r.llave === 'Sí' ? XL.greenBg : XL.redBg, align: 'center', bold: true })
    resHtml += '</tr>'
  })
  resHtml += '</tbody></table>'
  sheets.push({ name: 'Resumen', html: resHtml })

  for (const n of [1, 2, 3]) {
    const cats = areas[n]
    if (!cats.length) continue
    sheets.push({ name: `AREA ${n}`, html: hojaAreaHtmlExcel(camp, n, cats) })
  }

  descargarExcelHtml(`llaves-kyorugi-${slugArchivo(camp)}`, sheets)
}

/** PDF tabular (resumen + listado) — respaldo */
export async function descargarLlavesPdfTabla(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const camp = data.campeonato?.nombre || 'Campeonato'
  let y = 14

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Llaves Kyorugi · ACCTKD', 14, y)
  y += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(camp, 14, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Div.', 'Gén.', 'Insc.', 'Combates', 'Área']],
    body: (data.resumen || []).map((r) => [
      r.categoria,
      r.division,
      r.genero,
      r.inscritos,
      r.combates,
      r.cancha,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [192, 0, 10] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`llaves-resumen-${slugArchivo(camp)}.pdf`)
}

/** PDF gráfico estilo Campeonato Nacional Universitario */
export async function descargarLlavesPdf(data) {
  return descargarLlavesBracketPdf(data)
}

export { descargarCategoriaBracketPdf }

export async function fetchExportLlaves(idCampeonato) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/export`, {
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al exportar')
  return json
}
