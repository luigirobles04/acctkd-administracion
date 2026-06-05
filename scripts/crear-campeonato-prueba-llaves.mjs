/**
 * Crea campeonato de prueba con datos semi-reales:
 * - 24 academias aprobadas y pagadas
 * - TODAS las categorías kyorugi + poomsae con 2–10 competidores
 * - Nombres de personas reales
 * - Dorsales, pesaje, llaves kyorugi (lógica CNU)
 *
 * Uso: node scripts/crear-campeonato-prueba-llaves.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundleOut = join(root, 'scripts/.prueba-llaves-bundle.mjs')

for (const envFile of ['.env.local', '.env.vercel', '.env.example']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (!val || val.includes('xxxxx') || val.includes('your-')) continue
    if (!process.env[key] || process.env[key].includes('xxxxx')) process.env[key] = val
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

if (!existsSync(bundleOut)) {
  execSync(
    `npx esbuild src/lib/campeonato/sembrar-campeonato-prueba-llaves.js --bundle --platform=node --format=esm --outfile=scripts/.prueba-llaves-bundle.mjs --alias:@=./src`,
    { cwd: root, stdio: 'inherit' }
  )
}

const { sembrarCampeonatoPruebaLlaves, SLUG_PRUEBA_LLAVES } = await import(`file://${bundleOut}`)
const sb = createClient(url, key)

function onProgress(fase, extra) {
  if (fase === 'inscripciones' && extra) {
    console.log(`  … inscripciones ${extra.hechas}/${extra.total} categorías`)
    return
  }
  console.log(`→ ${fase}…`)
}

async function categoriasConInscritos(idCampeonato) {
  const { data } = await sb
    .from('linea_inscripcion')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'anulado')
  const ids = [...new Set((data || []).map((r) => r.id_categoria))]
  return ids
}

console.log('\n🏆 Creando campeonato de prueba (todas las categorías 2–10 comp.)…\n')
const t0 = Date.now()

const result = await sembrarCampeonatoPruebaLlaves(sb, { onProgress })

const ids = await categoriasConInscritos(result.id_campeonato)
const { count: totalCats } = await sb
  .from('categoria_campeonato')
  .select('*', { count: 'exact', head: true })
  .eq('id_campeonato', result.id_campeonato)

result.categorias_sin_inscritos = Math.max(0, (totalCats || 0) - ids.length)
result.segundos = Math.round((Date.now() - t0) / 1000)

console.log('\n✅ Campeonato listo\n')
console.log(JSON.stringify(result, null, 2))
console.log(`\nAbre en el sistema: slug "${SLUG_PRUEBA_LLAVES}" (id ${result.id_campeonato})`)
console.log(`Tiempo: ${result.segundos}s`)

if (result.categorias_sin_inscritos > 0) {
  console.warn(`⚠️  ${result.categorias_sin_inscritos} categorías quedaron sin inscritos`)
  process.exit(1)
}
