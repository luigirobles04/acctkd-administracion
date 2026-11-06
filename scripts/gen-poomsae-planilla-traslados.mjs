#!/usr/bin/env node
/**
 * Planilla poomsae completa (como admin): orden + casillas Juez 1–3 al final.
 * node scripts/gen-poomsae-planilla-traslados.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const bundleOut = join(root, 'scripts/.gen-poomsae-planilla-traslados-bundle.mjs')
const OUT_PDF = join(process.env.HOME || '', 'Desktop', 'orden-poomsae-festcup-2026-planilla-jueces.pdf')
const OUT_XLS = join(process.env.HOME || '', 'Desktop', 'orden-poomsae-festcup-2026-planilla-jueces.xls')

for (const f of ['.env.local', '.env']) {
  const p = join(root, f)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (val && !process.env[key]) process.env[key] = val
  }
}

const entry = join(root, 'scripts/.gen-poomsae-planilla-traslados-entry.mjs')
writeFileSync(
  entry,
  `export { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden.js'
export { buildPoomsaePdfPorFormaBuffer, buildPoomsaeExcelHtml } from '@/lib/campeonato/export-poomsae.js'
`,
)

execSync(
  `npx esbuild "${entry}" --bundle --platform=node --format=esm --outfile="${bundleOut}" --alias:@="${join(root, 'src')}" --external:canvas`,
  { stdio: 'inherit', cwd: root },
)

const { fetchOrdenPoomsaeCampeonato, buildPoomsaePdfPorFormaBuffer, buildPoomsaeExcelHtml } = await import(
  `file://${bundleOut}`,
)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: campeonato } = await sb.from('campeonato').select('*').eq('id_campeonato', ID_CAMP).single()
const { categorias } = await fetchOrdenPoomsaeCampeonato(sb, ID_CAMP)

const opts = {
  tituloPdf: 'Orden de salida — Poomsae (por forma) · planilla jueces',
  subtituloHoja: 'ORDEN DE SALIDA — POOMSAE (POR FORMA)',
}

const pdfBuf = buildPoomsaePdfPorFormaBuffer(campeonato, categorias, opts)
writeFileSync(OUT_PDF, pdfBuf)

const tableHtml = buildPoomsaeExcelHtml(campeonato, categorias, opts)
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
const xlsHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Orden Poomsae</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}td,th{padding:4px 8px}</style>
</head><body>${tableHtml}</body></html>`
writeFileSync(OUT_XLS, '\ufeff' + xlsHtml)

console.log(JSON.stringify({ ok: true, OUT_PDF, OUT_XLS }, null, 2))
