/**
 * npx vitest run src/lib/campeonato/_gen-kyorugi-planilla.test.js
 */
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'
import { fetchPlanillaKyorugiCampeonato } from '@/lib/campeonato/kyorugi-planilla'
import { buildKyorugiPlanillaPdfBuffer } from '@/lib/campeonato/export-kyorugi-planilla'

const ID_CAMP = 10
const OUT_PDF = '/Users/luigiarmandoroblespalacios/Desktop/planilla-kyorugi-taekwondo-festcup-2026.pdf'
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

for (const envFile of ['.env.local', '.env']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (val && !process.env[key]) process.env[key] = val
  }
}

describe('gen planilla kyorugi', () => {
  it('escribe PDF en Desktop', async () => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { campeonato, bloques, categorias } = await fetchPlanillaKyorugiCampeonato(sb, ID_CAMP)
    expect(categorias.length).toBeGreaterThan(0)
    const buf = buildKyorugiPlanillaPdfBuffer(campeonato, bloques, categorias)
    writeFileSync(OUT_PDF, buf)
    console.log({ out: OUT_PDF, bytes: buf.length, cats: categorias.length })
  }, 120_000)
})
