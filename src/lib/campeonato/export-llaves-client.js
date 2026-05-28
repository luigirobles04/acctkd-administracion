'use client'

import * as XLSX from 'xlsx'
import { agruparPorArea } from '@/lib/campeonato/bracket-export'
import { descargarLlavesBracketPdf, descargarCategoriaBracketPdf } from '@/lib/campeonato/export-bracket-pdf'
import { slugArchivo } from '@/lib/campeonato/export-excel-html'

function filasCategoriaExcel(cat) {
  const rows = []
  rows.push([`Categoría ${cat.nombre}`])
  rows.push([`${cat.inscritos} inscritos · Área ${cat.cancha || '—'}`])
  rows.push([])

  const porRonda = {}
  for (const f of cat.filasCombates || []) {
    if (!porRonda[f.rondaLabel]) porRonda[f.rondaLabel] = []
    porRonda[f.rondaLabel].push(f)
  }

  for (const [ronda, filas] of Object.entries(porRonda)) {
    rows.push([ronda])
    rows.push(['# Combate', 'Pelea', 'Chung (Azul)', 'Academia Chung', 'Hong (Rojo)', 'Academia Hong', 'Ganador'])
    for (const f of filas) {
      rows.push([
        f.numero_combate || '',
        f.match_numero,
        f.chung,
        f.academia_chung,
        f.hong,
        f.academia_hong,
        f.ganador || '—',
      ])
    }
    rows.push([])
  }
  return rows
}

function filasAreaExcel(camp, areaNum, categorias) {
  const rows = [
    [`LLAVES KYORUGI · ${camp} · ÁREA ${areaNum}`],
    [`${categorias.length} categoría(s)`],
    [],
  ]
  for (const cat of categorias) {
    rows.push(...filasCategoriaExcel(cat))
    rows.push([])
  }
  return rows
}

export async function descargarLlavesExcel(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const wb = XLSX.utils.book_new()
  const areas = agruparPorArea(data.categorias)

  const resumenRows = [
    [`LLAVES KYORUGI · ${camp}`],
    [],
    ['Categoría', 'División', 'Género', 'Inscritos', 'Combates', 'Área', 'Llave'],
    ...(data.resumen || []).map((r) => [
      r.categoria,
      r.division,
      r.genero,
      r.inscritos,
      r.combates,
      r.cancha,
      r.llave,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), 'Resumen')

  for (const n of [1, 2, 3]) {
    const cats = areas[n]
    if (!cats.length) continue
    const ws = XLSX.utils.aoa_to_sheet(filasAreaExcel(camp, n, cats))
    ws['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 32 },
      { wch: 28 },
      { wch: 32 },
      { wch: 28 },
      { wch: 32 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, `AREA ${n}`)
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llaves-kyorugi-${slugArchivo(camp)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function descargarLlavesPdf(data) {
  return descargarLlavesBracketPdf(data)
}

export { descargarCategoriaBracketPdf }

export async function fetchExportLlaves(idCampeonato) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/export`, {
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al exportar')
  return json
}
