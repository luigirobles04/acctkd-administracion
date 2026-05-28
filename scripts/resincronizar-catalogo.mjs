/**
 * Resincroniza catálogo FDPTKD en Supabase.
 * Uso: node scripts/resincronizar-catalogo.mjs [id|all]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = join(root, 'scripts/.catalogo-bundle.mjs')

for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

if (!existsSync(bundlePath)) {
  execSync(
    `npx esbuild src/lib/campeonato/categorias-wt.js --bundle --platform=node --format=esm --outfile=scripts/.catalogo-bundle.mjs --alias:@=./src`,
    { cwd: root, stdio: 'inherit' }
  )
}

const { CATEGORIAS_WT, CATALOG_VERSION } = await import(bundlePath)
const { TARIFAS_FDPTKD_DEFAULT } = await import(join(root, 'src/lib/campeonato/constants.js'))

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function resincronizar(id) {
  await sb.from('categoria_campeonato').delete().eq('id_campeonato', id)
  const { error } = await sb.from('categoria_campeonato').insert(
    CATEGORIAS_WT.map((c) => ({ ...c, id_campeonato: id }))
  )
  if (error) throw error

  const { count: numTarifas } = await sb
    .from('campeonato_tarifa')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', id)

  if ((numTarifas || 0) === 0) {
    await sb.from('campeonato_tarifa').insert(
      TARIFAS_FDPTKD_DEFAULT.map((t) => ({ ...t, id_campeonato: id, activo: true }))
    )
  }

  await sb.from('campeonato').update({ bases_version: String(CATALOG_VERSION) }).eq('id_campeonato', id)

  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', id)
  return count
}

const idArg = process.argv[2] || 'all'
let ids = []

if (idArg === 'all') {
  const { data } = await sb.from('campeonato').select('id_campeonato, nombre').order('id_campeonato')
  ids = (data || []).filter((c) => c.id_campeonato > 1).map((c) => c.id_campeonato)
} else {
  ids = [Number(idArg)]
}

console.log(`Catálogo v${CATALOG_VERSION} · ${CATEGORIAS_WT.length} categorías plantilla`)

for (const id of ids) {
  const { data: camp } = await sb.from('campeonato').select('nombre').eq('id_campeonato', id).maybeSingle()
  const count = await resincronizar(id)
  console.log(`✓ ${id} · ${camp?.nombre || '?'} → ${count} categorías`)
}
