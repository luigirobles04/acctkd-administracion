import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const payloads = join(root, 'scripts/.simulacion/_mcp_payloads')
const out = join(root, 'scripts/.simulacion/_queries')
import { mkdirSync } from 'fs'
mkdirSync(out, { recursive: true })

for (const f of readdirSync(payloads).filter((x) => /^\d{2}-academia-\d+\.json$/.test(x)).sort()) {
  const data = JSON.parse(readFileSync(join(payloads, f), 'utf8'))
  const query = data.query ?? data.sql
  if (!query) { console.warn('skip', f); continue }
  writeFileSync(join(out, f.replace('.json', '.query')), query)
  console.log(f, query.length)
}
