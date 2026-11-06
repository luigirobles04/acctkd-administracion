#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
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

const ID_LINEA = 16297
const DEST = 10071 // IB Avanzados M -36kg
const { data: linea } = await sb
  .from('linea_inscripcion')
  .select('id_categoria, id_academia_campeonato, dorsal_display')
  .eq('id_linea', ID_LINEA)
  .single()
const desde = linea.id_categoria
if (desde === DEST) {
  console.log(JSON.stringify({ skip: true, message: 'TAN-132 ya en -36kg' }))
  process.exit(0)
}

const { data: catDesde } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', desde).single()
const { data: catDest } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', DEST).single()

await sb.from('linea_inscripcion').update({ id_categoria: DEST, updated_at: new Date().toISOString() }).eq('id_linea', ID_LINEA)
if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', DEST)

await sb.from('bitacora_inscripcion').insert({
  id_academia_campeonato: linea.id_academia_campeonato,
  id_linea: ID_LINEA,
  accion: 'traslado_categoria_kyorugi',
  detalle: {
    dorsal: linea.dorsal_display,
    desde,
    desde_nombre: catDesde?.nombre,
    hacia: DEST,
    hacia_nombre: catDest?.nombre,
    nota: 'TAN-132 Adriano Lau → IB Avanzados M -36kg',
  },
  actor: 'admin',
})

for (const idCat of [desde, DEST].filter(Boolean)) {
  const { count } = await sb
    .from('linea_inscripcion')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', ID_CAMP)
    .eq('id_categoria', idCat)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if ((count || 0) >= 2) {
    await generarLlaveCategoria(sb, ID_CAMP, idCat, { asignarCanchas: false })
  }
}

await asignarCanchasCampeonato(sb, ID_CAMP)
console.log(JSON.stringify({ ok: true, idLinea: ID_LINEA, dest: catDest?.nombre }, null, 2))
