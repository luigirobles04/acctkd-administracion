import ExcelJS from 'exceljs'
import { agruparPorArea } from '@/lib/campeonato/bracket-export'
import { layoutFestcupBracket } from '@/lib/campeonato/bracket-festcup-layout'
import { slugArchivo } from '@/lib/campeonato/export-utils'

const FILL = {
  yellow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
  white: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
  red: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0000A' } },
  green: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCfce7' } },
}

const BORDER = { style: 'thin', color: { argb: 'FF000000' } }

function safeMerge(ws, r1, c1, r2, c2) {
  try {
    ws.mergeCells(r1, c1, r2, c2)
  } catch {
    /* celda ya fusionada */
  }
}

function applyCell(ws, r, c, spec) {
  const cell = ws.getCell(r, c)
  cell.fill = FILL.white
  if (spec.v != null) cell.value = spec.v
  if (spec.chung) cell.font = { bold: true, size: 10, color: { argb: 'FF000000' }, italic: spec.italic }
  else if (spec.hong) cell.font = { bold: true, size: 10, color: { argb: 'FF000000' }, italic: spec.italic }
  else if (spec.bold) cell.font = { ...(cell.font || {}), bold: true, size: spec.small ? 9 : 10, italic: spec.italic }
  else if (spec.small) cell.font = { size: 9, color: { argb: 'FF333333' } }
  else if (spec.italic) cell.font = { size: 10, italic: true, color: { argb: 'FF666666' } }
  if (spec.matchNo) cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } }
  if (spec.align) cell.alignment = { horizontal: spec.align, vertical: 'middle', wrapText: false }
  if (spec.border) {
    cell.border = {
      top: spec.border.top ? BORDER : undefined,
      bottom: spec.border.bottom ? BORDER : undefined,
      left: spec.border.left ? BORDER : undefined,
      right: spec.border.right ? BORDER : undefined,
    }
  }
}

function writeCategoriaFestcup(ws, cat, startRow) {
  const layout = layoutFestcupBracket(cat.porRonda, { cancha: cat.cancha })
  if (!layout) return startRow

  const mergeEnd = Math.max(8, layout.cols)
  safeMerge(ws, startRow, 2, startRow, mergeEnd)
  const title = ws.getCell(startRow, 2)
  title.value = `Categoría ${cat.nombre}`
  title.fill = FILL.yellow
  title.font = { bold: true, size: 11 }
  title.alignment = { vertical: 'middle' }

  let row = startRow + 2
  for (let r = 0; r < layout.rows; r++) {
    ws.getRow(row + r).height = 15
    for (let c = 0; c < layout.cols; c++) {
      const spec = layout.cells.get(`${r},${c}`)
      applyCell(ws, row + r, c + 1, spec || { bg: 'white' })
    }
  }
  return row + layout.rows + 3
}

function addResumenSheet(wb, camp, resumen) {
  const ws = wb.addWorksheet('Resumen')
  safeMerge(ws, 1, 1, 1, 7)
  const h = ws.getCell(1, 1)
  h.value = `LLAVES KYORUGI · ${camp}`
  h.fill = FILL.red
  h.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }

  const headers = ['Categoría', 'División', 'Género', 'Inscritos', 'Combates', 'Área', 'Llave']
  headers.forEach((t, i) => {
    const c = ws.getCell(3, i + 1)
    c.value = t
    c.fill = FILL.red
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })

  let row = 4
  for (const r of resumen || []) {
    ws.getCell(row, 1).value = r.categoria
    ws.getCell(row, 2).value = r.division
    ws.getCell(row, 3).value = r.genero
    ws.getCell(row, 4).value = r.inscritos
    ws.getCell(row, 5).value = r.combates
    ws.getCell(row, 6).value = r.cancha
    ws.getCell(row, 7).value = r.llave
    if (r.llave === 'Sí') ws.getCell(row, 7).fill = FILL.green
    row++
  }
  ws.columns = [{ width: 36 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 8 }]
}

function addAreaSheet(wb, camp, areaNum, categorias) {
  const ws = wb.addWorksheet(`AREA ${areaNum}`)
  ws.views = [{ showGridLines: false, state: 'normal' }]

  safeMerge(ws, 1, 2, 1, 9)
  const h = ws.getCell(1, 2)
  h.value = `ÁREA # ${areaNum}`
  h.fill = FILL.yellow
  h.font = { bold: true, size: 14 }
  h.alignment = { vertical: 'middle' }

  let row = 3
  for (const cat of categorias) {
    row = writeCategoriaFestcup(ws, cat, row)
  }

  ws.columns = [
    { width: 4 },
    { width: 32 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
    { width: 3 },
  ]
}

/** Genera buffer xlsx en servidor (ExcelJS no corre bien en browser) */
export async function buildLlavesExcelBuffer(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const areas = agruparPorArea(data.categorias)
  const wb = new ExcelJS.Workbook()

  addResumenSheet(wb, camp, data.resumen)
  for (const n of [1, 2, 3]) {
    const cats = areas[n]
    if (!cats.length) continue
    addAreaSheet(wb, camp, n, cats)
  }

  return wb.xlsx.writeBuffer()
}

export async function buildLlavesExcelResponse(data) {
  const buffer = await buildLlavesExcelBuffer(data)
  const camp = data.campeonato?.nombre || 'Campeonato'
  const filename = `llaves-kyorugi-${slugArchivo(camp)}.xlsx`
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
