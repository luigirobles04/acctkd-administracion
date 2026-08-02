#!/usr/bin/env node
/** Renumera orden_pista único por área (1…N). Uso: node scripts/reparar-orden-pista-campeonato.mjs [id_campeonato] */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const libDir = join(root, 'scripts/.reparar-lib')

for (const f of ['.env.local', '.env']) {
  const p = join(root, f)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

if (!existsSync(join(libDir, 'llaves-kyorugi.js'))) {
  execSync(
    'npx esbuild src/lib/campeonato/llaves-kyorugi.js --bundle --platform=node --format=esm --outdir=scripts/.reparar-lib --alias:@=./src',
    { cwd: root, stdio: 'inherit' }
  )
}

const { asignarCanchasCampeonato } = await import(`file://${join(libDir, 'llaves-kyorugi.js')}`)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan variables Supabase en .env.local')
  process.exit(1)
}

const idCampeonato = Number(process.argv[2] || 10)
const sb = createClient(url, key, { auth: { persistSession: false } })

console.log(`\n→ Renumerando áreas del campeonato ${idCampeonato}…\n`)
const res = await asignarCanchasCampeonato(sb, idCampeonato)
console.log(JSON.stringify(res, null, 2))
console.log('\n✅ Listo.\n')
