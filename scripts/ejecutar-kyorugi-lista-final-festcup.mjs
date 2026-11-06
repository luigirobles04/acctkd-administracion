#!/usr/bin/env node
/** Lista kyorugi FestCup — consolidar/pasar/festival (peso no bloquea). */
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

const { generarLlaveCategoria, asignarCanchasCampeonato } = await import(`file://${bundleOut}`)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const log = []
const regen = new Set()
const now = () => new Date().toISOString()

async function catNombre(id) {
  if (!id) return '—'
  const { data } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', id).maybeSingle()
  return data?.nombre || String(id)
}

async function consolidarLinea(idLinea, dest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === dest) {
    log.push({ skip: true, label })
    return
  }
  const desdeNombre = await catNombre(desde)
  const haciaNombre = await catNombre(dest)
  await sb.from('linea_inscripcion').update({ id_categoria: dest, updated_at: now() }).eq('id_linea', idLinea)
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', dest)
  if (desde) regen.add(desde)
  regen.add(dest)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'consolidacion_kyorugi',
    detalle: {
      tipo: 'Consolidación',
      mensaje: `Consolidación: ${desdeNombre} → ${haciaNombre}`,
      desde,
      desde_nombre: desdeNombre,
      hacia: dest,
      hacia_nombre: haciaNombre,
      destino_externo: true,
      categorias_consolidadas: [{ id_categoria: desde, nombre: desdeNombre }],
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, consolidacion: label, idLinea, dest })
}

async function pasar(idLinea, dest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === dest) {
    log.push({ skip: true, label })
    return
  }
  await sb.from('linea_inscripcion').update({ id_categoria: dest, updated_at: now() }).eq('id_linea', idLinea)
  if (desde) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  if (desde) regen.add(desde)
  regen.add(dest)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'traslado_categoria_kyorugi',
    detalle: {
      dorsal: linea.dorsal_display,
      desde,
      desde_nombre: await catNombre(desde),
      hacia: dest,
      hacia_nombre: await catNombre(dest),
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, traslado: label })
}

async function festival(idLinea, label) {
  const { data: linea } = await sb.from('linea_inscripcion').select('*').eq('id_linea', idLinea).single()
  if (linea.modalidad === 'festival') {
    log.push({ skip: true, label })
    return
  }
  const old = linea.id_categoria
  await sb.from('linea_inscripcion').update({ modalidad: 'festival', id_categoria: null, updated_at: now() }).eq('id_linea', idLinea)
  if (old) await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', old)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'traslado_festival',
    detalle: { dorsal: linea.dorsal_display, nota: label },
    actor: 'admin',
  })
  log.push({ ok: true, festival: label })
}

const K = {
  IA_25: 10012,
  IA_28: 10013,
  IB_39: 10057,
  IB_36: 10071,
  PC_51: 10109,
  PC_AV_33M: 10123,
  CAD_37: 10163,
  CAD_65: 10170,
  IB_27F: 10060,
  IB_36F: 10063,
  PC_AV_33F: 10133,
  PC_AV_51F: 10139,
  CAD_37F: 10174,
  CAD_47F: 10177,
  CAD_59F: 10181,
  JUV_51: 10244,
  JUV_55: 10245,
  JUV_59: 10246,
  JUV_68: 10228,
  JUV_73: 10249,
  JUV_78: 10250,
  JUV_49F: 10255,
  JUV_63F: 10259,
  CAD_AV_47F: 10197,
  MAY_78: 10283,
  MAY_84P: 10285,
  MAY_62F: 10290,
}

// ——— Consolidar ———
await consolidarLinea(16478, K.IA_25, 'QV-310 Dixson')
await consolidarLinea(16657, K.IA_28, 'ML2-489 Adriano')
await consolidarLinea(16276, K.IB_39, 'TZD-111 Víctor')
await consolidarLinea(16605, K.PC_51, 'CKA-437 Roberto')
await consolidarLinea(16358, K.PC_AV_33M, 'HJ-192 Axel')
await consolidarLinea(16623, K.CAD_65, 'ML2-455 Yair')
await consolidarLinea(16435, K.MAY_78, 'JC-267 Frank → Mayores Noveles M -78kg')
await consolidarLinea(16260, K.MAY_84P, 'U-C-95 Alexander → May +84kg')
await consolidarLinea(16575, K.IB_27F, 'ML-407 Sofia')
await consolidarLinea(16664, K.PC_AV_33F, 'DD-496 Treyssi')
await consolidarLinea(16267, K.PC_AV_51F, 'U-C-102 Valeska')
await consolidarLinea(16464, K.CAD_37F, 'CPB-296 Ariana')
await consolidarLinea(16429, K.CAD_47F, 'JM-261 Vivian')
await consolidarLinea(16270, K.MAY_62F, 'U-C-105 Ana Paula')
await consolidarLinea(16265, K.JUV_51, 'U-C-100 Denzel → Juv Av -51kg')
await consolidarLinea(16222, K.JUV_59, 'U-C-60 Piero → Juv Av -59kg')
await consolidarLinea(16716, K.JUV_73, 'TFM-548 Arlexavier → Juv Av -73kg')

// ——— Pasar ———
await pasar(16301, K.IA_25, 'TAN-136 Ryuji')
await pasar(16297, K.IB_36, 'TAN-132 Adriano Lau')
await pasar(16253, K.CAD_37, 'U-C-88 Joser')
await pasar(16634, K.JUV_51, 'P-P-46 Nicolas')
await pasar(16468, K.JUV_68, 'UC-300 Gino')
await pasar(16377, K.IB_36F, 'FY-211 Camila')
await pasar(16481, K.CAD_59F, 'QV-313 Kiara')
await pasar(16296, K.CAD_37F, 'TAN-131 Luciana')
await pasar(16579, K.JUV_49F, 'ML-411 Mariapaz')
await pasar(16578, K.CAD_AV_47F, 'ML-410 Estrellita')
await pasar(16572, K.JUV_63F, 'ML-404 Fátima')

// ——— Festival ———
await festival(16219, 'U-C-57 Fernando')
await festival(16458, 'FY-290 Fernanda')

for (const idCat of regen) {
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
      log.push({ llave_ok: idCat, count })
    } catch (e) {
      log.push({ llave_error: idCat, error: e.message })
    }
  }
}

await asignarCanchasCampeonato(sb, ID_CAMP)

const out = join(root, 'backups/kyorugi-lista-final-2026-11-06.json')
writeFileSync(out, JSON.stringify({ at: now(), log, regen: [...regen] }, null, 2))
console.log(JSON.stringify({ ok: true, out, steps: log.length }, null, 2))
