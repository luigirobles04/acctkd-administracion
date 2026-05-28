#!/usr/bin/env node
/**
 * Ejecuta todos los chunks SQL de simulación usando MCP user-supabase execute_sql.
 * Requiere ejecutarse desde Cursor Agent con acceso a CallMcpTool, O usar:
 *   node scripts/run-all-chunks.mjs --dry-run   (lista chunks)
 *
 * Este script imprime instrucciones; la carga real la hace el agente vía MCP.
 */
import { readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chunksDir = join(root, 'scripts/.simulacion/_chunks')

const files = readdirSync(chunksDir).filter((f) => f.endsWith('.sql')).sort()

if (process.argv.includes('--dry-run')) {
  for (const f of files) {
    const sql = readFileSync(join(chunksDir, f), 'utf8')
    console.log(`${f}\t${sql.length} chars`)
  }
  process.exit(0)
}

// Modo export: escribe cada chunk como archivo .query para batch MCP
const outDir = join(root, 'scripts/.simulacion/_chunk_queries')
import { mkdirSync, writeFileSync } from 'fs'
mkdirSync(outDir, { recursive: true })
for (const f of files) {
  writeFileSync(join(outDir, f), readFileSync(join(chunksDir, f), 'utf8'))
}
console.log(`Exported ${files.length} query files to ${outDir}`)
