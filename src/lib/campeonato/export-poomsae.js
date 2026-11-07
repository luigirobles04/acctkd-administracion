'use client'

import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { descargarTablaPdf, buildTablePdfBuffer } from '@/lib/campeonato/export-table-pdf'
import {
  agruparPoomsaeParaOrden,
  bloquePoomsaeTipo,
  parseNombrePoomsae,
  tituloFormaPoomsae,
} from '@/lib/campeonato/poomsae-formas'
function categoriasConInscritos(categorias) {
  return (categorias || []).filter((c) => c.inscritos > 0)
}

const POOMSAE_PDF_COLUMNS = [
  { header: 'Orden', width: 14, align: 'center' },
  { header: 'Dorsal', width: 18, align: 'center' },
  { header: 'Competidor', width: 52 },
  { header: 'Academia', width: 48 },
  { header: 'Juez 1', width: 20, align: 'center', minRowHeightMm: 12 },
  { header: 'Juez 2', width: 20, align: 'center', minRowHeightMm: 12 },
  { header: 'Juez 3', width: 20, align: 'center', minRowHeightMm: 12 },
]

const PUESTOS_EN_BLANCO = 50

function filasPoomsaeEnBlanco() {
  return Array.from({ length: PUESTOS_EN_BLANCO }, (_, i) => [
    { text: String(i + 1), align: 'center', bold: true },
    { text: '', align: 'center' },
    { text: '' },
    { text: '' },
    { text: '', align: 'center' },
    { text: '', align: 'center' },
    { text: '', align: 'center' },
  ])
}

/** Secciones export: KIBOM/PAL JANG… · bloques PAREJAS y EQUIPOS · sin duplicar líneas */
export function buildPoomsaeExportSectionsPorForma(categorias) {
  const byGrupo = new Map(categoriasConInscritos(categorias).map((c) => [c.grupo_key, c]))
  const bloques = agruparPoomsaeParaOrden(categorias)
  const sections = []
  const lineasVistas = new Set()

  for (const bloque of bloques) {
    sections.push({ formaBanner: bloque.banner })

    for (const catMeta of bloque.categorias) {
      const cat = byGrupo.get(catMeta.grupo_key)
      if (!cat?.participantes?.length) continue

      const participantes = cat.participantes
        .filter((p) => {
          if (lineasVistas.has(p.id_linea)) return false
          lineasVistas.add(p.id_linea)
          return true
        })
        .slice()
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

      if (!participantes.length) continue

      const title =
        bloque.kind === 'forma'
          ? `${catMeta.nombre || cat.nombre_display || cat.nombre}`
          : `${catMeta.formaTitulo || tituloFormaPoomsae(parseNombrePoomsae(cat.nombre).forma)} · ${catMeta.nombre || cat.nombre_display || cat.nombre}`

      sections.push({
        title,
        rows: filasPoomsaeEnBlanco(),
      })
    }
  }

  return sections
}

function formasCount(sections) {
  return sections.filter((s) => s.formaBanner).length
}

function rowHighlightBg(row) {
  return (row || []).some((cell) => cell && typeof cell === 'object' && cell.highlight)
}

function bloquesExcelPorForma(categorias, opts = {}) {
  const sections = buildPoomsaeExportSectionsPorForma(categorias, opts)
  return sections
    .map((sec) => {
      if (sec.formaBanner) {
        return `<tr>${thCell(sec.formaBanner, XL.dark, '#fff', 7)}</tr>`
      }
      const filas = (sec.rows || [])
        .map((row, i) => {
          const hi = rowHighlightBg(row)
          const bg = hi ? XL.greenBg : i % 2 ? XL.gray : '#ffffff'
          const border = hi ? '2px solid #16a34a' : '1px solid #d1d5db'
          const [orden, dorsal, nombres, academia, j1, j2, j3] = row
          const t = (cell) => (typeof cell === 'object' && cell?.text != null ? cell.text : cell)
          const nombresCell =
            typeof nombres === 'object' && nombres?.multiline
              ? String(t(nombres)).replace(/\n/g, '<br/>')
              : t(nombres)
          const cellOpts = (extra = {}) => ({ bg, border, ...extra })
          const nombresOpts =
            typeof nombres === 'object' && nombres?.multiline
              ? cellOpts({ wrap: true })
              : cellOpts()
          const casillaJuezHtml = (cell) =>
            `<td style="background:${bg};border:${border};width:56px;height:48px;min-height:48px;text-align:center;vertical-align:middle;">${t(cell) ?? ''}</td>`
          return `<tr>
            ${tdCell(t(orden), cellOpts({ align: 'center', bold: true }))}
            ${tdCell(t(dorsal), cellOpts({ align: 'center', bold: true }))}
            ${tdCell(nombresCell, nombresOpts)}
            ${tdCell(t(academia), cellOpts())}
            ${casillaJuezHtml(j1)}
            ${casillaJuezHtml(j2)}
            ${casillaJuezHtml(j3)}
          </tr>`
        })
        .join('')
      return `
        <tr>${thCell(sec.title, XL.gold, '#111', 7)}</tr>
        <tr>${thCell('Orden')}${thCell('Dorsal')}${thCell('Competidor')}${thCell('Academia')}${thCell('Juez 1')}${thCell('Juez 2')}${thCell('Juez 3')}</tr>
        ${filas}
        <tr><td colspan="7" style="height:8px"></td></tr>`
    })
    .join('')
}

export function buildPoomsaeExcelHtml(campeonato, categorias, opts = {}) {
  return `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 7)}</tr>
      <tr>${thCell(opts.subtituloHoja || 'ORDEN DE SALIDA — POOMSAE (POR FORMA)', XL.red, '#fff', 7)}</tr>
      ${opts.notaResaltado ? `<tr><td colspan="7" style="background:${XL.greenBg};padding:8px;font-size:10pt;border-bottom:2px solid #16a34a;">${opts.notaResaltado}</td></tr>` : ''}
      <tr><td colspan="7" style="height:6px"></td></tr>
      ${bloquesExcelPorForma(categorias, opts)}
    </table>`
}

export function descargarPoomsaeExcel(campeonato, categorias, opts = {}) {
  const html = buildPoomsaeExcelHtml(campeonato, categorias, opts)
  descargarExcelHtml(`orden-poomsae-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Orden Poomsae', html }])
}

export function poomsaePdfOptsPorForma(campeonato, categorias, opts = {}) {
  const cats = categoriasConInscritos(categorias)
  const sections = buildPoomsaeExportSectionsPorForma(categorias, opts)
  const totalParts = cats.reduce((s, c) => s + c.inscritos, 0)
  const baseSub = `${formasCount(sections)} bloques · ${cats.length} categorías · ${totalParts} participantes`
  return {
    campeonato,
    titulo: opts.tituloPdf || 'Orden de salida — Poomsae (por forma)',
    subtitulo: opts.subtituloPdf ? `${baseSub} · ${opts.subtituloPdf}` : baseSub,
    orientation: 'portrait',
    columns: POOMSAE_PDF_COLUMNS,
    sections,
  }
}

export function descargarPoomsaePdf(campeonato, categorias, opts = {}) {
  const pdfOpts = poomsaePdfOptsPorForma(campeonato, categorias, opts)
  descargarTablaPdf(pdfOpts, `orden-poomsae-${slugArchivo(campeonato?.nombre)}.pdf`)
}

/** Alias explícito (mismo layout que PDF estándar). */
export function descargarPoomsaePdfPorForma(campeonato, categorias, opts = {}) {
  descargarPoomsaePdf(campeonato, categorias, opts)
}

export function buildPoomsaePdfPorFormaBuffer(campeonato, categorias, opts = {}) {
  return buildTablePdfBuffer(poomsaePdfOptsPorForma(campeonato, categorias, opts))
}

/** @deprecated usar buildPoomsaeExportSectionsPorForma */
export function buildPoomsaePdfSectionsPorForma(categorias) {
  return buildPoomsaeExportSectionsPorForma(categorias)
}

/** Export de una sola categoría (PDF). */
export function descargarPoomsaeCategoriaPdf(campeonato, categoria) {
  const c = categoriasConInscritos([categoria])[0]
  if (!c) return
  const { forma } = parseNombrePoomsae(c.nombre)
  const tipo = bloquePoomsaeTipo(c.modalidad_key)
  const banner =
    tipo === 'parejas' ? 'PAREJAS' : tipo === 'equipos' ? 'EQUIPOS' : tituloFormaPoomsae(forma)
  const sections = [
    { formaBanner: banner },
    {
      title: `${c.nombre_display || c.nombre}`,
      rows: filasPoomsaeEnBlanco(),
    },
  ]
  descargarTablaPdf(
    {
      campeonato,
      titulo: 'Orden de salida — Poomsae',
      subtitulo: c.nombre_display || c.nombre,
      orientation: 'portrait',
      columns: POOMSAE_PDF_COLUMNS,
      sections,
    },
    `orden-poomsae-${slugArchivo(c.nombre)}.pdf`,
  )
}
