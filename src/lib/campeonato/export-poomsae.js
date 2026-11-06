'use client'

import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { descargarTablaPdf, buildTablePdfBuffer } from '@/lib/campeonato/export-table-pdf'
import {
  agruparPoomsaeParaOrden,
  bloquePoomsaeTipo,
  parseNombrePoomsae,
  tituloFormaPoomsae,
} from '@/lib/campeonato/poomsae-formas'
import { esModalidadGrupo } from '@/lib/campeonato/validar-grupo'

function categoriasConInscritos(categorias) {
  return (categorias || []).filter((c) => c.inscritos > 0)
}

const POOMSAE_PDF_COLUMNS = [
  { header: 'Orden', width: 16, align: 'center' },
  { header: 'Dorsal', width: 22, align: 'center' },
  { header: 'Competidor', width: 66 },
  { header: 'Academia', width: 52 },
  { header: 'Modalidad', width: 34 },
]

function participanteRows(participantes) {
  return (participantes || []).map((p) => {
    const nombres = p.nombres_llamado || p.nombres
    const esGrupo = (p.miembros_nombres?.length > 1) || esModalidadGrupo(p.modalidad_key)
    return [
      { text: String(p.orden ?? ''), align: 'center', bold: true },
      { text: p.dorsal || '—', align: 'center', bold: true },
      esGrupo ? { text: nombres, multiline: true } : nombres,
      p.academia,
      p.modalidad,
    ]
  })
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
          ? `${catMeta.nombre || cat.nombre_display || cat.nombre} · ${participantes.length} participante(s)`
          : `${catMeta.formaTitulo || tituloFormaPoomsae(parseNombrePoomsae(cat.nombre).forma)} · ${catMeta.nombre || cat.nombre_display || cat.nombre} · ${participantes.length} participante(s)`

      sections.push({
        title,
        rows: participanteRows(participantes),
      })
    }
  }

  return sections
}

function formasCount(sections) {
  return sections.filter((s) => s.formaBanner).length
}

function bloquesExcelPorForma(categorias) {
  const sections = buildPoomsaeExportSectionsPorForma(categorias)
  return sections
    .map((sec) => {
      if (sec.formaBanner) {
        return `<tr>${thCell(sec.formaBanner, XL.dark, '#fff', 5)}</tr>`
      }
      const filas = (sec.rows || [])
        .map((row, i) => {
          const bg = i % 2 ? XL.gray : '#ffffff'
          const [orden, dorsal, nombres, academia, modalidad] = row
          const t = (cell) => (typeof cell === 'object' && cell?.text != null ? cell.text : cell)
          const nombresCell =
            typeof nombres === 'object' && nombres?.multiline
              ? String(t(nombres)).replace(/\n/g, '<br/>')
              : t(nombres)
          const nombresOpts =
            typeof nombres === 'object' && nombres?.multiline
              ? { bg, wrap: true }
              : { bg }
          return `<tr>
            ${tdCell(t(orden), { bg, align: 'center', bold: true })}
            ${tdCell(t(dorsal), { bg, align: 'center', bold: true })}
            ${tdCell(nombresCell, nombresOpts)}
            ${tdCell(academia, { bg })}
            ${tdCell(modalidad, { bg })}
          </tr>`
        })
        .join('')
      return `
        <tr>${thCell(sec.title, XL.gold, '#111', 5)}</tr>
        <tr>${thCell('Orden')}${thCell('Dorsal')}${thCell('Competidor')}${thCell('Academia')}${thCell('Modalidad')}</tr>
        ${filas}
        <tr><td colspan="5" style="height:8px"></td></tr>`
    })
    .join('')
}

export function descargarPoomsaeExcel(campeonato, categorias) {
  const html = `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 5)}</tr>
      <tr>${thCell('ORDEN DE SALIDA — POOMSAE (POR FORMA)', XL.red, '#fff', 5)}</tr>
      <tr><td colspan="5" style="height:6px"></td></tr>
      ${bloquesExcelPorForma(categorias)}
    </table>`

  descargarExcelHtml(`orden-poomsae-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Orden Poomsae', html }])
}

export function poomsaePdfOptsPorForma(campeonato, categorias) {
  const cats = categoriasConInscritos(categorias)
  const sections = buildPoomsaeExportSectionsPorForma(categorias)
  const totalParts = cats.reduce((s, c) => s + c.inscritos, 0)
  return {
    campeonato,
    titulo: 'Orden de salida — Poomsae (por forma)',
    subtitulo: `${formasCount(sections)} bloques · ${cats.length} categorías · ${totalParts} participantes`,
    orientation: 'portrait',
    columns: POOMSAE_PDF_COLUMNS,
    sections,
  }
}

export function descargarPoomsaePdf(campeonato, categorias) {
  const opts = poomsaePdfOptsPorForma(campeonato, categorias)
  descargarTablaPdf(opts, `orden-poomsae-${slugArchivo(campeonato?.nombre)}.pdf`)
}

/** Alias explícito (mismo layout que PDF estándar). */
export function descargarPoomsaePdfPorForma(campeonato, categorias) {
  descargarPoomsaePdf(campeonato, categorias)
}

export function buildPoomsaePdfPorFormaBuffer(campeonato, categorias) {
  return buildTablePdfBuffer(poomsaePdfOptsPorForma(campeonato, categorias))
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
      title: `${c.nombre_display || c.nombre} · ${c.inscritos} participante(s)`,
      rows: participanteRows(c.participantes),
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
