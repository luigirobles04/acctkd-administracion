'use client'

import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { descargarTablaPdf } from '@/lib/campeonato/export-table-pdf'

function categoriasConInscritos(categorias) {
  return (categorias || []).filter((c) => c.inscritos > 0)
}

export function descargarPoomsaeExcel(campeonato, categorias) {
  const cats = categoriasConInscritos(categorias)
  const bloques = cats
    .map((c) => {
      const filas = c.participantes
        .map((p, i) => {
          const bg = i % 2 ? XL.gray : '#ffffff'
          return `<tr>
            ${tdCell(p.orden, { bg, align: 'center', bold: true })}
            ${tdCell(p.dorsal || '—', { bg, align: 'center', bold: true })}
            ${tdCell(p.nombres, { bg })}
            ${tdCell(p.academia, { bg })}
            ${tdCell(p.modalidad, { bg })}
          </tr>`
        })
        .join('')
      return `
        <tr>${thCell(`${c.nombre} — ${c.division || ''} ${c.genero || ''} (${c.inscritos})`, XL.gold, '#111', 5)}</tr>
        <tr>${thCell('Orden')}${thCell('Dorsal')}${thCell('Competidor')}${thCell('Academia')}${thCell('Modalidad')}</tr>
        ${filas}
        <tr><td colspan="5" style="height:8px"></td></tr>`
    })
    .join('')

  const html = `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 5)}</tr>
      <tr>${thCell('ORDEN DE SALIDA — POOMSAE', XL.red, '#fff', 5)}</tr>
      <tr><td colspan="5" style="height:6px"></td></tr>
      ${bloques}
    </table>`

  descargarExcelHtml(`orden-poomsae-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Orden Poomsae', html }])
}

export function descargarPoomsaePdf(campeonato, categorias) {
  const cats = categoriasConInscritos(categorias)
  const sections = cats.map((c) => ({
    title: `${c.nombre} — ${c.division || ''} ${c.genero || ''} · ${c.inscritos} participante(s)`,
    rows: c.participantes.map((p) => [
      { text: String(p.orden), align: 'center', bold: true },
      { text: p.dorsal || '—', align: 'center', bold: true },
      p.nombres,
      p.academia,
      p.modalidad,
    ]),
  }))

  descargarTablaPdf(
    {
      campeonato,
      titulo: 'Orden de salida — Poomsae',
      subtitulo: `${cats.length} categorías · ${cats.reduce((s, c) => s + c.inscritos, 0)} participantes`,
      orientation: 'portrait',
      columns: [
        { header: 'Orden', width: 16, align: 'center' },
        { header: 'Dorsal', width: 22, align: 'center' },
        { header: 'Competidor', width: 66 },
        { header: 'Academia', width: 52 },
        { header: 'Modalidad', width: 34 },
      ],
      sections,
    },
    `orden-poomsae-${slugArchivo(campeonato?.nombre)}.pdf`
  )
}

/** Export de una sola categoría (PDF). */
export function descargarPoomsaeCategoriaPdf(campeonato, categoria) {
  descargarPoomsaePdf(campeonato, [categoria])
}
