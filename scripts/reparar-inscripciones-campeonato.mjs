#!/usr/bin/env node
/**
 * Repara inscripciones de un campeonato:
 * - Tarifa festival faltante
 * - Precio 0 en líneas festival (marcadas pagado por error)
 * - Duplicados (misma modalidad + mismo competidor)
 *
 * Uso: node scripts/reparar-inscripciones-campeonato.mjs [id_campeonato]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

for (const envFile of ['.env.local', '.env.vercel']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const idCampeonato = Number(process.argv[2] || 10)

const { asegurarTarifasCampeonato } = await import(
  `file://${join(root, 'src/lib/campeonato/categorias-wt.js')}`
)
const { recalcularMontosAcademia, tipoTarifaActual, precioModalidad } = await import(
  `file://${join(root, 'src/lib/campeonato/inscripcion-server.js')}`
)

console.log(`\n🔧 Reparando campeonato id=${idCampeonato}…\n`)

const tarifasNuevas = await asegurarTarifasCampeonato(sb, idCampeonato)
console.log(`Tarifas añadidas: ${tarifasNuevas}`)

const { data: camp } = await sb.from('campeonato').select('*').eq('id_campeonato', idCampeonato).single()
const tipoTarifa = tipoTarifaActual(camp)
const precioFestival = await precioModalidad(sb, idCampeonato, 'festival', tipoTarifa)
console.log(`Precio festival (${tipoTarifa}): S/ ${precioFestival}`)

const { data: lineasFestival } = await sb
  .from('linea_inscripcion')
  .select('id_linea, precio_aplicado, estado')
  .eq('id_campeonato', idCampeonato)
  .eq('modalidad', 'festival')
  .neq('estado', 'anulado')
  .eq('precio_aplicado', 0)

if (lineasFestival?.length && precioFestival > 0) {
  const ids = lineasFestival.map((l) => l.id_linea)
  await sb
    .from('linea_inscripcion')
    .update({
      precio_aplicado: precioFestival,
      es_cobro: true,
      estado: 'pendiente_pago',
      updated_at: new Date().toISOString(),
    })
    .in('id_linea', ids)
  console.log(`Festival precio corregido en ${ids.length} línea(s)`)
}

const { data: lineas } = await sb
  .from('linea_inscripcion')
  .select(`
    id_linea, id_academia_campeonato, modalidad, id_categoria, tipo_oficial, estado, created_at,
    miembros:linea_inscripcion_miembro(id_perfil)
  `)
  .eq('id_campeonato', idCampeonato)
  .neq('estado', 'anulado')
  .order('id_linea', { ascending: true })

function firma(l) {
  const ids = (l.miembros || []).map((m) => m.id_perfil).sort().join(',')
  if (l.modalidad === 'festival') return `festival|${ids}`
  if (l.modalidad === 'oficial') return `oficial|${ids}|${l.tipo_oficial || ''}`
  return `${l.modalidad}|${ids}|${l.id_categoria ?? ''}`
}

const visto = new Map()
const anular = []

for (const l of lineas || []) {
  const key = `${l.id_academia_campeonato}|${firma(l)}`
  if (visto.has(key)) anular.push(l.id_linea)
  else visto.set(key, l.id_linea)
}

if (anular.length) {
  await sb
    .from('linea_inscripcion')
    .update({ estado: 'anulado', updated_at: new Date().toISOString() })
    .in('id_linea', anular)
  console.log(`Duplicados anulados: ${anular.length} (ids: ${anular.join(', ')})`)
} else {
  console.log('Sin duplicados')
}

const acIds = [...new Set((lineas || []).map((l) => l.id_academia_campeonato))]
for (const acId of acIds) {
  await recalcularMontosAcademia(sb, acId)
}
console.log(`Montos recalculados: ${acIds.length} academia(s)`)
console.log('\n✓ Listo\n')
