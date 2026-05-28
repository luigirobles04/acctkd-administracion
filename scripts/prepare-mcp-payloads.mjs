import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const merged = join(root, 'scripts/.simulacion/_merged')
const out = join(root, 'scripts/.simulacion/_mcp_payloads')
mkdirSync(out, { recursive: true })

const files = readdirSync(merged).filter((f) => f.endsWith('.sql') && /^\d{2}-academia/.test(f)).sort()
for (const f of files) {
  const sql = readFileSync(join(merged, f), 'utf8')
  writeFileSync(join(out, f.replace('.sql', '.json')), JSON.stringify({ query: sql }))
}
console.log('Prepared', files.length, 'payloads in', out)
