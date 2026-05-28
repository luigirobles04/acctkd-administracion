/** Split academy SQL into MCP-sized chunks and write manifest */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.simulacion')
const out = path.join(dir, '_chunks')
fs.mkdirSync(out, { recursive: true })

const files = fs.readdirSync(dir).filter((f) => /^\d{2}-academia-\d+\.sql$/.test(f)).sort()
const manifest = []

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8')
  const parts = sql.split(/(?=WITH nueva AS)/).filter(Boolean)
  const chunks = []
  let buf = parts[0] || ''
  for (let i = 1; i < parts.length; i++) {
    if (buf.length + parts[i].length > 12000 && buf.trim()) {
      chunks.push(buf)
      buf = parts[i]
    } else {
      buf += parts[i]
    }
  }
  if (buf.trim()) chunks.push(buf)
  const chunkFiles = []
  chunks.forEach((chunk, idx) => {
    const name = `${file.replace('.sql', '')}-chunk-${idx + 1}.sql`
    fs.writeFileSync(path.join(out, name), chunk)
    chunkFiles.push(name)
  })
  manifest.push({ file, chunks: chunkFiles })
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('chunks', manifest.reduce((s, m) => s + m.chunks.length, 0))
