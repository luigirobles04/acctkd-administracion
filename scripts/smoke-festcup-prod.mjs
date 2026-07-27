/**
 * Smoke HTTP producción FestCup (sin secretos).
 * Uso: node scripts/smoke-festcup-prod.mjs
 */
const BASE = (process.env.BASE_URL || 'https://festcup2026.com').replace(/\/$/, '')
const SLUG = process.env.SLUG || 'festcup-2026'

const routes = [
  ['GET', '/'],
  ['GET', `/campeonato/${SLUG}/llamados`],
  ['GET', `/campeonato/${SLUG}/resultados`],
  ['GET', `/portal/${SLUG}`],
  ['GET', '/api/public/campeonatos'],
  ['GET', `/api/campeonato/${SLUG}/llamados`],
]

let failed = 0
for (const [method, path] of routes) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { method, redirect: 'follow' })
    const ok = res.status >= 200 && res.status < 400
    console.log(ok ? '✓' : '✗', res.status, path)
    if (!ok) failed++
  } catch (e) {
    console.log('✗', 'ERR', path, e.message)
    failed++
  }
}

if (failed) {
  console.error(`\n${failed} ruta(s) fallaron`)
  process.exit(1)
}
console.log('\nSmoke prod OK')
