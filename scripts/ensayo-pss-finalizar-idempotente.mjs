/**
 * Ensayo: POST /api/pss/.../finalizar dos veces → segunda debe ser idempotente (200, sin doble avance).
 *
 * Uso:
 *   PSS_API_SECRET=... BASE_URL=https://festcup2026.com \
 *   ID_CAMPEONATO=10 ID_LLAVE=<llave_en_curso> GANADOR_ID_LINEA=<id> \
 *   node scripts/ensayo-pss-finalizar-idempotente.mjs
 *
 * Modo dry (solo GET área, no finaliza):
 *   DRY=1 ID_CAMPEONATO=10 AREA=1 node scripts/ensayo-pss-finalizar-idempotente.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(name) {
  const p = resolve(process.cwd(), name)
  if (!existsSync(p)) return
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

loadEnvFile('.env.vercel.tmp')
loadEnvFile('.env.local')

const BASE = (process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://festcup2026.com').replace(/\/$/, '')
const TOKEN = process.env.PSS_API_SECRET?.trim()
const ID_CAMP = Number(process.env.ID_CAMPEONATO || 10)
const DRY = process.env.DRY === '1' || process.env.DRY === 'true'

if (!TOKEN) {
  console.error('Falta PSS_API_SECRET')
  process.exit(1)
}

async function pss(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-PSS-Token': TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text.slice(0, 200) }
  }
  return { status: res.status, json }
}

const area = Number(process.env.AREA || 1)
const snap = await pss(`/api/pss/campeonato/${ID_CAMP}/area/${area}`)
console.log('GET area', snap.status, {
  total: snap.json?.total,
  en_curso: (snap.json?.combates || []).find((c) => c.estado === 'en_curso')?.id_llave || null,
})

if (DRY) {
  console.log('DRY=1 — no se llama finalizar')
  process.exit(snap.status === 200 ? 0 : 1)
}

const idLlave = Number(process.env.ID_LLAVE)
const ganador = Number(process.env.GANADOR_ID_LINEA)
if (!idLlave || !ganador) {
  console.error('Define ID_LLAVE y GANADOR_ID_LINEA (o DRY=1)')
  process.exit(1)
}

const body = {
  ganador_id_linea: ganador,
  puntaje1: Number(process.env.PUNTAJE1 || 2),
  puntaje2: Number(process.env.PUNTAJE2 || 1),
}

const path = `/api/pss/campeonato/${ID_CAMP}/combate/${idLlave}/finalizar`
const a = await pss(path, { method: 'POST', body })
const b = await pss(path, { method: 'POST', body })

console.log('finalizar#1', a.status, a.json)
console.log('finalizar#2', b.status, b.json)

const ok =
  a.status === 200 &&
  b.status === 200 &&
  (b.json?.idempotent === true || b.json?.ok === true || b.json?.already_finalized === true)

if (!ok) {
  console.error('FALLO: segunda llamada no parece idempotente')
  process.exit(1)
}
console.log('OK: finalizar idempotente')
