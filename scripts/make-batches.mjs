import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const merged = join(root, 'scripts/.simulacion/_merged')
const out = join(root, 'scripts/.simulacion')

const files = readdirSync(merged).filter((f) => /^\d{2}-academia-\d+\.sql$/.test(f)).sort()
const half = Math.ceil(files.length / 2)
const batchA = files.slice(0, half).map((f) => readFileSync(join(merged, f), 'utf8')).join('\n')
const batchB = files.slice(half).map((f) => readFileSync(join(merged, f), 'utf8')).join('\n')

writeFileSync(join(out, 'batch-a.sql'), batchA)
writeFileSync(join(out, 'batch-b.sql'), batchB)
console.log('batch-a:', batchA.length, 'batch-b:', batchB.length)
