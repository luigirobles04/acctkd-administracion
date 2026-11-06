'use client'

import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { descargarTablaPdf, buildTablePdfBuffer } from '@/lib/campeonato/export-table-pdf'
import { buildKyorugiPlanillaSections } from '@/lib/campeonato/kyorugi-planilla'

const COLS = [
  { header: '#', width: 14, align: 'center' },
  { header: 'Dorsal', width: 22, align: 'center' },
  { header: 'Competidor', width: 68 },
  { header: 'Academia', width: 52 },
  { header: 'Peso', width: 24 },
]

function pdfOpts(campeonato, bloques, categorias) {
  const sections = buildKyorugiPlanillaSections(bloques)
  const total = (categorias || []).reduce((s, c) => s + c.inscritos, 0)
  return {
    campeonato,
    titulo: 'Planilla Kyorugi',
    subtitulo: `${sections.filter((s) => s.formaBanner).length} divisiones · ${categorias.length} categorías · ${total} competidores (sin festival)`,
    orientation: 'portrait',
    columns: COLS,
    sections,
  }
}

export function descargarKyorugiPlanillaPdf(campeonato, bloques, categorias) {
  descargarTablaPdf(pdfOpts(campeonato, bloques, categorias), `planilla-kyorugi-${slugArchivo(campeonato?.nombre)}.pdf`)
}

export function buildKyorugiPlanillaPdfBuffer(campeonato, bloques, categorias) {
  return buildTablePdfBuffer(pdfOpts(campeonato, bloques, categorias))
}

export function descargarKyorugiPlanillaExcel(campeonato, bloques) {
  const sections = buildKyorugiPlanillaSections(bloques)
  const html = sections
    .map((sec) => {
      if (sec.formaBanner) {
        return `<tr>${thCell(sec.formaBanner, XL.dark, '#fff', 5)}</tr>`
      }
      const filas = (sec.rows || [])
        .map((row, i) => {
          const bg = i % 2 ? XL.gray : '#ffffff'
          const [orden, dorsal, nombres, academia, peso] = row
          const t = (cell) => (typeof cell === 'object' && cell?.text != null ? cell.text : cell)
          return `<tr>
            ${tdCell(t(orden), { bg, align: 'center', bold: true })}
            ${tdCell(t(dorsal), { bg, align: 'center', bold: true })}
            ${tdCell(nombres, { bg })}
            ${tdCell(academia, { bg })}
            ${tdCell(peso, { bg })}
          </tr>`
        })
        .join('')
      return `
        <tr>${thCell(sec.title, XL.gold, '#111', 5)}</tr>
        <tr>${thCell('#')}${thCell('Dorsal')}${thCell('Competidor')}${thCell('Academia')}${thCell('Peso')}</tr>
        ${filas}
        <tr><td colspan="5" style="height:8px"></td></tr>`
    })
    .join('')

  const table = `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 5)}</tr>
      <tr>${thCell('PLANILLA KYORUGI (SIN FESTIVAL)', XL.red, '#fff', 5)}</tr>
      <tr><td colspan="5" style="height:6px"></td></tr>
      ${html}
    </table>`

  descargarExcelHtml(`planilla-kyorugi-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Kyorugi', html: table }])
}
