/**
 * ACBRACKET 1.0 — genera PDF de llaves Kyorugi desde listas de nombres (sin Supabase).
 *
 * Uso:
 *   npm run acbracket
 *   node scripts/generar-pdf-llaves-nombres.mjs
 *   node scripts/generar-pdf-llaves-nombres.mjs scripts/datos-llaves-demo.json
 *   node scripts/generar-pdf-llaves-nombres.mjs mi-archivo.json ~/Desktop/salida.pdf
 *
 * Formato JSON:
 * {
 *   "campeonato": "Nombre del evento",
 *   "fecha": "2026-08-15",
 *   "cancha": 1,
 *   "categorias": [
 *     { "nombre": "Cat A", "nombres": ["Jugador 1", "Jugador 2"] }
 *   ]
 * }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundleOut = join(root, 'scripts/.gen-pdf-nombres-bundle.mjs')

const inputJson = resolve(process.argv[2] || join(root, 'scripts/datos-llaves-demo.json'))
const OUT = resolve(process.argv[3] || join(process.env.HOME || '', 'Desktop', 'llaves-generadas-kyorugi.pdf'))

if (!existsSync(inputJson)) {
  console.error(`No existe el archivo: ${inputJson}`)
  process.exit(1)
}

const payload = JSON.parse(readFileSync(inputJson, 'utf8'))
const CATEGORIAS = payload.categorias || []

if (!CATEGORIAS.length) {
  console.error('El JSON debe incluir al menos una categoría con nombres.')
  process.exit(1)
}

execSync(
  `npx esbuild "${join(root, 'scripts/.gen-pdf-nombres-entry.mjs')}" --bundle --platform=node --format=esm --outfile="${bundleOut}" --alias:@="${join(root, 'src')}" --external:canvas --external:bufferutil --external:utf-8-validate`,
  { stdio: 'inherit', cwd: root }
)

const { buildExportDataFromNombres, buildBracketPdfBuffer } = await import(`file://${bundleOut}`)

const data = buildExportDataFromNombres(CATEGORIAS, {
  campeonatoNombre: payload.campeonato || 'Llaves Kyorugi',
  fecha: payload.fecha || '2026-08-15',
  canchaDefault: payload.cancha ?? 1,
})

const buffer = await buildBracketPdfBuffer(data, null)
writeFileSync(OUT, buffer)

const counts = CATEGORIAS.map((c) => c.nombres?.length || 0)
console.log(`\nACBRACKET 1.0 — PDF generado: ${OUT}`)
console.log(`Fuente: ${inputJson}`)
console.log(`Categorías: ${CATEGORIAS.length} (${Math.min(...counts)}–${Math.max(...counts)} competidores)`)
