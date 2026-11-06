#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMP = 10
const bundleOut = join(root, 'scripts/.ejecutar-consolidaciones-bundle.mjs')

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

execSync(
  `npx esbuild "${join(root, 'scripts/.ejecutar-consolidaciones-entry.mjs')}" --bundle --platform=node --format=esm --outfile="${bundleOut}" --alias:@="${join(root, 'src')}" --external:canvas`,
  { stdio: 'inherit', cwd: root },
)

const { generarLlaveCategoria, asignarCanchasCampeonato } = await import(`file://${bundleOut}`)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const log = []

async function catNombre(id) {
  const { data } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', id).maybeSingle()
  return data?.nombre || String(id)
}

async function consolidarLinea(idLinea, idDest, label, origenNombreExtra) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === idDest) {
    log.push({ skip: label })
    return
  }
  const desdeNombre = await catNombre(desde)
  const haciaNombre = await catNombre(idDest)
  await sb.from('linea_inscripcion').update({ id_categoria: idDest, updated_at: new Date().toISOString() }).eq('id_linea', idLinea)
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', idDest)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'consolidacion_kyorugi',
    detalle: {
      tipo: 'Consolidación',
      mensaje: `Consolidación: ${desdeNombre} → ${haciaNombre}`,
      desde,
      desde_nombre: desdeNombre,
      hacia: idDest,
      hacia_nombre: haciaNombre,
      destino_externo: true,
      categorias_consolidadas: [{ id_categoria: desde, nombre: origenNombreExtra || desdeNombre }],
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: label, idLinea, dest: idDest })
}

// Alexander U-C-95 → Mayores · Noveles M +84kg (10285)
await consolidarLinea(16260, 10285, 'U-C-95 Alexander → May +84kg', 'Mayores · Noveles M -84kg')

// Roberto ya está en -51kg con Paris; peso declarado para apto llave
const { data: roberto } = await sb.from('linea_inscripcion').select('peso_declarado').eq('id_linea', 16605).single()
if (roberto?.peso_declarado == null) {
  await sb
    .from('linea_inscripcion')
    .update({ peso_declarado: '50.0', updated_at: new Date().toISOString() })
    .eq('id_linea', 16605)
  log.push({ ok: 'CKA-437 Roberto peso declarado 50.0 kg (Pre Cad -51kg con Paris)' })
}

for (const idCat of [10109, 10285, 10284]) {
  const { count } = await sb
    .from('linea_inscripcion')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', ID_CAMP)
    .eq('id_categoria', idCat)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if ((count || 0) < 2) {
    log.push({ llave_skip: idCat, count })
    continue
  }
  try {
    await generarLlaveCategoria(sb, ID_CAMP, idCat, { asignarCanchas: false })
    log.push({ llave_ok: idCat, count })
  } catch (e) {
    log.push({ llave_error: idCat, error: e.message })
  }
}

await asignarCanchasCampeonato(sb, ID_CAMP)
console.log(JSON.stringify({ ok: true, log }, null, 2))
