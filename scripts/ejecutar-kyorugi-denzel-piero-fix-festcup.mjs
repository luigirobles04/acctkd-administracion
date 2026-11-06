#!/usr/bin/env node
/** Denzel → Juv Av -51; Piero U-C-60 → Juv Av -59 (corrección usuario). */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const JUV_51 = 10244
const JUV_59 = 10246
const bundleOut = join(root, 'scripts/.ejecutar-consolidaciones-bundle.mjs')

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

execSync(
  `npx esbuild "${join(root, 'scripts/.ejecutar-consolidaciones-entry.mjs')}" --bundle --platform=node --format=esm --outfile="${bundleOut}" --alias:@="${join(root, 'src')}" --external:canvas`,
  { stdio: 'inherit', cwd: root },
)

const { generarLlaveCategoria, asignarCanchasCampeonato } = await import(`file://${bundleOut}`)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const log = []
const regen = new Set()
const now = () => new Date().toISOString()

async function catNombre(id) {
  const { data } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', id).maybeSingle()
  return data?.nombre || String(id)
}

async function consolidarLinea(idLinea, dest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === dest) {
    log.push({ skip: true, label })
    return
  }
  const desdeNombre = await catNombre(desde)
  const haciaNombre = await catNombre(dest)
  await sb.from('linea_inscripcion').update({ id_categoria: dest, updated_at: now() }).eq('id_linea', idLinea)
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', dest)
  if (desde) regen.add(desde)
  regen.add(dest)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'consolidacion_kyorugi',
    detalle: {
      tipo: 'Consolidación',
      mensaje: `Consolidación: ${desdeNombre} → ${haciaNombre}`,
      desde,
      desde_nombre: desdeNombre,
      hacia: dest,
      hacia_nombre: haciaNombre,
      destino_externo: true,
      categorias_consolidadas: [{ id_categoria: desde, nombre: desdeNombre }],
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, consolidacion: label, idLinea, dest })
}

await consolidarLinea(16265, JUV_51, 'U-C-100 Denzel → Juv Av -51kg (con Nicolas)')
await consolidarLinea(16222, JUV_59, 'U-C-60 Piero → Juv Av -59kg (con Rodrigo)')

for (const idCat of regen) {
  try {
    await generarLlaveCategoria(sb, ID_CAMP, idCat)
  } catch (e) {
    log.push({ llave_error: idCat, message: e.message })
  }
}
await asignarCanchasCampeonato(sb, ID_CAMP)

const out = join(root, 'backups/kyorugi-denzel-piero-fix-2026-11-06.json')
writeFileSync(out, JSON.stringify({ at: now(), log }, null, 2))
console.log('OK', out)
console.log(JSON.stringify(log, null, 2))
