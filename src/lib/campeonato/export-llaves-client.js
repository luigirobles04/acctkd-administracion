'use client'

import { agruparPorArea, hojaAreaHtmlExcel } from '@/lib/campeonato/bracket-export'
import { descargarLlavesBracketPdf, descargarCategoriaBracketPdf } from '@/lib/campeonato/export-bracket-pdf'
import { descargarExcelHtml, slugArchivo, tdCell, thCell, XL } from '@/lib/campeonato/export-excel-html'

function resumenHtmlExcel(camp, resumen) {
  let html = `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr>`
  html += `<td style="background:${XL.red};color:#fff;font-weight:bold;font-size:14pt;padding:10px 14px;">LLAVES KYORUGI · ${camp}</td>`
  html += '</tr></table>'
  html += '<table style="border-collapse:collapse;width:100%;font-family:Calibri,Arial,sans-serif;font-size:10pt;">'
  html += `<tr>${thCell('Categoría')}${thCell('División')}${thCell('Género')}${thCell('Inscritos')}${thCell('Combates')}${thCell('Área')}${thCell('Llave')}</tr>`
  for (const r of resumen || []) {
    html += '<tr>'
    html += tdCell(r.categoria, { bold: true })
    html += tdCell(r.division)
    html += tdCell(r.genero)
    html += tdCell(r.inscritos, { align: 'center' })
    html += tdCell(r.combates, { align: 'center' })
    html += tdCell(r.cancha, { align: 'center' })
    html += tdCell(r.llave, { align: 'center', bg: r.llave === 'Sí' ? XL.greenBg : XL.gray })
    html += '</tr>'
  }
  html += '</table>'
  return html
}

export async function descargarLlavesExcel(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const areas = agruparPorArea(data.categorias)

  const sheets = [{ name: 'Resumen', html: resumenHtmlExcel(camp, data.resumen) }]

  for (const n of [1, 2, 3]) {
    const cats = areas[n]
    if (!cats.length) continue
    sheets.push({ name: `AREA ${n}`, html: hojaAreaHtmlExcel(camp, n, cats) })
  }

  descargarExcelHtml(`llaves-kyorugi-${slugArchivo(camp)}`, sheets)
}

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
