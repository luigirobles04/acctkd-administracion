/**
 * Enriquece el campeonato existente simulacion-10x40-2026 (id 8):
 * - Más academias
 * - Kyorugi: categorías con 5, 7, 9 u 11 participantes
 * - Poomsae: mínimo 5 por categoría seleccionada
 * - Pesaje, dorsales, llaves, combates finalizados
 *
 * Uso: node scripts/enriquecer-campeonato-ideal.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ID_CAMPEONATO = 8
const SLUG = 'simulacion-10x40-2026'
const ANIO = 2026
const KYORUGI_TARGETS = [5, 7, 9, 11]
const POOMSAE_MIN = 5

const NUEVAS_ACADEMIAS = [
  { nombre: 'Leones del Norte TKD', prefijo: 'LN' },
  { nombre: 'Samurai Kick Lima', prefijo: 'SK' },
  { nombre: 'Masters Pro Academy', prefijo: 'MP' },
  { nombre: 'Rising Stars TKD', prefijo: 'RS' },
  { nombre: 'Black Belt Elite Perú', prefijo: 'BE' },
]

const GRADOS = ['10º kup', '8º kup', '6º kup', '4º kup', '2º kup', '1º dan', '2º dan']
const EDADES = [8, 10, 12, 14, 16, 18, 22, 28, 35, 45, 55]

for (const envFile of ['.env.vercel', '.env.local', '.env.example']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Faltan variables Supabase en .env.local')

const sb = createClient(url, key)

function pesoPara(cat) {
  if (!cat?.peso_max || Number(cat.peso_max) >= 999) return Number(cat.peso_min || 50) + 2
  return Math.round(((Number(cat.peso_min || 0) + Number(cat.peso_max)) / 2) * 10) / 10
}

function perfilDemo(academiaIdx, seq, sexo = null) {
  const s = sexo || (seq % 2 === 0 ? 'M' : 'F')
  const edad = EDADES[(academiaIdx + seq) % EDADES.length]
  return {
    documento_tipo: 'DNI',
    documento_numero: `8${String(academiaIdx * 1000 + seq).padStart(7, '0')}`,
    nombres: s === 'M' ? `Atleta${seq}` : `AtletaF${seq}`,
    apellidos: `Demo ${NUEVAS_ACADEMIAS[academiaIdx % NUEVAS_ACADEMIAS.length]?.prefijo || 'XX'}`,
    sexo: s,
    fecha_nacimiento: `${ANIO - edad}-03-10`,
    grado: GRADOS[(academiaIdx + seq) % GRADOS.length],
  }
}

async function bundleLib() {
  const out = join(root, 'scripts/.enriquecer-bundle.mjs')
  if (!existsSync(out)) {
    execSync(
      `npx esbuild src/lib/campeonato/llaves-kyorugi.js src/lib/campeonato/validar-categoria.js src/lib/campeonato/inscripcion-server.js --bundle --platform=node --format=esm --outdir=scripts/.enriquecer-lib --alias:@=./src`,
      { cwd: root, stdio: 'inherit' }
    )
  }
  const { generarTodasLasLlaves, registrarGanadorCombate } = await import(`file://${join(root, 'scripts/.enriquecer-lib/llaves-kyorugi.js')}`)
  const { categoriasValidas, categoriasPoomsaeValidas } = await import(`file://${join(root, 'scripts/.enriquecer-lib/validar-categoria.js')}`)
  const { asignarDorsalLinea } = await import(`file://${join(root, 'scripts/.enriquecer-lib/inscripcion-server.js')}`)
  return { generarTodasLasLlaves, registrarGanadorCombate, categoriasValidas, categoriasPoomsaeValidas, asignarDorsalLinea }
}

async function ensureAcademias(idCampeonato) {
  const { data: existentes } = await sb.from('academia_campeonato').select('id, academia(id_academia, nombre, codigo_prefijo)').eq('id_campeonato', idCampeonato)
  const nombres = new Set((existentes || []).map((a) => a.academia?.nombre))

  for (const na of NUEVAS_ACADEMIAS) {
    if (nombres.has(na.nombre)) continue
    const { data: acad } = await sb.from('academia').insert({ nombre: na.nombre, telefono: `519${na.prefijo}00001`, codigo_prefijo: na.prefijo }).select().single()
    await sb.from('academia_campeonato').insert({
      id_academia: acad.id_academia,
      id_campeonato: idCampeonato,
      token: `ideal${na.prefijo.toLowerCase()}${idCampeonato}`,
      estado_aprobacion: 'aprobada',
      estado_lista: 'enviada',
      aceptacion_bases_at: new Date().toISOString(),
      aceptacion_bases_version: '4',
    })
    console.log(`  + Academia ${na.nombre}`)
  }

  const { data: all } = await sb.from('academia_campeonato').select('id, academia(id_academia, nombre, codigo_prefijo)').eq('id_campeonato', idCampeonato).eq('estado_aprobacion', 'aprobada')
  return all || []
}

async function countInscritos(idCategoria) {
  const { count } = await sb
    .from('linea_inscripcion')
    .select('id_linea', { count: 'exact', head: true })
    .eq('id_categoria', idCategoria)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  return count || 0
}

async function crearLineaKyorugi(ac, idCampeonato, cat, perfil, peso) {
  const { data: linea } = await sb.from('linea_inscripcion').insert({
    id_academia_campeonato: ac.id,
    id_campeonato: idCampeonato,
    modalidad: 'kyorugi_individual',
    id_categoria: cat.id_categoria,
    es_cobro: true,
    precio_aplicado: 90,
    tipo_tarifa: 'regular',
    peso_declarado: peso,
    estado: 'pagado',
  }).select().single()

  await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: perfil.id_perfil })
  return linea
}

async function crearLineaPoomsae(ac, idCampeonato, cat, perfil) {
  const { data: linea } = await sb.from('linea_inscripcion').insert({
    id_academia_campeonato: ac.id,
    id_campeonato: idCampeonato,
    modalidad: 'poomsae_individual',
    id_categoria: cat.id_categoria,
    es_cobro: true,
    precio_aplicado: 90,
    tipo_tarifa: 'regular',
    estado: 'pagado',
  }).select().single()
  await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: perfil.id_perfil })
  return linea
}

async function llenarKyorugi(idCampeonato, academias, catsKy, categoriasValidas) {
  const seleccionadas = catsKy.slice(0, 48)
  let globalSeq = 9000

  for (let i = 0; i < seleccionadas.length; i++) {
    const cat = seleccionadas[i]
    const target = KYORUGI_TARGETS[i % KYORUGI_TARGETS.length]
    const actuales = await countInscritos(cat.id_categoria)
    const needed = Math.max(0, target - actuales)
    if (!needed) continue

    console.log(`  Kyorugi ${cat.nombre}: ${actuales} → ${target} (+${needed})`)

    for (let n = 0; n < needed; n++) {
      const ac = academias[n % academias.length]
      const seq = globalSeq++
      const p = perfilDemo(academias.indexOf(ac), seq, cat.genero === 'F' ? 'F' : cat.genero === 'M' ? 'M' : null)
      p.apellidos = `${ac.academia.codigo_prefijo} Demo`

      const { data: perfil } = await sb.from('competidor_perfil').insert({ ...p, id_academia: ac.academia.id_academia }).select().single()
      await crearLineaKyorugi(ac, idCampeonato, cat, perfil, pesoPara(cat))
    }
  }
}

async function llenarPoomsae(idCampeonato, academias, catsPm, categoriasPoomsaeValidas) {
  const seleccionadas = catsPm.slice(0, 60)
  let globalSeq = 8000

  for (const cat of seleccionadas) {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('id_linea', { count: 'exact', head: true })
      .eq('id_categoria', cat.id_categoria)
      .like('modalidad', 'poomsae%')
      .eq('estado', 'aprobado')
    const actuales = count || 0
    const needed = Math.max(0, POOMSAE_MIN - actuales)
    if (!needed) continue

    console.log(`  Poomsae ${cat.nombre}: ${actuales} → ${POOMSAE_MIN} (+${needed})`)

    for (let n = 0; n < needed; n++) {
      const ac = academias[(globalSeq + n) % academias.length]
      const seq = globalSeq++
      const p = perfilDemo(academias.indexOf(ac), seq)
      p.apellidos = `${ac.academia.codigo_prefijo} Poomsae`

      const { data: perfil } = await sb.from('competidor_perfil').insert({ ...p, id_academia: ac.academia.id_academia }).select().single()
      await crearLineaPoomsae(ac, idCampeonato, cat, perfil)
    }
  }
}

async function aprobarYDorsales(asignarDorsalLinea, idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, estado, dorsal_numero')
    .eq('id_campeonato', idCampeonato)
    .in('estado', ['pagado', 'pendiente_pago', 'borrador'])

  for (const l of lineas || []) {
    if (l.dorsal_numero) continue
    await asignarDorsalLinea(sb, l.id_linea)
  }
}

async function aplicarPesaje(idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, peso_declarado, id_categoria, categoria:categoria_campeonato(peso_min, peso_max)')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')

  for (const l of lineas || []) {
    const peso = Number(l.peso_declarado || pesoPara(l.categoria))
    await sb.from('linea_inscripcion').update({
      peso_oficial: peso,
      pesaje_estado: 'ok',
      pesaje_intentos: 1,
      updated_at: new Date().toISOString(),
    }).eq('id_linea', l.id_linea)
  }
}

async function finalizarCombates(registrarGanadorCombate, idCampeonato) {
  const { data: combates } = await sb
    .from('llave_kyorugi')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('estado', 'pendiente')
    .not('id_linea1', 'is', null)
    .not('id_linea2', 'is', null)
    .order('orden_pista', { ascending: true, nullsFirst: false })

  let ok = 0
  for (const c of combates || []) {
    try {
      const g = Math.random() > 0.5 ? c.id_linea1 : c.id_linea2
      const p1 = Math.floor(Math.random() * 8) + 5
      const p2 = g === c.id_linea1 ? p1 - 2 : p1 + 2
      await registrarGanadorCombate(sb, c.id_llave, g, { puntaje1: Math.max(0, p1), puntaje2: Math.max(0, p2) })
      ok++
    } catch {
      // puede fallar si aún no hay ambos en rondas posteriores; reintentar al final
    }
  }

  // Segunda pasada para rondas que se desbloquearon
  const { data: restantes } = await sb
    .from('llave_kyorugi')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('estado', 'pendiente')
    .not('id_linea1', 'is', null)
    .not('id_linea2', 'is', null)

  for (const c of restantes || []) {
    try {
      const g = c.id_linea1
      await registrarGanadorCombate(sb, c.id_llave, g, { puntaje1: 12, puntaje2: 8 })
      ok++
    } catch { /* skip */ }
  }

  return ok
}

async function main() {
  console.log(`\n🏆 Enriqueciendo campeonato ${ID_CAMPEONATO} (${SLUG})…\n`)

  const { data: camp } = await sb.from('campeonato').select('*').eq('id_campeonato', ID_CAMPEONATO).single()
  if (!camp) throw new Error(`Campeonato ${ID_CAMPEONATO} no encontrado`)

  const libs = await bundleLib()

  console.log('1. Academias…')
  const academias = await ensureAcademias(ID_CAMPEONATO)
  console.log(`   Total academias: ${academias.length}`)

  const { data: catsKy } = await sb.from('categoria_campeonato').select('*').eq('id_campeonato', ID_CAMPEONATO).eq('modalidad', 'kyorugi').order('orden')
  const { data: catsPm } = await sb.from('categoria_campeonato').select('*').eq('id_campeonato', ID_CAMPEONATO).eq('modalidad', 'poomsae').order('orden')

  console.log('2. Inscripciones kyorugi (5/7/9/11)…')
  await llenarKyorugi(ID_CAMPEONATO, academias, catsKy || [], libs.categoriasValidas)

  console.log('3. Inscripciones poomsae (mín. 5)…')
  await llenarPoomsae(ID_CAMPEONATO, academias, catsPm || [], libs.categoriasPoomsaeValidas)

  console.log('4. Dorsales…')
  await aprobarYDorsales(libs.asignarDorsalLinea, ID_CAMPEONATO)

  console.log('5. Pesaje…')
  await aplicarPesaje(ID_CAMPEONATO)

  console.log('6. Regenerar llaves…')
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', ID_CAMPEONATO)
  const llaves = await libs.generarTodasLasLlaves(sb, ID_CAMPEONATO)
  console.log(`   ${llaves.generadas} llaves generadas`)

  console.log('7. Finalizar combates…')
  const finalizados = await finalizarCombates(libs.registrarGanadorCombate, ID_CAMPEONATO)
  console.log(`   ${finalizados} combates cerrados`)

  await sb.from('campeonato').update({
    estado: 'finalizado',
    updated_at: new Date().toISOString(),
  }).eq('id_campeonato', ID_CAMPEONATO)

  const { count: ky } = await sb.from('linea_inscripcion').select('*', { count: 'exact', head: true }).eq('id_campeonato', ID_CAMPEONATO).eq('modalidad', 'kyorugi_individual').eq('estado', 'aprobado')
  const { count: pm } = await sb.from('linea_inscripcion').select('*', { count: 'exact', head: true }).eq('id_campeonato', ID_CAMPEONATO).like('modalidad', 'poomsae%').eq('estado', 'aprobado')
  const { count: fin } = await sb.from('llave_kyorugi').select('*', { count: 'exact', head: true }).eq('id_campeonato', ID_CAMPEONATO).eq('estado', 'finalizado')

  console.log('\n✅ Campeonato ideal listo')
  console.log(JSON.stringify({ id_campeonato: ID_CAMPEONATO, slug: SLUG, kyorugi_aprobados: ky, poomsae_aprobados: pm, combates_finalizados: fin, llaves_generadas: llaves.generadas }, null, 2))
}

main().catch((e) => {
  console.error('Error:', e.message || e)
  process.exit(1)
})
