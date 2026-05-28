'use client'

import ExcelJS from 'exceljs'
import { agruparPorArea, emparejamientosPrimeraRonda } from '@/lib/campeonato/bracket-export'
import { slugArchivo } from '@/lib/campeonato/export-excel-html'

const FILL = {
  yellow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
  gray: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } },
  white: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
  red: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0000A' } },
  green: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCfce7' } },
}

const BORDER_THIN = { style: 'thin', color: { argb: 'FF111111' } }
const BORDER_MED = { style: 'medium', color: { argb: 'FF111111' } }

function setBorder(cell, sides) {
  cell.border = sides
}

function addResumenSheet(wb, camp, resumen) {
  const ws = wb.addWorksheet('Resumen')
  ws.mergeCells(1, 1, 1, 7)
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
    setBorder(c, { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN })
  })

  let row = 4
  for (const r of resumen || []) {
    const vals = [r.categoria, r.division, r.genero, r.inscritos, r.combates, r.cancha, r.llave]
    vals.forEach((v, i) => {
      const c = ws.getCell(row, i + 1)
      c.value = v ?? ''
      if (i === 0) c.font = { bold: true }
      if (r.llave === 'Sí' && i === 6) c.fill = FILL.green
      setBorder(c, { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN })
    })
    row++
  }

  ws.columns = [{ width: 36 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 8 }]
}

function writeBracketCategoria(ws, cat, startRow) {
  const pairs = emparejamientosPrimeraRonda(cat.porRonda)
  if (!pairs.length) return startRow

  let row = startRow
  ws.mergeCells(row, 1, row, 7)
  const title = ws.getCell(row, 1)
  title.value = `Categoría ${cat.nombre}`
  title.fill = FILL.yellow
  title.font = { bold: true, size: 12 }
  setBorder(title, { top: BORDER_MED, bottom: BORDER_MED, left: BORDER_MED, right: BORDER_MED })
  row++

  pairs.forEach((pair, idx) => {
    const seedA = idx * 2 + 1
    const seedB = idx * 2 + 2
    const chung = pair.chung || { nombre: 'POR DEFINIR', academia: '', vacio: true }
    const hong = pair.hong || { nombre: 'POR DEFINIR', academia: '', vacio: true }

    const r1 = row
    ws.getCell(r1, 1).value = seedA
    ws.getCell(r1, 1).fill = FILL.white
    ws.getCell(r1, 2).value = chung.nombre
    ws.getCell(r1, 2).font = { bold: !chung.vacio, italic: chung.vacio, color: chung.vacio ? { argb: 'FF888888' } : undefined }
    ws.getCell(r1, 2).fill = FILL.gray
    ws.getCell(r1, 3).value = chung.academia || ''
    ws.getCell(r1, 3).fill = FILL.gray
    ws.getCell(r1, 3).font = { size: 9, color: { argb: 'FF333333' } }
    for (let col = 4; col <= 6; col++) {
      ws.getCell(r1, col).fill = FILL.white
      setBorder(ws.getCell(r1, col), { top: BORDER_THIN, right: col === 4 || col === 6 ? BORDER_THIN : undefined })
    }
    setBorder(ws.getCell(r1, 1), { top: BORDER_MED, left: BORDER_MED })
    setBorder(ws.getCell(r1, 2), { top: BORDER_MED })
    setBorder(ws.getCell(r1, 3), { top: BORDER_MED })

    const r2 = row + 1
    for (let col = 1; col <= 3; col++) ws.getCell(r2, col).fill = col === 1 ? FILL.white : FILL.gray
    setBorder(ws.getCell(r2, 1), { left: BORDER_MED })
    for (let col = 4; col <= 6; col++) {
      setBorder(ws.getCell(r2, col), { right: BORDER_THIN })
    }

    const r3 = row + 2
    ws.getCell(r3, 1).value = seedB
    ws.getCell(r3, 1).fill = FILL.white
    ws.getCell(r3, 2).value = hong.nombre
    ws.getCell(r3, 2).font = { bold: !hong.vacio, italic: hong.vacio, color: hong.vacio ? { argb: 'FF888888' } : undefined }
    ws.getCell(r3, 2).fill = FILL.gray
    ws.getCell(r3, 3).value = hong.academia || ''
    ws.getCell(r3, 3).fill = FILL.gray
    ws.getCell(r3, 3).font = { size: 9, color: { argb: 'FF333333' } }
    for (let col = 4; col <= 6; col++) {
      ws.getCell(r3, col).fill = FILL.white
      setBorder(ws.getCell(r3, col), { bottom: BORDER_THIN, right: col === 4 || col === 6 ? BORDER_THIN : undefined })
    }
    setBorder(ws.getCell(r3, 1), { bottom: BORDER_MED, left: BORDER_MED })
    setBorder(ws.getCell(r3, 2), { bottom: BORDER_MED })
    setBorder(ws.getCell(r3, 3), { bottom: BORDER_MED })

    row += 3
    if (idx < pairs.length - 1) row++
  })

  return row + 2
}

function addAreaSheet(wb, camp, areaNum, categorias) {
  const ws = wb.addWorksheet(`AREA ${areaNum}`)
  ws.mergeCells(1, 1, 1, 7)
  const h = ws.getCell(1, 1)
  h.value = `LLAVES KYORUGI · ${camp} · ÁREA ${areaNum}`
  h.fill = FILL.red
  h.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }

  ws.getCell(2, 1).value = `${categorias.length} categoría(s) en esta área`
  ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF555555' } }

  let row = 4
  for (const cat of categorias) {
    row = writeBracketCategoria(ws, cat, row)
  }

  ws.columns = [{ width: 6 }, { width: 34 }, { width: 28 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 6 }]
}

export async function descargarLlavesExcelXlsx(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const areas = agruparPorArea(data.categorias)
  const wb = new ExcelJS.Workbook()

  addResumenSheet(wb, camp, data.resumen)
  for (const n of [1, 2, 3]) {
    const cats = areas[n]
    if (!cats.length) continue
    addAreaSheet(wb, camp, n, cats)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llaves-kyorugi-${slugArchivo(camp)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
