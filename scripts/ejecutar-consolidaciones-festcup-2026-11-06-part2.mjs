#!/usr/bin/env node
/** Continúa kyorugi pendiente (parte 1 falló en CKA-437 por pesaje). */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
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

const { asignarCanchasCampeonato, generarLlaveCategoria } = await import(`file://${bundleOut}`)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const log = []
const regenCats = new Set()
const now = () => new Date().toISOString()

async function catNombre(id) {
  if (!id) return '—'
  const { data } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', id).maybeSingle()
  return data?.nombre || String(id)
}

async function consolidarLineaKyorugi(idLinea, idCatDest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === idCatDest) {
    log.push({ skip: true, label })
    return
  }
  const desdeNombre = await catNombre(desde)
  const haciaNombre = await catNombre(idCatDest)
  const { error } = await sb
    .from('linea_inscripcion')
    .update({ id_categoria: idCatDest, updated_at: now() })
    .eq('id_linea', idLinea)
  if (error) throw error
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', idCatDest)
  regenCats.add(idCatDest)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'consolidacion_kyorugi',
    detalle: {
      tipo: 'Consolidación',
      mensaje: `Consolidación: ${desdeNombre} → ${haciaNombre}`,
      desde,
      desde_nombre: desdeNombre,
      hacia: idCatDest,
      hacia_nombre: haciaNombre,
      destino_externo: true,
      categorias_consolidadas: [{ id_categoria: desde, nombre: desdeNombre }],
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, consolidacion: label, idLinea, dest: idCatDest })
}

async function pasarKyorugi(idLinea, idCatDest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === idCatDest) {
    log.push({ skip: true, label })
    return
  }
  const { error } = await sb
    .from('linea_inscripcion')
    .update({ id_categoria: idCatDest, updated_at: now() })
    .eq('id_linea', idLinea)
  if (error) throw error
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  regenCats.add(idCatDest)
  if (desde) regenCats.add(desde)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'traslado_categoria_kyorugi',
    detalle: {
      dorsal: linea.dorsal_display,
      desde,
      desde_nombre: await catNombre(desde),
      hacia: idCatDest,
      hacia_nombre: await catNombre(idCatDest),
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, traslado: label })
}

async function pasarFestival(idLinea, label) {
  const { data: linea } = await sb.from('linea_inscripcion').select('*').eq('id_linea', idLinea).single()
  if (linea.modalidad === 'festival') {
    log.push({ skip: true, label })
    return
  }
  const oldCat = linea.id_categoria
  await sb
    .from('linea_inscripcion')
    .update({ modalidad: 'festival', id_categoria: null, updated_at: now() })
    .eq('id_linea', idLinea)
  if (oldCat) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', oldCat)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'traslado_festival',
    detalle: { dorsal: linea.dorsal_display, desde_nombre: oldCat ? await catNombre(oldCat) : null, nota: label },
    actor: 'admin',
  })
  log.push({ ok: true, festival: label })
}

const K = {
  IA_25: 10012,
  IA_28: 10013,
  IB_39: 10057,
  PC_51: 10109,
  PC_AV_33M: 10123,
  CAD_65: 10170,
  IB_27F: 10060,
  PC_AV_33F: 10133,
  PC_AV_51F: 10139,
  CAD_37F: 10174,
  CAD_47F: 10177,
  JUV_78: 10250,
  MAY_84: 10284,
  MAY_62F: 10290,
}

await consolidarLineaKyorugi(16605, K.PC_51, 'CKA-437 Roberto')
await consolidarLineaKyorugi(16358, K.PC_AV_33M, 'HJ-192 Axel')
await consolidarLineaKyorugi(16623, K.CAD_65, 'ML2-455 Yair')
await consolidarLineaKyorugi(16575, K.IB_27F, 'ML-407 Sofia')
await consolidarLineaKyorugi(16664, K.PC_AV_33F, 'DD-496 Treyssi')
await consolidarLineaKyorugi(16267, K.PC_AV_51F, 'U-C-102 Valeska')
await consolidarLineaKyorugi(16464, K.CAD_37F, 'CPB-296 Ariana')
await consolidarLineaKyorugi(16429, K.CAD_47F, 'JM-261 Vivian')
await consolidarLineaKyorugi(16435, K.JUV_78, 'JC-267 Frank')
await consolidarLineaKyorugi(16270, K.MAY_62F, 'U-C-105 Ana Paula')

const { data: l95 } = await sb.from('linea_inscripcion').select('id_categoria').eq('id_linea', 16260).single()
if (l95?.id_categoria !== K.MAY_84) {
  await consolidarLineaKyorugi(16260, K.MAY_84, 'U-C-95 Alexander → May -84kg')
} else {
  log.push({ skip: true, note: 'U-C-95 ya en May -84kg' })
}

await pasarKyorugi(16301, K.IA_25, 'TAN-136 Ryuji')
await pasarKyorugi(16253, 10163, 'U-C-88 Joser')
await pasarKyorugi(16634, 10244, 'P-P-46 Nicolas')
await pasarKyorugi(16222, 10245, 'U-C-60 Piero')
await pasarKyorugi(16265, 10244, 'U-C-100 Denzel')
await pasarKyorugi(16468, 10228, 'UC-300 Gino')
await pasarKyorugi(16377, 10063, 'FY-211 Camila')
await pasarKyorugi(16481, 10181, 'QV-313 Kiara')
await pasarKyorugi(16296, K.CAD_37F, 'TAN-131 Luciana')
await pasarKyorugi(16579, 10255, 'ML-411 Mariapaz')
await pasarKyorugi(16578, 10197, 'ML-410 Estrellita')
await pasarKyorugi(16572, 10259, 'ML-404 Fátima')

await pasarFestival(16219, 'U-C-57 Fernando')
await pasarFestival(16458, 'FY-290 Fernanda')

for (const idCat of regenCats) {
  const { count } = await sb
    .from('linea_inscripcion')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', ID_CAMP)
    .eq('id_categoria', idCat)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if ((count || 0) >= 2) {
    try {
      await generarLlaveCategoria(sb, ID_CAMP, idCat, { asignarCanchas: false })
      log.push({ llave_regenerada: idCat, count })
    } catch (e) {
      log.push({ llave_error: idCat, error: e.message })
    }
  }
}

await asignarCanchasCampeonato(sb, ID_CAMP)

const outLog = join(root, 'backups/festcup-consolidaciones-part2-2026-11-06.json')
writeFileSync(outLog, JSON.stringify({ executed_at: now(), log, regenCats: [...regenCats] }, null, 2))
console.log(JSON.stringify({ ok: true, outLog, steps: log.length }, null, 2))
