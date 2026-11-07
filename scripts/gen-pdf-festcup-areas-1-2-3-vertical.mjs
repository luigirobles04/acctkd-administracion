#!/usr/bin/env node
/**
 * PDF llaves FestCup: Áreas 1, 2 y 3 en retrato + letra grande, y un PDF único (área1→2→3).
 * Layout compacto (mismo que API en retrato): 2 inscritos → hasta 3 llaves por hoja;
 * 2/hoja (más grande): PDF_BRACKET_COMPACT_MAX_DOS_COMP=2. 3+ inscritos → 2 por hoja. Desactivar: PDF_BRACKET_COMPACT=0
 * No reasigna canchas: solo filtra por `c.cancha` ya en BD.
 *
 * Uso: node scripts/gen-pdf-festcup-areas-1-2-3-vertical.mjs
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */
import { writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = Number(process.env.ID_CAMPEONATO || 10)
const TEXT_SCALE = Math.min(1.45, Math.max(1, Number(process.env.PDF_TEXT_SCALE || 1.22)))

const pdfBundle = join(root, 'scripts/.gen-pdf-festcup-vertical-bundle.mjs')
const llavesBundle = join(root, 'scripts/.asignar-canchas-bundle.mjs')

const desktop = process.env.HOME || ''
const OUT = {
  1: {
    desktop: join(desktop, 'Desktop', 'llaves-graficas-area-1-taekwondo-festcup-2026-vertical.pdf'),
    repo: join(root, 'llaves-graficas-area-1-festcup-2026-vertical.pdf'),
  },
  2: {
    desktop: join(desktop, 'Desktop', 'llaves-graficas-area-2-taekwondo-festcup-2026-vertical.pdf'),
    repo: join(root, 'llaves-graficas-area-2-festcup-2026-vertical.pdf'),
  },
  3: {
    desktop: join(desktop, 'Desktop', 'llaves-graficas-area-3-taekwondo-festcup-2026-vertical.pdf'),
    repo: join(root, 'llaves-graficas-area-3-festcup-2026-vertical.pdf'),
  },
  merged: {
    desktop: join(desktop, 'Desktop', 'llaves-graficas-areas-1-2-3-taekwondo-festcup-2026-vertical.pdf'),
    repo: join(root, 'llaves-graficas-areas-1-2-3-festcup-2026-vertical.pdf'),
  },
}

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const sb = createClient(url, key)
const data = await buildExportLlaves(sb, ID_CAMP)

const buffers = {}
for (const cancha of [1, 2, 3]) {
  const buf = await buildBracketPdfBuffer(data, sb, {
    cancha,
    orientation: 'portrait',
    textScale: TEXT_SCALE,
  })
  buffers[cancha] = buf
  writeFileSync(OUT[cancha].desktop, buf)
  copyFileSync(OUT[cancha].desktop, OUT[cancha].repo)
}

const merged = await PDFDocument.create()
for (const cancha of [1, 2, 3]) {
  const src = await PDFDocument.load(buffers[cancha])
  const pages = await merged.copyPages(src, src.getPageIndices())
  for (const p of pages) merged.addPage(p)
}
const mergedBytes = await merged.save()
writeFileSync(OUT.merged.desktop, mergedBytes)
copyFileSync(OUT.merged.desktop, OUT.merged.repo)

console.log(
  JSON.stringify(
    {
      ok: true,
      id_campeonato: ID_CAMP,
      text_scale: TEXT_SCALE,
      areas: [1, 2, 3].map((c) => ({
        cancha: c,
        categorias: (data.categorias || []).filter((x) => Number(x.cancha) === c && x.tiene_llave).length,
        out_desktop: OUT[c].desktop,
        out_repo: OUT[c].repo,
      })),
      merged_desktop: OUT.merged.desktop,
      merged_repo: OUT.merged.repo,
    },
    null,
    2,
  ),
)
