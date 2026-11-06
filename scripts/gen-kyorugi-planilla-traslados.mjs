#!/usr/bin/env node
/**
 * Planilla kyorugi completa (como admin) con filas de traslados/consolidaciones resaltadas.
 * node scripts/gen-kyorugi-planilla-traslados.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const bundleOut = join(root, 'scripts/.gen-kyorugi-planilla-traslados-bundle.mjs')
const OUT_PDF = join(process.env.HOME || '', 'Desktop', 'planilla-kyorugi-festcup-2026-traslados-resaltados.pdf')
const OUT_XLS = join(process.env.HOME || '', 'Desktop', 'planilla-kyorugi-festcup-2026-traslados-resaltados.xls')
const OUT_HTML = join(process.env.HOME || '', 'Desktop', 'festcup-kyorugi-traslados-2026-11-06.html')

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

const entry = join(root, 'scripts/.gen-kyorugi-planilla-traslados-entry.mjs')
writeFileSync(
  entry,
  `export { fetchPlanillaKyorugiCampeonato } from '@/lib/campeonato/kyorugi-planilla.js'
export { buildKyorugiPlanillaPdfBuffer, buildKyorugiPlanillaExcelHtml } from '@/lib/campeonato/export-kyorugi-planilla.js'
`,
)

execSync(
  `npx esbuild "${entry}" --bundle --platform=node --format=esm --outfile="${bundleOut}" --alias:@="${join(root, 'src')}" --external:canvas`,
  { stdio: 'inherit', cwd: root },
)

const { fetchPlanillaKyorugiCampeonato, buildKyorugiPlanillaPdfBuffer, buildKyorugiPlanillaExcelHtml } =
  await import(`file://${bundleOut}`)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bitacora } = await sb
  .from('bitacora_inscripcion')
  .select('id_linea, accion, linea_inscripcion!inner(id_campeonato, modalidad)')
  .eq('linea_inscripcion.id_campeonato', ID_CAMP)
  .in('accion', ['consolidacion_kyorugi', 'traslado_categoria_kyorugi'])
  .gte('created_at', '2026-11-06T00:00:00Z')

const RESALTAR = new Set(
  (bitacora || [])
    .filter((b) => b.linea_inscripcion?.modalidad === 'kyorugi_individual')
    .map((b) => b.id_linea),
)

const { campeonato, categorias, bloques } = await fetchPlanillaKyorugiCampeonato(sb, ID_CAMP)

const opts = {
  resaltarIdLineas: RESALTAR,
  tituloPdf: 'Planilla Kyorugi — traslados admin',
  subtituloPdf: 'Filas en verde = consolidación o paso de categoría (6 nov 2026)',
  subtituloHoja: 'PLANILLA KYORUGI · TRASLADOS RESALTADOS',
  notaResaltado:
    'Filas en verde: competidores movidos de categoría (consolidación/paso admin 6 nov 2026). No incluye festival (U-C-57, FY-290).',
}

const pdfBuf = buildKyorugiPlanillaPdfBuffer(campeonato, bloques, categorias, opts)
writeFileSync(OUT_PDF, pdfBuf)

const tableHtml = buildKyorugiPlanillaExcelHtml(campeonato, bloques, opts)
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
const xlsHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Kyorugi</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}td,th{padding:4px 8px}</style>
</head><body>${tableHtml}</body></html>`
writeFileSync(OUT_XLS, '\ufeff' + xlsHtml)

const { data: lineasResaltadas } = await sb
  .from('linea_inscripcion')
  .select(`
    id_linea, dorsal_display,
    categoria_campeonato(nombre),
    miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
  `)
  .in('id_linea', [...RESALTAR])
  .eq('modalidad', 'kyorugi_individual')
  .order('dorsal_display')

const listaHtml = (lineasResaltadas || [])
  .map((l) => {
    const p = l.miembros?.[0]?.perfil
    const nom = p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '—'
    return `<tr><td>${esc(l.dorsal_display)}</td><td>${esc(nom)}</td><td>${esc(l.categoria_campeonato?.nombre || '—')}</td></tr>`
  })
  .join('\n')

writeFileSync(
  OUT_HTML,
  `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Kyorugi traslados FestCup 2026</title>
<style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#111;color:#fff}tr:nth-child(even){background:#f5f5f5}.verde{background:#dcfce7}</style></head>
<body><h1>FestCup 2026 — Kyorugi movidos (admin)</h1>
<p>Planilla completa con filas en verde: <strong>planilla-kyorugi-festcup-2026-traslados-resaltados.pdf</strong> / .xls en Escritorio.</p>
<table><thead><tr><th>Dorsal</th><th>Competidor</th><th>Categoría actual</th></tr></thead>
<tbody>${listaHtml}</tbody></table>
<p>${RESALTAR.size} líneas resaltadas en planilla.</p></body></html>`,
)

console.log(
  JSON.stringify(
    { ok: true, OUT_PDF, OUT_XLS, OUT_HTML, resaltados: RESALTAR.size, id_lineas: [...RESALTAR].sort((a, b) => a - b) },
    null,
    2,
  ),
)
