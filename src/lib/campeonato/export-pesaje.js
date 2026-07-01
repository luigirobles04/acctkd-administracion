'use client'

import { descargarExcelHtml, XL, thCell, tdCell, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { descargarTablaPdf } from '@/lib/campeonato/export-table-pdf'
import { etiquetaPesaje } from '@/lib/campeonato/pesaje'

function nombre(l) {
  const p = l.miembros?.[0]?.perfil
  return p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : (l.dorsal_display || '—')
}
function academia(l) {
  return l.academia_campeonato?.academia?.nombre || l.academia_nombre || '—'
}
function estadoTexto(l) {
  return etiquetaPesaje(l.pesaje_estado, l.pesaje_intentos)
}
function paso(l) {
  return l.pesaje_estado === 'ok' ? 'SÍ' : l.pesaje_estado === 'subido' ? 'RECAT.' : l.pesaje_estado === 'descalificado' ? 'NO' : '—'
}

const ESTADO_COLOR = {
  ok: [27, 125, 58],
  subido: [37, 99, 235],
  reintento: [180, 83, 9],
  descalificado: [192, 0, 10],
}

export function descargarPesajeExcel(campeonato, lineas, meta = {}) {
  const filtroTxt = [meta.categoria, meta.academia].filter(Boolean).join(' · ')
  const filasHtml = lineas
    .map((l, i) => {
      const bg = l.pesaje_estado === 'ok' ? XL.greenBg : l.pesaje_estado === 'descalificado' ? XL.redBg : i % 2 ? XL.gray : '#ffffff'
      return `<tr>
        ${tdCell(l.dorsal_display || '—', { bg, align: 'center', bold: true })}
        ${tdCell(nombre(l), { bg })}
        ${tdCell(academia(l), { bg })}
        ${tdCell(l.categoria?.nombre || '—', { bg })}
        ${tdCell(l.peso_declarado != null ? `${l.peso_declarado} kg` : '—', { bg, align: 'center' })}
        ${tdCell(l.peso_oficial != null ? `${l.peso_oficial} kg` : '—', { bg, align: 'center', bold: true })}
        ${tdCell(`${l.pesaje_intentos || 0}`, { bg, align: 'center' })}
        ${tdCell(paso(l), { bg, align: 'center', bold: true })}
        ${tdCell(estadoTexto(l), { bg })}
      </tr>`
    })
    .join('')

  const html = `
    <table>
      <tr>${thCell(campeonato?.nombre || 'Campeonato', XL.dark, '#fff', 9)}</tr>
      <tr>${thCell(`LISTA DE PESAJE — KYORUGI${filtroTxt ? ` (${filtroTxt})` : ''}`, XL.red, '#fff', 9)}</tr>
      <tr><td colspan="9" style="height:6px"></td></tr>
      <tr>
        ${thCell('Dorsal')}${thCell('Competidor')}${thCell('Academia')}${thCell('Categoría')}
        ${thCell('Peso decl.')}${thCell('Peso oficial')}${thCell('Intentos')}${thCell('¿Pasó?')}${thCell('Resultado')}
      </tr>
      ${filasHtml}
    </table>`

  descargarExcelHtml(`pesaje-${slugArchivo(campeonato?.nombre)}`, [{ name: 'Pesaje', html }])
}

export function descargarPesajePdf(campeonato, lineas, meta = {}) {
  const filtroTxt = [meta.categoria, meta.academia].filter(Boolean).join(' · ')
  const rows = lineas.map((l) => [
    { text: l.dorsal_display || '—', bold: true, align: 'center' },
    nombre(l),
    academia(l),
    l.categoria?.nombre || '—',
    { text: l.peso_declarado != null ? `${l.peso_declarado}` : '—', align: 'center' },
    { text: l.peso_oficial != null ? `${l.peso_oficial}` : '—', align: 'center', bold: true },
    { text: `${l.pesaje_intentos || 0}`, align: 'center' },
    { text: paso(l), align: 'center', bold: true, color: ESTADO_COLOR[l.pesaje_estado] },
    { text: estadoTexto(l), color: ESTADO_COLOR[l.pesaje_estado] },
  ])

  descargarTablaPdf(
    {
      campeonato,
      titulo: 'Lista de pesaje — Kyorugi',
      subtitulo: [filtroTxt, `${lineas.length} competidores`].filter(Boolean).join(' · '),
      orientation: 'landscape',
      columns: [
        { header: 'Dorsal', width: 16, align: 'center' },
        { header: 'Competidor', width: 48 },
        { header: 'Academia', width: 44 },
        { header: 'Categoría', width: 40 },
        { header: 'Peso decl.', width: 16, align: 'center' },
        { header: 'Peso ofic.', width: 16, align: 'center' },
        { header: 'Int.', width: 10, align: 'center' },
        { header: '¿Pasó?', width: 14, align: 'center' },
        { header: 'Resultado', width: 30 },
      ],
      sections: [{ rows }],
    },
    `pesaje-${slugArchivo(campeonato?.nombre)}.pdf`
  )
}
