/**
 * Ejecuta el seed del campeonato prueba-llaves-cnu-2026 en producción (Vercel).
 * Requiere: vercel link + CRON_SECRET en producción.
 *
 * Uso: npx vercel env run -- node scripts/ejecutar-seed-produccion.mjs
 */
const BASE = process.env.SEED_BASE_URL || 'https://acctkd-administracion-an52.vercel.app'
const SECRET = process.env.CRON_SECRET

if (!SECRET) {
  console.error('Falta CRON_SECRET (usa: npx vercel env run -- node scripts/ejecutar-seed-produccion.mjs)')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
}

async function post(body) {
  const res = await fetch(`${BASE}/api/admin/campeonatos/seed-prueba-llaves`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || res.statusText)
  return json
}

console.log('→ setup (reset)…')
console.log(await post({ fase: 'setup', reset: true }))

let offset = 0
const limit = 60
let completo = false

while (!completo) {
  console.log(`→ inscripciones offset=${offset}…`)
  const r = await post({ fase: 'inscripciones', offset, limit })
  console.log(`   +${r.lineas_creadas} líneas (${r.procesadas} cats)`)
  completo = r.completo
  offset = r.siguiente_offset
}

console.log('→ finalizar (dorsales, pagos, llaves)…')
console.log(JSON.stringify(await post({ fase: 'finalizar' }), null, 2))
