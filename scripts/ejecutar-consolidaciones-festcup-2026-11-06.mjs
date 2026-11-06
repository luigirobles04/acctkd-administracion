#!/usr/bin/env node
/**
 * FestCup 10 — poomsae traslados + kyorugi consolidación/traslado/festival
 * node scripts/ejecutar-consolidaciones-festcup-2026-11-06.mjs
 */
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

const { consolidarOrosUnicos, asignarCanchasCampeonato } = await import(`file://${bundleOut}`)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const log = []
const now = () => new Date().toISOString()

async function catNombre(id) {
  const { data } = await sb.from('categoria_campeonato').select('nombre').eq('id_categoria', id).maybeSingle()
  return data?.nombre || String(id)
}

async function moverPoomsae(idLinea, idCatDest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === idCatDest) {
    log.push({ ok: true, skip: true, label, idLinea })
    return
  }
  const { error } = await sb
    .from('linea_inscripcion')
    .update({
      id_categoria: idCatDest,
      orden_poomsae: null,
      poomsae_puntaje: null,
      poomsae_estado: 'pendiente',
      poomsae_cancha: null,
      updated_at: now(),
    })
    .eq('id_linea', idLinea)
  if (error) throw error
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'admin_cambio_categoria_poomsae',
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
  log.push({ ok: true, poomsae: label, idLinea, dest: idCatDest })
}

async function pasarKyorugi(idLinea, idCatDest, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_academia_campeonato, dorsal_display, modalidad')
    .eq('id_linea', idLinea)
    .single()
  const desde = linea.id_categoria
  if (desde === idCatDest) {
    log.push({ ok: true, skip: true, label, idLinea })
    return
  }
  const { error } = await sb
    .from('linea_inscripcion')
    .update({ id_categoria: idCatDest, updated_at: now() })
    .eq('id_linea', idLinea)
  if (error) throw error
  if (desde) {
    await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', desde)
  }
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
  log.push({ ok: true, traslado: label, idLinea, dest: idCatDest })
}

async function consolidarKyorugi(idCatOrigen, idCatDest, label) {
  const r = await consolidarOrosUnicos(sb, ID_CAMP, {
    idsCategoriasOrigen: [idCatOrigen],
    idCategoriaDestino: idCatDest,
  })
  log.push({ ok: true, consolidacion: label, ...r })
}

async function pasarFestival(idLinea, label) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .select('*')
    .eq('id_linea', idLinea)
    .single()
  if (linea.modalidad === 'festival') {
    log.push({ ok: true, skip: true, label })
    return
  }
  const oldCat = linea.id_categoria
  const { error } = await sb
    .from('linea_inscripcion')
    .update({
      modalidad: 'festival',
      id_categoria: null,
      updated_at: now(),
    })
    .eq('id_linea', idLinea)
  if (error) throw error
  if (oldCat) {
    await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMP).eq('id_categoria', oldCat)
  }
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'traslado_festival',
    detalle: {
      dorsal: linea.dorsal_display,
      desde_nombre: oldCat ? await catNombre(oldCat) : null,
      nota: label,
    },
    actor: 'admin',
  })
  log.push({ ok: true, festival: label, idLinea })
}

// ——— POOMSAE ———
const POOM = {
  KORYO_PRECADETE_M: 10574,
  IJANG_SENIOR1_F: 10423,
  ILJANG_PRECADETE_M: 10366,
  OHJANG_PRECADETE_M: 10374,
  KIBOM_JUNIOR_F: 10401,
  IJANG_INFANTIL_B_F: 10351,
  ILJANG_INFANTIL_A_F: 10331,
  PALJANG_SENIOR2_F: 10453,
}

await moverPoomsae(16683, POOM.KORYO_PRECADETE_M, 'DD-515 Joshua → Koryo Pre Cadete M')
await moverPoomsae(16637, POOM.IJANG_SENIOR1_F, 'P-P-46 Shirley → Senior 1 I Jang F')
await moverPoomsae(16640, POOM.IJANG_SENIOR1_F, 'P-P-47 Anjali → Senior 1 I Jang F')
await moverPoomsae(16610, POOM.ILJANG_PRECADETE_M, 'CKA-442 Victor → Pre Cadete Il Jang M')
await moverPoomsae(16612, POOM.OHJANG_PRECADETE_M, 'CKA-444 Josep → Pre Cadete Oh Jang M')
await moverPoomsae(16671, POOM.KIBOM_JUNIOR_F, 'DD-503 Fernanda → Kibom Junior F')
await moverPoomsae(16203, POOM.IJANG_INFANTIL_B_F, 'ACC-38 Maliah → Infantil B I Jang F')
await moverPoomsae(16668, POOM.ILJANG_INFANTIL_A_F, 'DD-500 Ximena → Infantil A Il Jang F')
await moverPoomsae(16187, POOM.IJANG_SENIOR1_F, 'ACC-22 Fatima → Senior 1 I Jang F')
await moverPoomsae(16512, POOM.PALJANG_SENIOR2_F, 'SYC-344 Zaira → Pal Jang Senior 2 F')

// ——— KYORUGI consolidación ———
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

await consolidarKyorugi(10011, K.IA_25, 'QV-310 Dixson → IA -25kg')
await consolidarKyorugi(10014, K.IA_28, 'ML2-489 Adriano → IA -28kg')
await consolidarKyorugi(10056, K.IB_39, 'TZD-111 Víctor → IB +39kg')
await consolidarKyorugi(10108, K.PC_51, 'CKA-437 Roberto → Pre Cad -51kg')
await consolidarKyorugi(10122, K.PC_AV_33M, 'HJ-192 Axel → Pre Cad Av -33kg')
await consolidarKyorugi(10171, K.CAD_65, 'ML2-455 Yair → Cad -65kg')
await consolidarKyorugi(10059, K.IB_27F, 'ML-407 Sofia → IB -27kg F')
await consolidarKyorugi(10132, K.PC_AV_33F, 'DD-496 Treyssi → Pre Cad Av F -33kg')
await consolidarKyorugi(10138, K.PC_AV_51F, 'U-C-102 Valeska → Pre Cad Av F -51kg')
await consolidarKyorugi(10175, K.CAD_37F, 'CPB-296 Ariana → Cad F -37kg')
await consolidarKyorugi(10176, K.CAD_47F, 'JM-261 Vivian → Cad F -47kg')
await consolidarKyorugi(10251, K.JUV_78, 'JC-267 Frank → Juv Av -78kg')
await consolidarKyorugi(10289, K.MAY_62F, 'U-C-105 Ana Paula → May F -62kg')

// U-C-95 ya está en May -84kg
const { data: l95 } = await sb.from('linea_inscripcion').select('id_categoria').eq('id_linea', 16260).single()
if (l95?.id_categoria !== K.MAY_84) {
  await consolidarKyorugi(l95.id_categoria, K.MAY_84, 'U-C-95 Alexander → May -84kg')
} else {
  log.push({ ok: true, skip: true, note: 'U-C-95 ya en May -84kg' })
}

// ——— KYORUGI traslado ———
await pasarKyorugi(16301, K.IA_25, 'TAN-136 Ryuji → IA -25kg')
await pasarKyorugi(16253, 10163, 'U-C-88 Joser → Cad Nov -37kg')
await pasarKyorugi(16634, 10244, 'P-P-46 Nicolas → Juv Av -51kg')
await pasarKyorugi(16222, 10245, 'U-C-60 Piero → Juv Av -55kg')
await pasarKyorugi(16265, 10244, 'U-C-100 Denzel → Juv Av -51kg')
await pasarKyorugi(16468, 10228, 'UC-300 Gino → Juv Nov -68kg')
await pasarKyorugi(16377, 10063, 'FY-211 Camila → IB F -36kg')
await pasarKyorugi(16481, 10181, 'QV-313 Kiara → Cad F +59kg')
await pasarKyorugi(16296, K.CAD_37F, 'TAN-131 Luciana → Cad F -37kg')
await pasarKyorugi(16579, 10255, 'ML-411 Mariapaz → Juv Av F -49kg')
await pasarKyorugi(16578, 10197, 'ML-410 Estrellita → Cad Av F -47kg')
await pasarKyorugi(16572, 10259, 'ML-404 Fátima → Juv Av F -63kg')

// ——— Festival ———
await pasarFestival(16219, 'U-C-57 Fernando → Festival')
await pasarFestival(16458, 'FY-290 Fernanda → Festival')

await asignarCanchasCampeonato(sb, ID_CAMP)

const outLog = join(root, 'backups/festcup-consolidaciones-ejecutadas-2026-11-06.json')
writeFileSync(outLog, JSON.stringify({ executed_at: now(), log }, null, 2))
console.log(JSON.stringify({ ok: true, logPath: outLog, steps: log.length, log }, null, 2))
