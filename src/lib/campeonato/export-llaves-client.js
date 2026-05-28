'use client'

import { descargarLlavesBracketPdf, descargarCategoriaBracketPdf } from '@/lib/campeonato/export-bracket-pdf'
import { slugArchivo } from '@/lib/campeonato/export-excel-html'

function apiError(json, fallback) {
  const e = json?.error
  if (typeof e === 'string') return e
  if (e?.message) return e.message
  return fallback
}

export async function descargarLlavesExcel(idCampeonato, nombreCamp) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/export/xlsx`, { cache: 'no-store' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(apiError(json, 'Error al exportar Excel'))
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llaves-kyorugi-${slugArchivo(nombreCamp || 'campeonato')}.xlsx`
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
  if (!res.ok) throw new Error(apiError(json, 'Error al exportar'))
  return json
}
