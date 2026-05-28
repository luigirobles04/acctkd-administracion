/**
 * Ejecuta todos los chunks de simulación vía MCP (llamada externa).
 * Uso: node scripts/load-simulacion-via-stdin.mjs < chunk.sql
 * Imprime resultado JSON { ok, file, error? }
 *
 * Para batch desde shell con cursor agent, usar prepare-mcp-payloads + MCP manual.
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chunksDir = join(root, 'scripts/.simulacion/_chunks')

export function listChunkFiles() {
  return readdirSync(chunksDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

export function readChunk(name) {
  return readFileSync(join(chunksDir, name), 'utf8')
}

if (process.argv[1]?.endsWith('load-simulacion-via-stdin.mjs')) {
  const arg = process.argv[2]
  if (arg === '--list') {
    console.log(JSON.stringify(listChunkFiles()))
  } else if (arg?.endsWith('.sql')) {
    process.stdout.write(readChunk(arg))
  } else {
    console.error('Usage: node load-simulacion-via-stdin.mjs --list | <chunk-file.sql>')
    process.exit(1)
  }
}
