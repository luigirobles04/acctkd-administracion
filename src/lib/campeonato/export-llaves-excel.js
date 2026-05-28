import ExcelJS from 'exceljs'
import { agruparPorArea } from '@/lib/campeonato/bracket-export'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'
import { slugArchivo } from '@/lib/campeonato/export-excel-html'

const FILL = {
  yellow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
  gray: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } },
  areaBg: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
  white: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
  red: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0000A' } },
  green: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCfce7' } },
}

const BORDER = { style: 'thin', color: { argb: 'FF111111' } }

function safeMerge(ws, r1, c1, r2, c2) {
  try {
    ws.mergeCells(r1, c1, r2, c2)
  } catch {
    /* celda ya fusionada */
  }
}

function applyCell(ws, r, c, spec) {
  const cell = ws.getCell(r, c)
  if (spec.v != null) cell.value = spec.v
  if (spec.chung) cell.font = { bold: true, size: 10, color: { argb: 'FF1D4ED8' }, italic: spec.italic }
  else if (spec.hong) cell.font = { bold: true, size: 10, color: { argb: 'FFDC2626' }, italic: spec.italic }
  else if (spec.bold) cell.font = { ...(cell.font || {}), bold: true, size: spec.small ? 9 : 10, italic: spec.italic }
  else if (spec.small) cell.font = { size: 9, color: { argb: 'FF333333' } }
  if (spec.matchNo) cell.font = { bold: true, size: 13, color: { argb: 'FF111111' } }
  if (spec.align) cell.alignment = { horizontal: spec.align, vertical: 'middle' }
  if (spec.bg === 'yellow') cell.fill = FILL.yellow
  if (spec.bg === 'gray') cell.fill = FILL.gray
  if (spec.bg === 'white') cell.fill = FILL.white
  if (spec.border) {
    cell.border = {
      top: spec.border.top ? BORDER : undefined,
      bottom: spec.border.bottom ? BORDER : undefined,
      left: spec.border.left ? BORDER : undefined,
      right: spec.border.right ? BORDER : undefined,
    }
  }
}

function writeCategoriaCnu(ws, cat, startRow) {
  const layout = layoutCnuBracket(cat.porRonda)
  if (!layout) return startRow

  safeMerge(ws, startRow, 1, startRow, Math.max(12, layout.cols))
  const title = ws.getCell(startRow, 1)
  title.value = `Categoría ${cat.nombre}`
  title.fill = FILL.yellow
  title.font = { bold: true, size: 12 }
  title.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

  let row = startRow + 1
  for (let r = 0; r < layout.rows; r++) {
    ws.getRow(row + r).height = 18
    for (let c = 0; c < layout.cols; c++) {
      const cell = ws.getCell(row + r, c + 1)
      if (c >= 3) cell.fill = FILL.areaBg
      const spec = layout.cells.get(`${r},${c}`)
      if (spec) applyCell(ws, row + r, c + 1, spec)
    }
  }
  return row + layout.rows + 2
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
  safeMerge(ws, 1, 1, 1, 14)
  const h = ws.getCell(1, 1)
  h.value = `ÁREA # ${areaNum} · ${camp}`
  h.fill = FILL.yellow
  h.font = { bold: true, size: 14 }

  ws.getCell(2, 1).value = `${categorias.length} categoría(s)`
  ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF555555' } }

  let row = 4
  for (const cat of categorias) {
    row = writeCategoriaCnu(ws, cat, row)
  }

  ws.columns = [{ width: 5 }, { width: 38 }, { width: 30 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }]
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
