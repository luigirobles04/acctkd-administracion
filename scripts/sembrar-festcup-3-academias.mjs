#!/usr/bin/env node
/**
 * FestCup test: 3 academias con logo PNG, 2 atletas por academia por categoría (6/categoría),
 * pagado, aprobado, pesaje OK.
 *
 * Uso: node scripts/sembrar-festcup-3-academias.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const libDir = join(root, 'scripts/.festcup-seed-lib')
const { asignarDorsalLinea, registrarPagoTotalAcademia, recalcularMontosAcademia } = await import(
  `file://${join(libDir, 'inscripcion-server.js')}`
)
const { perfilParaCategoria } = await import(`file://${join(libDir, 'sembrar-campeonato-prueba-llaves.js')}`)
const SLUG = 'festcup-2026'
const ID_CAMP = 10
const ATLETAS_POR_ACADEMIA = 2

const ACADEMIAS = [
  {
    nombre: 'FestCup Test — Dragones Rojos',
    prefijo: 'DR',
    ciudad: 'Trujillo',
    logo: join(root, 'public/branding/academia-logo.png'),
  },
  {
    nombre: 'FestCup Test — Guerreros Azules',
    prefijo: 'GA',
    ciudad: 'Trujillo',
    logo: join(root, 'public/branding/wt-logo-sm.png'),
  },
  {
    nombre: 'FestCup Test — Leones Dorados',
    prefijo: 'LD',
    ciudad: 'Trujillo',
    logo: join(root, 'public/branding/academia-logo-sm.png'),
  },
]

function loadEnv() {
  for (const f of ['.env.local', '.env.vercel.tmp']) {
    const p = join(root, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      let v = line.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[line.slice(0, i).trim()]) process.env[line.slice(0, i).trim()] = v
    }
  }
}

function pesoParaCategoria(cat) {
  const min = Number(cat.peso_min || 0)
  const max = Number(cat.peso_max)
  if (!max || max >= 999) return Math.round((min + 3) * 10) / 10
  return Math.round((min + 0.5 + (max - min) / 2) * 10) / 10
}

async function uploadLogo(sb, idAcademia, filePath) {
  const buffer = readFileSync(filePath)
  const path = `academia-logos/${idAcademia}/logo_test.png`
  const { error: up } = await sb.storage.from('competidores-fotos').upload(path, buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (up) throw up
  const { error: db } = await sb.from('academia').update({ logo_url: path }).eq('id_academia', idAcademia)
  if (db) throw db
  return path
}

async function crearAcademias(sb, idCampeonato) {
  const links = []
  for (const ac of ACADEMIAS) {
    let { data: row } = await sb.from('academia').select('id_academia').eq('codigo_prefijo', ac.prefijo).maybeSingle()
    if (!row) {
      const { data: nueva, error } = await sb
        .from('academia')
        .insert({
          nombre: ac.nombre,
          telefono: `519${ac.prefijo}99999`,
          codigo_prefijo: ac.prefijo,
          ciudad: ac.ciudad,
          representante_nombre: `Coach ${ac.prefijo}`,
          representante_dni: `7099${ac.prefijo}01`.slice(0, 8),
          activa: true,
        })
        .select('id_academia')
        .single()
      if (error) throw error
      row = nueva
    } else {
      await sb.from('academia').update({ nombre: ac.nombre, ciudad: ac.ciudad }).eq('id_academia', row.id_academia)
    }

    if (existsSync(ac.logo)) {
      await uploadLogo(sb, row.id_academia, ac.logo)
      console.log(`  logo ${ac.prefijo} OK`)
    }

    const { data: existingLink } = await sb
      .from('academia_campeonato')
      .select('id, academia(id_academia, nombre, codigo_prefijo)')
      .eq('id_campeonato', idCampeonato)
      .eq('id_academia', row.id_academia)
      .maybeSingle()

    if (existingLink) {
      await sb
        .from('academia_campeonato')
        .update({
          estado_aprobacion: 'aprobada',
          estado_lista: 'enviada',
          estado_pago: 'validado',
        })
        .eq('id', existingLink.id)
      links.push(existingLink)
      continue
    }

    const { data: link, error: errL } = await sb
      .from('academia_campeonato')
      .insert({
        id_academia: row.id_academia,
        id_campeonato: idCampeonato,
        token: `fc3${ac.prefijo.toLowerCase()}${idCampeonato}`,
        estado_aprobacion: 'aprobada',
        estado_lista: 'enviada',
        estado_pago: 'validado',
        aceptacion_bases_at: new Date().toISOString(),
        aceptacion_bases_version: '4',
      })
      .select('id, academia(id_academia, nombre, codigo_prefijo)')
      .single()
    if (errL) throw errL
    links.push(link)
  }
  return links
}

async function llenarLote(sb, idCampeonato, categorias, academias, seqStart) {
  const perfiles = []
  const lineaPlan = []
  let seq = seqStart

  for (const cat of categorias) {
    const modalidad = cat.modalidad === 'kyorugi' ? 'kyorugi_individual' : 'poomsae_individual'
    const cupo = ATLETAS_POR_ACADEMIA * academias.length
    for (let n = 0; n < cupo; n++) {
      const ac = academias[n % academias.length]
      if (!ac?.academia?.id_academia) continue
      seq++
      perfiles.push(perfilParaCategoria(cat, seq, ac.academia.id_academia, idCampeonato))
      lineaPlan.push({
        acId: ac.id,
        catId: cat.id_categoria,
        modalidad,
        peso: modalidad === 'kyorugi_individual' ? pesoParaCategoria(cat) : null,
        perfilIdx: perfiles.length - 1,
      })
    }
  }

  if (!perfiles.length) return { added: 0, nextSeq: seq }

  const { data: perfilesIns, error: errP } = await sb.from('competidor_perfil').insert(perfiles).select('id_perfil')
  if (errP) throw errP

  const { data: tarifas } = await sb.from('campeonato_tarifa').select('modalidad, precio_regular').eq('id_campeonato', idCampeonato)
  const precioMap = Object.fromEntries((tarifas || []).map((t) => [t.modalidad, Number(t.precio_regular || 90)]))

  const lineas = lineaPlan.map((p) => {
    const modKey = p.modalidad === 'kyorugi_individual' ? 'kyorugi' : 'poomsae'
    const row = {
      id_academia_campeonato: p.acId,
      id_campeonato: idCampeonato,
      modalidad: p.modalidad,
      id_categoria: p.catId,
      es_cobro: true,
      precio_aplicado: precioMap[modKey] || precioMap[p.modalidad] || 70,
      tipo_tarifa: 'regular',
      estado: 'pagado',
    }
    if (p.peso != null) row.peso_declarado = p.peso
    return row
  })

  const { data: lineasIns, error: errL } = await sb.from('linea_inscripcion').insert(lineas).select('id_linea')
  if (errL) throw errL

  const miembros = lineaPlan.map((p, i) => ({
    id_linea: lineasIns[i].id_linea,
    id_perfil: perfilesIns[p.perfilIdx].id_perfil,
  }))
  const { error: errM } = await sb.from('linea_inscripcion_miembro').insert(miembros)
  if (errM) throw errM

  return { added: perfiles.length, nextSeq: seq }
}

async function fetchAllLineas(sb, idCampeonato, modalidadFilter) {
  const rows = []
  const page = 1000
  let from = 0
  while (true) {
    let q = sb
      .from('linea_inscripcion')
      .select('id_linea, peso_declarado')
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')
      .order('id_linea', { ascending: true })
      .range(from, from + page - 1)
    if (modalidadFilter === 'kyorugi') q = q.eq('modalidad', 'kyorugi_individual')
    else if (modalidadFilter === 'poomsae') q = q.like('modalidad', 'poomsae%')
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < page) break
    from += page
  }
  return rows
}

async function aprobarTodo(sb, idCampeonato) {
  const ky = await fetchAllLineas(sb, idCampeonato, 'kyorugi')

  let dorsales = 0
  for (const l of ky) {
    const { data: cur } = await sb.from('linea_inscripcion').select('dorsal_numero, estado').eq('id_linea', l.id_linea).single()
    if (cur?.dorsal_numero && cur.estado === 'aprobado') continue
    await asignarDorsalLinea(sb, l.id_linea)
    dorsales++
    if (dorsales % 100 === 0) process.stdout.write(`\r  dorsales ${dorsales}/${ky.length}`)
  }
  if (ky.length) process.stdout.write(`\r  dorsales ${dorsales}/${ky.length}\n`)

  const pm = await fetchAllLineas(sb, idCampeonato, 'poomsae')
  for (let i = 0; i < pm.length; i += 500) {
    const chunk = pm.slice(i, i + 500).map((l) => l.id_linea)
    await sb
      .from('linea_inscripcion')
      .update({ estado: 'aprobado', updated_at: new Date().toISOString() })
      .in('id_linea', chunk)
  }

  const kyOk = await fetchAllLineas(sb, idCampeonato, 'kyorugi')
  for (let i = 0; i < kyOk.length; i += 500) {
    const chunk = kyOk.slice(i, i + 500)
    for (const l of chunk) {
      await sb
        .from('linea_inscripcion')
        .update({
          peso_oficial: Number(l.peso_declarado),
          pesaje_estado: 'ok',
          pesaje_intentos: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id_linea', l.id_linea)
    }
    process.stdout.write(`\r  pesaje ${Math.min(i + 500, kyOk.length)}/${kyOk.length}`)
  }
  if (kyOk.length) process.stdout.write('\n')

  const { data: acs } = await sb.from('academia_campeonato').select('id').eq('id_campeonato', idCampeonato)
  for (const ac of acs || []) {
    await recalcularMontosAcademia(sb, ac.id)
    await registrarPagoTotalAcademia(sb, ac.id)
  }

  return { dorsales, poomsae: pm.length, pesaje: kyOk.length, academias: (acs || []).length }
}

loadEnv()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

console.log(`\n🏟 Sembrando FestCup (${SLUG}) — 3 academias × ${ATLETAS_POR_ACADEMIA} atletas/categoría\n`)

const soloAprobacion = process.argv.includes('--solo-aprobacion')

const { data: camp } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG).maybeSingle()
if (!camp || camp.id_campeonato !== ID_CAMP) {
  console.error('Campeonato festcup-2026 no encontrado')
  process.exit(1)
}

if (!soloAprobacion) {
  console.log('→ Academias + logos…')
  const academias = await crearAcademias(sb, ID_CAMP)
  console.log(`  ${academias.length} academias enlazadas`)

  const { data: categorias } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_campeonato', ID_CAMP)
    .order('orden')

  const all = categorias || []
  console.log(`→ Inscripciones en ${all.length} categorías (lotes de 40)…`)

  const BATCH = 40
  let seq = 900_000
  let total = 0
  for (let i = 0; i < all.length; i += BATCH) {
    const slice = all.slice(i, i + BATCH)
    const { added, nextSeq } = await llenarLote(sb, ID_CAMP, slice, academias, seq)
    seq = nextSeq
    total += added
    process.stdout.write(`\r  ${Math.min(i + BATCH, all.length)}/${all.length} categorías · ${total} atletas`)
  }
  console.log('')
} else {
  console.log('→ Modo solo-aprobacion (sin nuevas inscripciones)\n')
}

console.log('→ Aprobación, dorsales, pesaje, pagos…')
const fin = await aprobarTodo(sb, ID_CAMP)

const { count: lineas } = await sb
  .from('linea_inscripcion')
  .select('*', { count: 'exact', head: true })
  .eq('id_campeonato', ID_CAMP)

console.log('\n✅ Listo\n')
console.log(
  JSON.stringify(
    {
      id_campeonato: ID_CAMP,
      slug: SLUG,
      academias: ACADEMIAS.map((a) => a.prefijo),
      lineas_total: lineas,
      atletas_por_categoria: ATLETAS_POR_ACADEMIA * 3,
      ...fin,
    },
    null,
    2
  )
)
