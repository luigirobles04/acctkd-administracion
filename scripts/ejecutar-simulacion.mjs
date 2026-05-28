/**
 * Ejecuta simulación 10×40 en Supabase (requiere SUPABASE_SERVICE_ROLE_KEY).
 * Lee .env.vercel o .env.local
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundleCat = join(root, 'scripts/.catalogo-bundle.mjs')
const bundleVal = join(root, 'scripts/.validar-bundle.mjs')

for (const envFile of ['.env.vercel', '.env.local']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

if (!existsSync(bundleCat)) {
  execSync(
    `npx esbuild src/lib/campeonato/categorias-wt.js --bundle --platform=node --format=esm --outfile=scripts/.catalogo-bundle.mjs --alias:@=./src`,
    { cwd: root, stdio: 'inherit' }
  )
}
if (!existsSync(bundleVal)) {
  execSync(
    `npx esbuild src/lib/campeonato/validar-categoria.js --bundle --platform=node --format=esm --outfile=scripts/.validar-bundle.mjs --alias:@=./src`,
    { cwd: root, stdio: 'inherit' }
  )
}

const { categoriasValidas, categoriasPoomsaeValidas } = await import(bundleVal)

const SLUG = 'simulacion-10x40-2026'
const ANIO = 2026
const ACADEMIA_NOMBRES = [
  'Guerreros Norte TKD', 'Dragons Trujillo', 'Phoenix Academy Lima', 'Titanes Costa Norte',
  'Cobra Kai Perú', 'Eagles Martial Arts', 'Warrior Spirit TKD', 'Golden Kick Academy',
  'Thunder Team Lima', 'Andes Taekwondo Elite',
]
const PREFIJOS = ['GN', 'DT', 'PA', 'TC', 'CK', 'EA', 'WS', 'GK', 'TT', 'AT']
const GRADOS = ['10º kup', '9º kup', '8º kup', '7º kup', '6º kup', '5º kup', '4º kup', '3º kup', '2º kup', '1º kup', '1º dan', '2º dan']
const EDADES = [7, 8, 10, 11, 13, 14, 16, 17, 20, 25, 30, 35, 42, 50, 55, 62]
const ROLES_OFICIAL = ['coach', 'delegado', 'medico']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o clave Supabase')

const sb = createClient(url, key)

function perfil(a, p) {
  const sexo = p % 2 === 0 ? 'M' : 'F'
  const edad = EDADES[(a * 5 + p) % EDADES.length]
  return {
    documento_tipo: 'DNI',
    documento_numero: `9${String(a * 100 + p + 1).padStart(6, '0')}`,
    nombres: sexo === 'M' ? `Competidor${p + 1}` : `Competidora${p + 1}`,
    apellidos: `Sim ${ACADEMIA_NOMBRES[a].split(' ')[0]}`,
    sexo,
    fecha_nacimiento: `${ANIO - edad}-06-15`,
    grado: GRADOS[(a + p) % GRADOS.length],
  }
}

function pesoPara(cat) {
  if (!cat?.peso_max || Number(cat.peso_max) >= 999) return Number(cat.peso_min || 50) + 2
  return Math.round(((Number(cat.peso_min || 0) + Number(cat.peso_max)) / 2) * 10) / 10
}

function claveCat(c) {
  return `${c.division}|${c.grado_rango}|${c.edad_min}|${c.edad_max}`
}

function catsPoomsaeComunes(p1, p2, cats) {
  const a = categoriasPoomsaeValidas(cats, p1, ANIO)
  const b = categoriasPoomsaeValidas(cats, p2, ANIO)
  const clavesB = new Set(b.map(claveCat))
  return a.filter((c) => clavesB.has(claveCat(c)))
}

async function cleanup() {
  const { data: camp } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG).maybeSingle()
  if (!camp) return null

  const { data: acs } = await sb.from('academia_campeonato').select('id, id_academia').eq('id_campeonato', camp.id_campeonato)
  const acIds = (acs || []).map((a) => a.id)
  const acadIds = (acs || []).map((a) => a.id_academia)

  if (acIds.length) {
    const { data: lineas } = await sb.from('linea_inscripcion').select('id_linea').in('id_academia_campeonato', acIds)
    const lineaIds = (lineas || []).map((l) => l.id_linea)
    if (lineaIds.length) {
      await sb.from('asignacion_pago').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion_miembro').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion').delete().in('id_linea', lineaIds)
    }
  }
  if (acadIds.length) await sb.from('competidor_perfil').delete().in('id_academia', acadIds)
  await sb.from('academia_campeonato').delete().eq('id_campeonato', camp.id_campeonato)
  await sb.from('campeonato_tarifa').delete().eq('id_campeonato', camp.id_campeonato)
  await sb.from('categoria_campeonato').delete().eq('id_campeonato', camp.id_campeonato)
  await sb.from('campeonato').delete().eq('id_campeonato', camp.id_campeonato)

  for (const nombre of ACADEMIA_NOMBRES) {
    await sb.from('academia').delete().eq('nombre', nombre)
  }
  return camp.id_campeonato
}

async function setupCampeonato() {
  const { data: camp, error } = await sb.from('campeonato').insert({
    nombre: 'Simulación 10×40 — FDPTKD 2026',
    slug: SLUG,
    descripcion: '10 academias · 40 competidores · distribución categorías v4',
    fecha_inicio: '2026-07-19',
    fecha_fin: '2026-07-20',
    lugar: 'Coliseo ACCTKD',
    ciudad: 'Trujillo',
    estado: 'inscripciones',
    fecha_inicio_regular: '2026-05-18',
    fecha_fin_regular: '2026-06-17',
    fecha_cierre_inscripcion: '2026-06-17',
    fecha_gracia_pago: '2026-07-01',
    publicado: true,
    bases_version: '4',
    cuenta_bancaria_info: 'BCP · ACCTKD · CCI 12345678901234',
  }).select().single()
  if (error) throw error

  const { data: srcCats } = await sb.from('categoria_campeonato').select('*').eq('id_campeonato', 2)
  const { error: errCat } = await sb.from('categoria_campeonato').insert(
    (srcCats || []).map(({ id_categoria, ...c }) => ({ ...c, id_campeonato: camp.id_campeonato }))
  )
  if (errCat) throw errCat

  const { data: srcTar } = await sb.from('campeonato_tarifa').select('*').eq('id_campeonato', 2)
  await sb.from('campeonato_tarifa').insert(
    (srcTar || []).map(({ id_tarifa, ...t }) => ({ ...t, id_campeonato: camp.id_campeonato }))
  )

  return camp
}

async function main() {
  console.log('Limpiando simulación previa…')
  await cleanup()

  console.log('Creando campeonato…')
  const camp = await setupCampeonato()

  const { data: allCats } = await sb.from('categoria_campeonato').select('*').eq('id_campeonato', camp.id_campeonato)
  const kyorugiTpl = (allCats || []).filter((c) => c.modalidad === 'kyorugi')
  const poomsaeTpl = (allCats || []).filter((c) => c.modalidad === 'poomsae')

  let globalKy = 0
  let globalPm = 0
  const stats = { perfiles: 0, lineas: 0, kyorugi: 0, poomsae: 0, grupos: 0, oficiales: 0 }

  for (let a = 0; a < 10; a++) {
    console.log(`Academia ${a + 1}/10: ${ACADEMIA_NOMBRES[a]}`)

    const { data: academia, error: errA } = await sb.from('academia').insert({
      nombre: ACADEMIA_NOMBRES[a],
      telefono: `519${String(20000000 + a).slice(-8)}`,
      codigo_prefijo: PREFIJOS[a],
    }).select().single()
    if (errA) throw errA

    const { data: ac, error: errAc } = await sb.from('academia_campeonato').insert({
      id_academia: academia.id_academia,
      id_campeonato: camp.id_campeonato,
      token: `simtok${a}${SLUG.replace(/-/g, '')}`,
      estado_aprobacion: 'aprobada',
      estado_lista: 'enviada',
      aceptacion_bases_at: new Date().toISOString(),
      aceptacion_bases_version: '4',
    }).select().single()
    if (errAc) throw errAc

    const perfilesData = Array.from({ length: 40 }, (_, p) => perfil(a, p))

    // Ajustes de sexo para parejas/equipo (igual que simular-campeonato.mjs)
    for (let pair = 0; pair < 3; pair++) {
      const i1 = 26 + pair * 2
      const i2 = i1 + 1
      if (perfilesData[i1].sexo !== perfilesData[i2].sexo && pair === 0) {
        perfilesData[i2] = { ...perfilesData[i2], sexo: perfilesData[i1].sexo }
      }
    }
    perfilesData[32] = { ...perfilesData[32], sexo: 'M' }
    perfilesData[33] = { ...perfilesData[33], sexo: 'F' }
    for (let k = 34; k <= 36; k++) perfilesData[k] = { ...perfilesData[k], sexo: 'M' }

    const { data: perfiles, error: errP } = await sb.from('competidor_perfil').insert(
      perfilesData.map((p) => ({ ...p, id_academia: academia.id_academia, documento_tipo: 'DNI' }))
    ).select()
    if (errP) throw errP
    stats.perfiles += perfiles.length

    const perfilByIdx = (p) => perfiles[p]
    const lineasPlan = []

    for (let p = 0; p < 16; p++) {
      const cats = categoriasValidas(kyorugiTpl, perfilesData[p], ANIO, null)
      if (!cats.length) continue
      const cat = cats[(globalKy++) % cats.length]
      lineasPlan.push({ modalidad: 'kyorugi_individual', cat: cat.nombre, peso: pesoPara(cat), miembros: [p], precio: 90, estado: 'pendiente_pago' })
      stats.kyorugi++
    }

    for (let p = 16; p < 26; p++) {
      const cats = categoriasPoomsaeValidas(poomsaeTpl, perfilesData[p], ANIO)
      if (!cats.length) continue
      const cat = cats[(globalPm++) % cats.length]
      lineasPlan.push({ modalidad: 'poomsae_individual', cat: cat.nombre, miembros: [p], precio: 90, estado: 'pendiente_pago' })
      stats.poomsae++
    }

    for (let pair = 0; pair < 3; pair++) {
      const i1 = 26 + pair * 2
      const i2 = i1 + 1
      const comunes = catsPoomsaeComunes(perfilesData[i1], perfilesData[i2], poomsaeTpl)
      const cat = comunes[pair % Math.max(comunes.length, 1)]
      if (!cat) continue
      lineasPlan.push({ modalidad: 'poomsae_pareja_reconocida', cat: cat.nombre, miembros: [i1, i2], precio: 140, estado: 'pendiente_pago', grupo: true })
      stats.grupos++
    }

    {
      const comunes = catsPoomsaeComunes(perfilesData[32], perfilesData[33], poomsaeTpl)
      const cat = comunes[a % Math.max(comunes.length, 1)]
      if (cat) {
        lineasPlan.push({ modalidad: 'poomsae_pareja_freestyle', cat: cat.nombre, miembros: [32, 33], precio: 140, estado: 'pendiente_pago', grupo: true })
        stats.grupos++
      }
    }

    {
      const cats = categoriasPoomsaeValidas(poomsaeTpl, perfilesData[34], ANIO)
      const cat = cats[(a * 3) % Math.max(cats.length, 1)]
      if (cat) {
        lineasPlan.push({ modalidad: 'poomsae_equipo', cat: cat.nombre, miembros: [34, 35, 36], precio: 150, estado: 'pendiente_pago', grupo: true })
        stats.grupos++
      }
    }

    for (let o = 0; o < 3; o++) {
      lineasPlan.push({ modalidad: 'oficial', cat: null, miembros: [37 + o], precio: 0, estado: 'pagado', tipoOficial: ROLES_OFICIAL[o] })
      stats.oficiales++
    }

    for (const l of lineasPlan) {
      const cat = l.cat ? allCats.find((c) => c.nombre === l.cat) : null
      const { data: linea, error: errL } = await sb.from('linea_inscripcion').insert({
        id_academia_campeonato: ac.id,
        id_campeonato: camp.id_campeonato,
        modalidad: l.modalidad,
        tipo_oficial: l.tipoOficial || null,
        id_categoria: cat?.id_categoria || null,
        grupo_uuid: l.grupo ? randomUUID() : null,
        es_cobro: l.precio > 0,
        precio_aplicado: l.precio,
        tipo_tarifa: 'regular',
        peso_declarado: l.peso ?? null,
        estado: l.estado,
      }).select().single()
      if (errL) throw errL

      await sb.from('linea_inscripcion_miembro').insert(
        l.miembros.map((p) => ({ id_linea: linea.id_linea, id_perfil: perfilByIdx(p).id_perfil }))
      )
      stats.lineas++
    }

    const { data: lineasAc } = await sb.from('linea_inscripcion').select('precio_aplicado').eq('id_academia_campeonato', ac.id).neq('estado', 'anulado')
    const montoTotal = (lineasAc || []).reduce((s, l) => s + Number(l.precio_aplicado || 0), 0)
    await sb.from('academia_campeonato').update({ monto_total: montoTotal, ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
  }

  await crearUsuariosRepresentantes()

  console.log('\n✅ Simulación completada')
  console.log(JSON.stringify({ slug: SLUG, id_campeonato: camp.id_campeonato, ...stats }, null, 2))
  console.log('\n👤 Usuarios portal (contraseña: sim2026):')
  for (let a = 0; a < PREFIJOS.length; a++) {
    console.log(`   sim_${PREFIJOS[a].toLowerCase()} — ${ACADEMIA_NOMBRES[a]}`)
  }
}

async function crearUsuariosRepresentantes() {
  const bcrypt = (await import('bcryptjs')).default
  const hash = await bcrypt.hash('sim2026', 10)
  const { data: rol } = await sb.from('rol').select('id_rol').eq('nombre', 'representante').single()
  if (!rol) return

  const { data: academias } = await sb
    .from('academia')
    .select('id_academia, nombre, codigo_prefijo')
    .in('nombre', ACADEMIA_NOMBRES)

  for (const a of academias || []) {
    const username = `sim_${String(a.codigo_prefijo).toLowerCase()}`
    const { data: exists } = await sb.from('usuario').select('id_usuario').eq('username', username).maybeSingle()
    if (exists) continue
    await sb.from('usuario').insert({
      username,
      password_hash: hash,
      id_rol: rol.id_rol,
      activo: true,
      email: `sim${String(a.codigo_prefijo).toLowerCase()}@fdptkd.test`,
      nombre_completo: `Rep. ${a.nombre}`,
      dni: `81${String(a.id_academia).padStart(6, '0')}`,
      id_academia: a.id_academia,
    })
  }
}

main().catch((e) => {
  console.error('Error:', e.message || e)
  process.exit(1)
})
