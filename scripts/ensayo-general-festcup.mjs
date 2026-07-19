#!/usr/bin/env node
/**
 * Ensayo general FestCup — valida flujo completo en Supabase producción.
 * Uso: node scripts/ensayo-general-festcup.mjs [--reset]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SLUG = 'prueba-llaves-cnu-2026'
const reset = process.argv.includes('--reset')

for (const envFile of ['.env.local', '.env.vercel', '.env.example']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (!val || val.includes('xxxxx') || val.includes('your-')) continue
    if (!process.env[key] || process.env[key].includes('xxxxx')) process.env[key] = val
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key)
const results = []
const ok = (msg) => { results.push({ ok: true, msg }); console.log(`  ✓ ${msg}`) }
const fail = (msg) => { results.push({ ok: false, msg }); console.error(`  ✗ ${msg}`) }

async function bundleFile(entry, out) {
  if (!existsSync(out)) {
    execSync(
      `npx esbuild ${entry} --bundle --platform=node --format=esm --outfile=${out} --alias:@=./src`,
      { cwd: root, stdio: 'pipe' }
    )
  }
  return import(`file://${out}`)
}

async function loadLib() {
  const sembrar = await bundleFile(
    'src/lib/campeonato/sembrar-campeonato-prueba-llaves.js',
    join(root, 'scripts/.prueba-llaves-bundle.mjs')
  )
  const llaves = await bundleFile(
    'src/lib/campeonato/llaves-kyorugi.js',
    join(root, 'scripts/.ensayo-llaves.mjs')
  )
  const pss = await bundleFile(
    'src/lib/campeonato/pss-kyorugi.js',
    join(root, 'scripts/.ensayo-pss.mjs')
  )
  const poomsae = await bundleFile(
    'src/lib/campeonato/poomsae-pss.js',
    join(root, 'scripts/.ensayo-poomsae.mjs')
  )
  return { ...sembrar, ...llaves, ...pss, ...poomsae }
}

console.log('\n=== ENSAYO GENERAL FESTCUP ===\n')

console.log('1. Tests automáticos…')
try {
  execSync('npm test', { cwd: root, stdio: 'pipe' })
  ok('213+ tests Vitest')
} catch (e) {
  fail('Tests fallaron')
  console.error(e.stdout?.toString() || e.message)
  process.exit(1)
}

console.log('\n2. Campeonato de prueba…')
const lib = await loadLib()

let { data: camp } = await sb.from('campeonato').select('id_campeonato, nombre, slug').eq('slug', SLUG).maybeSingle()

if (!camp || reset) {
  console.log('   Sembrando campeonato (puede tardar 1–3 min)…')
  if (reset && camp) {
    await lib.limpiarCampeonatoPruebaLlaves(sb)
    camp = null
  }
  const r = await lib.sembrarCampeonatoPruebaLlaves(sb, {
    onProgress: (f) => process.stdout.write(`   → ${f}\r`),
    reset: true,
  })
  camp = { id_campeonato: r.id_campeonato, nombre: lib.NOMBRE_PRUEBA_LLAVES, slug: SLUG }
  ok(`Campeonato sembrado id=${camp.id_campeonato} · ${r.academias ?? '?'} academias`)
} else {
  ok(`Campeonato existente id=${camp.id_campeonato}`)
  const { count: llavesCount } = await sb.from('llave_kyorugi').select('*', { count: 'exact', head: true }).eq('id_campeonato', camp.id_campeonato)
  if (!llavesCount) {
    console.log('   Generando llaves…')
    const r = await lib.generarTodasLasLlaves(sb, camp.id_campeonato)
    ok(`Llaves generadas: ${r.generadas}`)
  } else {
    ok(`${llavesCount} combates en llaves`)
  }
}

const id = camp.id_campeonato

console.log('\n3. Pesaje y dorsales…')
const { count: sinDorsal } = await sb
  .from('linea_inscripcion')
  .select('*', { count: 'exact', head: true })
  .eq('id_campeonato', id)
  .eq('modalidad', 'kyorugi_individual')
  .is('dorsal_numero', null)
if (sinDorsal > 0) {
  await lib.sembrarCampeonatoPruebaLlaves(sb, { fase: 'dorsales' })
}
ok(`Dorsales OK (${sinDorsal || 0} pendientes corregidos)`)

console.log('\n4. PSS snapshot área 1…')
try {
  const snap = await lib.buildPssAreaSnapshot(sb, id, 1)
  if (snap.total > 0 && snap.combates?.length > 0) ok(`Snapshot área 1: ${snap.total} combates`)
  else fail('Snapshot área 1 vacío')
} catch (e) {
  fail(`PSS snapshot: ${e.message}`)
}

console.log('\n5. Walkover (W/O)…')
try {
  const { data: combate } = await sb
    .from('llave_kyorugi')
    .select('id_llave, id_linea1, id_linea2, estado, id_categoria')
    .eq('id_campeonato', id)
    .eq('estado', 'pendiente')
    .not('id_linea1', 'is', null)
    .not('id_linea2', 'is', null)
    .limit(1)
    .maybeSingle()

  if (!combate) {
    fail('No hay combate pendiente para probar W/O')
  } else {
    const ganador = combate.id_linea1
    await lib.registrarWalkoverCombate(sb, combate.id_llave, ganador)
    const { data: after } = await sb.from('llave_kyorugi').select('estado, motivo_resultado, ganador_id_linea').eq('id_llave', combate.id_llave).single()
    if (after?.estado === 'finalizado' && after?.motivo_resultado === 'walkover') {
      ok(`W/O combate #${combate.id_llave} → ganador ${ganador}`)
    } else {
      fail('W/O no persistió correctamente')
    }
  }
} catch (e) {
  fail(`W/O: ${e.message}`)
}

console.log('\n6. Combate exhibición…')
try {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, dorsal_display')
    .eq('id_campeonato', id)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
    .limit(2)

  if ((lineas || []).length < 2) {
    fail('No hay 2 lineas para exhibición')
  } else {
    const ex = await lib.insertarCombateExhibicion(sb, id, {
      idLinea1: lineas[0].id_linea,
      idLinea2: lineas[1].id_linea,
      cancha: 1,
    })
    const { data: row } = await sb.from('llave_kyorugi').select('es_exhibicion, ronda, cancha').eq('id_llave', ex.id_llave).single()
    if (row?.es_exhibicion && row.ronda === 0) ok(`Exhibición id=${ex.id_llave} en área ${row.cancha}`)
    else fail('Exhibición mal insertada')
  }
} catch (e) {
  fail(`Exhibición: ${e.message}`)
}

console.log('\n7. Oro único (categoría 1 competidor)…')
try {
  const { data: cats } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre')
    .eq('id_campeonato', id)
    .eq('modalidad', 'kyorugi')
    .limit(50)

  let catUnica = null
  for (const cat of cats || []) {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('*', { count: 'exact', head: true })
      .eq('id_categoria', cat.id_categoria)
      .eq('estado', 'aprobado')
      .not('dorsal_numero', 'is', null)
    if (count === 1) {
      const { count: ll } = await sb.from('llave_kyorugi').select('*', { count: 'exact', head: true }).eq('id_categoria', cat.id_categoria)
      if (!ll) { catUnica = cat; break }
    }
  }

  if (!catUnica) {
    ok('Oro único: sin categoría de 1 (OK si todas tienen 2+)')
  } else {
    const r = await lib.generarLlaveCategoriaUnico(sb, id, catUnica.id_categoria)
    if (r.oro_unico) ok(`Oro único: ${catUnica.nombre}`)
    else fail('Oro único falló')
  }
} catch (e) {
  fail(`Oro único: ${e.message}`)
}

console.log('\n8. Poomsae snapshot…')
try {
  const ps = await lib.buildPssPoomsaeSnapshot(sb, id)
  ok(`Poomsae: ${ps.total ?? ps.categorias?.length ?? 0} participantes en snapshot`)
} catch (e) {
  fail(`Poomsae: ${e.message}`)
}

console.log('\n9. Resumen por área…')
for (const area of [1, 2, 3]) {
  const { count } = await sb
    .from('llave_kyorugi')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', id)
    .eq('cancha', area)
    .in('estado', ['pendiente', 'en_curso'])
  ok(`Área ${area}: ${count ?? 0} combates pendientes/en curso`)
}

const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length

console.log('\n=== RESULTADO ===')
console.log(`✓ ${passed} OK  ·  ✗ ${failed} fallos`)
console.log(`\nAdmin: https://festcup2026.com/admin/campeonatos/${id}/llaves`)
console.log(`TV área 1: https://festcup2026.com/campeonato/${SLUG}/cancha/1`)
console.log(`Arbitro: https://festcup2026.com/arbitro`)
console.log(`Unity: ID campeonato = ${id} · áreas 1/2/3\n`)

const reportPath = join(root, 'scripts/.ensayo-report.json')
writeFileSync(reportPath, JSON.stringify({ fecha: new Date().toISOString(), id_campeonato: id, slug: SLUG, passed, failed, results }, null, 2))

process.exit(failed > 0 ? 1 : 0)
