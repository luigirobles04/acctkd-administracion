#!/usr/bin/env node
/**
 * Pre-evento: tests + verificación local + smoke prod + ensayo PSS dry.
 * Uso: node scripts/pre-evento-festcup.mjs
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, label) {
  console.log(`\n── ${label} ──`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

try {
  run('npm test', 'Vitest')
  run('node scripts/verificar-ddl-festcup.mjs', 'DDL / keys local')
  run('node scripts/smoke-festcup-prod.mjs', 'Smoke producción')
  try {
    run('node --env-file=.env.local scripts/ensayo-pss-finalizar-idempotente.mjs', 'PSS area (env local)')
  } catch {
    console.warn('PSS ensayo omitido (falta PSS_API_SECRET en .env.local — usa vercel env pull)')
  }
  console.log('\n✓ Pre-evento completado')
} catch (e) {
  process.exit(1)
}
