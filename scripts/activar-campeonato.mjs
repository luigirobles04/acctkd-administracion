import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { TARIFAS_FDPTKD_DEFAULT } = await import(join(root, 'src/lib/campeonato/constants.js'))
const src = readFileSync(join(root, 'src/lib/campeonato/categorias-wt.js'), 'utf8')
const CATEGORIAS_WT = eval(src.match(/export const CATEGORIAS_WT = (\[[\s\S]*?\n\])/)[1])

async function sembrar(sb, idCampeonato) {
  const { error: errCat } = await sb.from('categoria_campeonato').insert(
    CATEGORIAS_WT.map((c) => ({ ...c, id_campeonato: idCampeonato }))
  )
  if (errCat) throw errCat
  const { error: errTar } = await sb.from('campeonato_tarifa').insert(
    TARIFAS_FDPTKD_DEFAULT.map((t) => ({ ...t, id_campeonato: idCampeonato, activo: true }))
  )
  if (errTar) throw errTar
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const idCampeonato = Number(process.argv[2] || 3)

const { count } = await sb.from('categoria_campeonato').select('*', { count: 'exact', head: true }).eq('id_campeonato', idCampeonato)
if ((count || 0) === 0) {
  await sembrar(sb, idCampeonato)
  console.log('Categorías y tarifas creadas para campeonato', idCampeonato)
} else {
  console.log('Ya tiene', count, 'categorías')
}

const { data } = await sb.from('campeonato').select('nombre, slug, publicado, estado').eq('id_campeonato', idCampeonato).single()
console.log(data)
