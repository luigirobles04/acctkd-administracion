#!/usr/bin/env node
/**
 * Crea / actualiza el campeonato REAL Taekwondo FestCup 2026 (slug festcup-2026).
 * Despublica el campeonato de prueba para que maestros vean solo el oficial.
 *
 * Uso: node scripts/preparar-festcup-2026.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SLUG = 'festcup-2026'
const SLUG_PRUEBA = 'prueba-llaves-cnu-2026'

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

async function bundleCrear() {
  const out = join(root, 'scripts/.crear-campeonato-bundle.mjs')
  if (!existsSync(out)) {
    execSync(
      `npx esbuild src/lib/campeonato/crear-campeonato-server.js --bundle --platform=node --format=esm --outfile=${out} --alias:@=./src`,
      { cwd: root, stdio: 'pipe' }
    )
  }
  return import(`file://${out}`)
}

console.log('\n🏆 Preparando Taekwondo FestCup 2026 (oficial)…\n')

const { crearCampeonatoCompleto } = await bundleCrear()

const PSS_TOKEN = process.env.PSS_API_SECRET || 'acctkd-pss-dev-2026'

const payload = {
  nombre: 'Taekwondo FestCup 2026',
  descripcion:
    'Campeonato oficial ACCTKD · Kyorugi, Poomsae y Freestyle · Coliseo Gran Chimú, Trujillo · 7 de noviembre de 2026.',
  fecha_inicio: '2026-11-07',
  fecha_fin: '2026-11-07',
  lugar: 'Coliseo Gran Chimú',
  ciudad: 'Trujillo',
  estado: 'inscripciones',
  fecha_inicio_regular: '2026-07-01',
  fecha_fin_regular: '2026-10-31',
  fecha_cierre_inscripcion: '2026-11-05',
  fecha_gracia_pago: '2026-11-06',
  cuenta_bancaria_info: 'BCP · ACCTKD · Consultar bases PDF en festcup2026.com',
  publicado: true,
}

let { data: existente } = await sb.from('campeonato').select('*').eq('slug', SLUG).maybeSingle()

if (existente) {
  console.log(`→ Ya existe id=${existente.id_campeonato}, actualizando…`)
  const { data: updated, error } = await sb
    .from('campeonato')
    .update({
      ...payload,
      pss_token: PSS_TOKEN,
      puntos_oro: existente.puntos_oro ?? 120,
      puntos_plata: existente.puntos_plata ?? 50,
      puntos_bronce: existente.puntos_bronce ?? 20,
    })
    .eq('id_campeonato', existente.id_campeonato)
    .select()
    .single()
  if (error) throw error
  existente = updated
} else {
  console.log('→ Creando campeonato nuevo con catálogo WT…')
  const { campeonato, categorias_creadas } = await crearCampeonatoCompleto(sb, payload)
  existente = campeonato
  const { error: slugErr } = await sb
    .from('campeonato')
    .update({ slug: SLUG, pss_token: PSS_TOKEN, puntos_oro: 120, puntos_plata: 50, puntos_bronce: 20 })
    .eq('id_campeonato', campeonato.id_campeonato)
  if (slugErr) throw slugErr
  console.log(`   ${categorias_creadas} categorías creadas`)
  const { data: refetch } = await sb.from('campeonato').select('*').eq('id_campeonato', campeonato.id_campeonato).single()
  existente = refetch
}

// Despublicar campeonato de prueba (sigue en BD para ensayos técnicos)
const { data: prueba } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG_PRUEBA).maybeSingle()
if (prueba) {
  await sb.from('campeonato').update({ publicado: false, estado: 'planificado' }).eq('id_campeonato', prueba.id_campeonato)
  console.log(`→ Campeonato prueba (id=${prueba.id_campeonato}) despublicado`)
}

const { count: cats } = await sb
  .from('categoria_campeonato')
  .select('*', { count: 'exact', head: true })
  .eq('id_campeonato', existente.id_campeonato)

console.log('\n✅ FestCup 2026 listo\n')
console.log(JSON.stringify({
  id_campeonato: existente.id_campeonato,
  slug: existente.slug,
  nombre: existente.nombre,
  categorias: cats,
  pss_token: '*** (usa PSS_API_SECRET en Vercel / Unity)',
  inscripciones: `https://festcup2026.com/portal/${SLUG}`,
  admin: `https://festcup2026.com/admin/campeonatos/${existente.id_campeonato}`,
  registro_academia: 'https://festcup2026.com/registro-academia',
}, null, 2))

console.log('\nUnity PSS (3 laptops):')
console.log(`  URL: https://festcup2026.com`)
console.log(`  ID campeonato: ${existente.id_campeonato}`)
console.log(`  Token: (PSS_API_SECRET de Vercel)\n`)
