#!/usr/bin/env node
/**
 * Backup completo inscripciones FestCup (campeonato 10) + llaves kyorugi.
 * node scripts/backup-festcup-inscripciones.mjs [ruta-salida.json]
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const defaultOut = join(
  process.env.HOME || '',
  'Desktop',
  `festcup-2026-backup-pre-consolidacion-${stamp}.json`,
)

for (const f of ['.env.local', '.env']) {
  const p = join(root, f)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (val && !process.env[key]) process.env[key] = val
  }
}

const outPath = process.argv[2] || defaultOut
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function fetchAll(table, buildQuery) {
  const all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await buildQuery().range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
  }
  return all
}

const { data: campeonato } = await sb.from('campeonato').select('*').eq('id_campeonato', ID_CAMP).single()

const categorias = await fetchAll('categoria', () =>
  sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_campeonato', ID_CAMP)
    .order('id_categoria'),
)

const lineas = await fetchAll('linea', () =>
  sb
    .from('linea_inscripcion')
    .select(`
      *,
      miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(id_perfil, nombres, apellidos, documento_numero)),
      academia_campeonato(id, id_academia, academia(nombre))
    `)
    .eq('id_campeonato', ID_CAMP)
    .order('id_linea'),
)

const miembros = await fetchAll('miembros', () =>
  sb.from('linea_inscripcion_miembro').select('*').in('id_linea', lineas.map((l) => l.id_linea)),
)

const llaves = await fetchAll('llaves', () =>
  sb.from('llave_kyorugi').select('*').eq('id_campeonato', ID_CAMP).order('id_llave'),
)

const academias = await fetchAll('ac', () =>
  sb.from('academia_campeonato').select('*, academia(*)').eq('id_campeonato', ID_CAMP),
)

const payload = {
  exported_at: new Date().toISOString(),
  id_campeonato: ID_CAMP,
  campeonato,
  counts: {
    categorias: categorias.length,
    lineas: lineas.length,
    miembros: miembros.length,
    llaves_kyorugi: llaves.length,
    academias_campeonato: academias.length,
  },
  categorias,
  lineas,
  linea_inscripcion_miembro: miembros,
  llave_kyorugi: llaves,
  academia_campeonato: academias,
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(payload, null, 2))

const copyDir = join(root, 'backups')
mkdirSync(copyDir, { recursive: true })
const copyPath = join(copyDir, `festcup-2026-pre-consolidacion-${stamp}.json`)
writeFileSync(copyPath, JSON.stringify(payload))

console.log(JSON.stringify({ ok: true, outPath, copyPath, counts: payload.counts }, null, 2))
