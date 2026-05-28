'use client'

import { descargarLlavesBracketPdf, descargarCategoriaBracketPdf } from '@/lib/campeonato/export-bracket-pdf'
import { descargarLlavesExcelXlsx } from '@/lib/campeonato/export-llaves-excel'

export async function descargarLlavesExcel(data) {
  return descargarLlavesExcelXlsx(data)
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
