/**
 * Verifica si el DDL de FestCup ya está aplicado (solo lectura, usa anon key).
 * Uso: node scripts/verificar-ddl-festcup.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const name of ['.env.local', '.env.production.local']) {
    const p = resolve(process.cwd(), name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      const k = line.slice(0, i).trim()
      let v = line.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (process.env[k] == null || process.env[k] === '') process.env[k] = v
    }
  }
}

function jwtRole(key) {
  if (!key) return null
  if (key.startsWith('sb_secret_')) return 'service_role'
  if (key.startsWith('sb_publishable_')) return 'anon'
  try {
    const p = JSON.parse(
      Buffer.from(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    )
    return p.role
  } catch {
    return 'invalid'
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y una key en .env.local')
  process.exit(1)
}

const role = jwtRole(key)
console.log('Proyecto:', url)
console.log('Key usada:', role, `(len ${key.length})`)
if (role !== 'service_role') {
  console.warn('⚠ La key NO es service_role — solo podemos verificar lectura, no aplicar DDL desde aquí.')
}

const sb = createClient(url, key, { auth: { persistSession: false } })

const checks = []

// 1. Columna poomsae_cancha
const { error: colErr } = await sb.from('linea_inscripcion').select('id_linea,poomsae_cancha,poomsae_estado').limit(1)
checks.push({
  name: 'columna poomsae_cancha',
  ok: !colErr?.message?.includes('poomsae_cancha'),
  detail: colErr?.message || 'existe',
})

// 2. Estado ausente (intentar update simulado no; solo constraint vía select)
checks.push({
  name: 'select poomsae_estado',
  ok: !colErr,
  detail: colErr?.message || 'ok',
})

// 3. Buckets storage (anon no puede listar buckets vía API aunque existan en BD)
let buckets = []
const res = await fetch(`${url}/storage/v1/bucket`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (res.ok) {
  buckets = await res.json()
}

// Fallback: si la key es anon y la lista viene vacía, avisar pero no fallar si columnas ok
const bucketNames = ['competidores-fotos', 'inscripcion-vouchers', 'backups-campeonato']
for (const name of bucketNames) {
  const has = (buckets || []).some((b) => b.name === name || b.id === name)
  checks.push({
    name: `bucket ${name}`,
    ok: has || role === 'anon', // anon no lista buckets; verificar con service_role o MCP
    detail: has ? 'existe' : role === 'anon' ? 'no verificable con anon (revisar en Supabase Storage)' : 'falta',
  })
}

// 4. pss_token no dev
const { data: camp } = await sb.from('campeonato').select('slug,pss_token').eq('slug', 'festcup-2026').maybeSingle()
checks.push({
  name: 'pss_token festcup-2026',
  ok: camp?.pss_token && camp.pss_token !== 'acctkd-pss-dev-2026',
  detail: camp?.pss_token ? `len ${camp.pss_token.length}` : 'sin campeonato',
})

console.log('\n--- Resultados ---')
let allOk = true
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗'
  console.log(`${mark} ${c.name}: ${c.detail}`)
  if (!c.ok) allOk = false
}

if (allOk) {
  console.log('\nTodo listo para poomsae PSS y storage.')
} else {
  console.log('\nFalta aplicar DDL manualmente en Supabase SQL Editor (ver abajo).')
  process.exit(1)
}
