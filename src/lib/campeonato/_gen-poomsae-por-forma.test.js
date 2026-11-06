/**
 * Genera PDF local por forma — npx vitest run src/lib/campeonato/_gen-poomsae-por-forma.test.js
 */
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'
import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { buildPoomsaePdfPorFormaBuffer } from '@/lib/campeonato/export-poomsae'
const ID_CAMP = 10
const OUT =
  '/Users/luigiarmandoroblespalacios/Desktop/orden-poomsae-taekwondo-festcup-2026-por-forma.pdf'
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

describe('gen poomsae pdf por forma', () => {
  it('escribe Desktop', async () => {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: campeonato } = await sb.from('campeonato').select('*').eq('id_campeonato', ID_CAMP).single()
    const { categorias } = await fetchOrdenPoomsaeCampeonato(sb, ID_CAMP)
    const conInscritos = categorias.filter((c) => c.inscritos > 0)
    expect(conInscritos.length).toBeGreaterThan(0)

    const buf = buildPoomsaePdfPorFormaBuffer(campeonato, categorias)
    writeFileSync(OUT, buf)
    console.log({ out: OUT, bytes: buf.length, categorias: conInscritos.length })
  }, 120_000)
})
