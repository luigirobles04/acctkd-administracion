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

function rowHighlightBg(row) {
  return (row || []).some((cell) => cell && typeof cell === 'object' && cell.highlight)
}

function pdfOpts(campeonato, bloques, categorias, opts = {}) {
  const sections = buildKyorugiPlanillaSections(bloques, opts)
  const total = (categorias || []).reduce((s, c) => s + c.inscritos, 0)
  const baseSub = `${sections.filter((s) => s.formaBanner).length} divisiones · ${categorias.length} categorías · ${total} competidores (sin festival)`
  return {
    campeonato,
    titulo: opts.tituloPdf || 'Planilla Kyorugi',
    subtitulo: opts.subtituloPdf ? `${opts.subtituloPdf} · ${baseSub}` : baseSub,
    orientation: 'portrait',
    columns: COLS,
    sections,
  }
}

function planillaKyorugiTableHtml(campeonato, bloques, opts = {}) {
  const sections = buildKyorugiPlanillaSections(bloques, opts)
  const html = sections
    .map((sec) => {
      if (sec.formaBanner) {
        const esGenero = sec.formaBanner === 'MASCULINO' || sec.formaBanner === 'FEMENINO'
        const bg = esGenero ? XL.red : XL.dark
        return `<tr>${thCell(sec.formaBanner, bg, '#fff', 5)}</tr>`
      }
      const filas = (sec.rows || [])
        .map((row, i) => {
          const hi = rowHighlightBg(row)
          const bg = hi ? XL.greenBg : i % 2 ? XL.gray : '#ffffff'
          const border = hi ? '2px solid #16a34a' : '1px solid #d1d5db'
          const [orden, dorsal, nombres, academia, peso] = row
          const t = (cell) => (typeof cell === 'object' && cell?.text != null ? cell.text : cell)
          const cellOpts = (extra = {}) => ({ bg, border, ...extra })
          return `<tr>
            ${tdCell(t(orden), cellOpts({ align: 'center', bold: true }))}
            ${tdCell(t(dorsal), cellOpts({ align: 'center', bold: true }))}
            ${tdCell(t(nombres), cellOpts())}
            ${tdCell(t(academia), cellOpts())}
            ${tdCell(t(peso), cellOpts())}
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

  return `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 5)}</tr>
      <tr>${thCell(opts.subtituloHoja || 'PLANILLA KYORUGI (SIN FESTIVAL)', XL.red, '#fff', 5)}</tr>
      ${opts.notaResaltado ? `<tr><td colspan="5" style="background:${XL.greenBg};padding:8px;font-size:10pt;border-bottom:2px solid #16a34a;">${opts.notaResaltado}</td></tr>` : ''}
      <tr><td colspan="5" style="height:6px"></td></tr>
      ${html}
    </table>`
}

export function buildKyorugiPlanillaExcelHtml(campeonato, bloques, opts = {}) {
  return planillaKyorugiTableHtml(campeonato, bloques, opts)
}

export function descargarKyorugiPlanillaPdf(campeonato, bloques, categorias, opts = {}) {
  descargarTablaPdf(
    pdfOpts(campeonato, bloques, categorias, opts),
    `planilla-kyorugi-${slugArchivo(campeonato?.nombre)}.pdf`,
  )
}

export function buildKyorugiPlanillaPdfBuffer(campeonato, bloques, categorias, opts = {}) {
  return buildTablePdfBuffer(pdfOpts(campeonato, bloques, categorias, opts))
}

export function descargarKyorugiPlanillaExcel(campeonato, bloques, opts = {}) {
  const table = planillaKyorugiTableHtml(campeonato, bloques, opts)
  descargarExcelHtml(`planilla-kyorugi-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Kyorugi', html: table }])
}
