'use client'

/** Descarga un archivo .xls con HTML estilizado (Excel lo abre con colores) */
export function descargarExcelHtml(filename, sheets) {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const parts = sheets.map((sheet, idx) => {
    const name = esc(sheet.name || `Hoja${idx + 1}`)
    return `<div id="${name}">${sheet.html}</div>`
  })

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets>${sheets
    .map(
      (s, i) =>
        `<x:ExcelWorksheet><x:Name>${esc(s.name || `Hoja${i + 1}`).slice(0, 31)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`
    )
    .join('')}</x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  td, th { padding: 4px 8px; vertical-align: middle; }
</style>
</head>
<body>${parts.join('\n')}</body>
</html>`

  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

export const XL = {
  red: '#C0000A',
  dark: '#1e293b',
  blue: '#2563eb',
  blueBg: '#dbeafe',
  redBg: '#fee2e2',
  gold: '#fbbf24',
  goldBg: '#fef3c7',
  gray: '#f3f4f6',
  chung: '#1d4ed8',
  hong: '#dc2626',
  chungBg: '#eff6ff',
  hongBg: '#fef2f2',
  greenBg: '#dcfce7',
}

export function thCell(text, bg = XL.red, color = '#ffffff', colspan = 1) {
  return `<th colspan="${colspan}" style="background:${bg};color:${color};font-weight:bold;text-align:center;border:1px solid #ccc;">${text}</th>`
}

export function tdCell(text, opts = {}) {
  const {
    bg = '#ffffff',
    color = '#111827',
    align = 'left',
    bold = false,
    border = '1px solid #d1d5db',
  } = opts
  return `<td style="background:${bg};color:${color};text-align:${align};font-weight:${bold ? 'bold' : 'normal'};border:${border};">${text ?? ''}</td>`
}

export function slugArchivo(nombre) {
  return (nombre || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)
}
