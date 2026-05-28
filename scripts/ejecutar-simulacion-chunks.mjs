/**
 * Ejecuta chunks SQL contra Supabase vía fetch al endpoint SQL del MCP proxy.
 * Alternativa: node scripts/ejecutar-simulacion-chunks.mjs | while read f; do ...
 *
 * Uso directo con MCP manual: lee manifest y ejecuta cada chunk en orden.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const chunksDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.simulacion/_chunks')
const manifest = JSON.parse(fs.readFileSync(path.join(chunksDir, 'manifest.json'), 'utf8'))

const order = []
for (const m of manifest) {
  for (const c of m.chunks) order.push(path.join(chunksDir, c))
}

// Imprime lista para ejecución secuencial
for (const f of order) {
  console.log(JSON.stringify({ file: path.basename(f), bytes: fs.statSync(f).size, sql: fs.readFileSync(f, 'utf8') }))
}
