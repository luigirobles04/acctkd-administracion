#!/usr/bin/env node
/** PDF llaves gráficas Área 2 — FestCup 2026 (orden_pista actual en BD). */
import { writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const CANCHA = 2
const pdfBundle = join(root, 'scripts/.gen-pdf-festcup-area2-bundle.mjs')
const llavesBundle = join(root, 'scripts/.asignar-canchas-bundle.mjs')
const OUT_DESKTOP = join(
  process.env.HOME || '',
  'Desktop',
  'llaves-graficas-area-2-taekwondo-festcup-2026.pdf',
)
const OUT_REPO = join(root, 'llaves-graficas-area-2-festcup-2026.pdf')

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

const esbuildArgs = (entry, out) =>
  `npx esbuild "${entry}" --bundle --platform=node --format=esm --outfile="${out}" --alias:@="${join(root, 'src')}" --external:canvas --external:bufferutil --external:utf-8-validate`

execSync(esbuildArgs(join(root, 'scripts/.gen-pdf-area1-entry.mjs'), pdfBundle), {
  stdio: 'inherit',
  cwd: root,
})
execSync(esbuildArgs(join(root, 'scripts/.ejecutar-consolidaciones-entry.mjs'), llavesBundle), {
  stdio: 'inherit',
  cwd: root,
})

const { buildExportLlaves, buildBracketPdfBuffer } = await import(`file://${pdfBundle}`)
const { compactarOrdenPistaCampeonatoExistente } = await import(`file://${llavesBundle}`)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

if (process.env.RENUMERAR === '1' || process.env.RENUMERAR === 'true') {
  await compactarOrdenPistaCampeonatoExistente(sb, ID_CAMP)
}

const data = await buildExportLlaves(sb, ID_CAMP)
const buffer = await buildBracketPdfBuffer(data, sb, { cancha: CANCHA })
writeFileSync(OUT_DESKTOP, buffer)
copyFileSync(OUT_DESKTOP, OUT_REPO)

const area = (data.categorias || []).filter((c) => Number(c.cancha) === CANCHA)
const nums = []
for (const cat of area) {
  for (const lista of Object.values(cat.porRonda || {})) {
    for (const m of lista) {
      if (m.orden_pista && !m.es_bye && m.estado !== 'saltado') nums.push(Number(m.orden_pista))
    }
  }
}
nums.sort((a, b) => a - b)
const holes = []
for (let i = 1; i <= (nums.at(-1) || 0); i++) if (!nums.includes(i)) holes.push(i)

console.log(
  JSON.stringify(
    {
      ok: true,
      cancha: CANCHA,
      out_desktop: OUT_DESKTOP,
      out_repo: OUT_REPO,
      categorias_area: area.length,
      combates_numerados: nums.length,
      rango: nums.length ? `2/${String(nums[0]).padStart(2, '0')} … 2/${String(nums.at(-1)).padStart(2, '0')}` : null,
      huecos: holes,
    },
    null,
    2,
  ),
)
