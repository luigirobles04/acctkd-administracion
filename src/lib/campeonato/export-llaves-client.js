'use client'

import { slugArchivo } from '@/lib/campeonato/export-utils'

export function apiError(json, fallback) {
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

async function descargarPdfDesdeApi(url, filename) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(apiError(json, 'Error al exportar PDF'))
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export async function descargarLlavesPdf(idCampeonato, nombreCamp) {
  const slug = slugArchivo(nombreCamp || 'campeonato')
  await descargarPdfDesdeApi(
    `/api/admin/campeonatos/${idCampeonato}/llaves/export/pdf`,
    `llaves-graficas-${slug}.pdf`
  )
}

export async function descargarCategoriaBracketPdf(idCampeonato, idCategoria, nombreCategoria) {
  const slug = slugArchivo(nombreCategoria || 'categoria')
  await descargarPdfDesdeApi(
    `/api/admin/campeonatos/${idCampeonato}/llaves/export/pdf?categoria=${idCategoria}`,
    `llave-${slug}.pdf`
  )
}

export async function fetchExportLlaves(idCampeonato) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/export`, {
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(apiError(json, 'Error al exportar'))
  return json
}
