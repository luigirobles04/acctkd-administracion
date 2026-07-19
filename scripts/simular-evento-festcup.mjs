#!/usr/bin/env node
/**
 * Simulación rápida pre-evento: ejecuta tests y resume pasos manuales.
 * Uso: node scripts/simular-evento-festcup.mjs
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('=== FestCup — Simulación pre-evento ===\n')

console.log('1. Tests automáticos (llaves, PDF, PSS)...')
try {
  execSync('npm test', { cwd: root, stdio: 'inherit' })
  console.log('\n✓ Tests OK\n')
} catch {
  console.error('\n✗ Tests fallaron — corrige antes del martes\n')
  process.exit(1)
}

console.log('2. Checklist manual (hacer en admin + Unity):')
const steps = [
  'Sembrar o usar campeonato demo con 5+ academias',
  'Pesaje → generar todas las llaves → PDF área 1/2/3',
  'Unity ×3: DESCARGAR COLA por área',
  'Desconectar WiFi → 5 combates → reconectar → sync',
  'Probar W/O en Unity (botones W/O AZUL/ROJO)',
  'Probar /arbitro web como plan B',
  'Categoría 1 competidor → Oro único',
  'Exhibición con 2 dorsales',
  'Poomsae: COLA ACCTKD → calificar 3 atletas',
]
steps.forEach((s, i) => console.log(`   ${i + 1}. ${s}`))

console.log('\nVer: integrations/pss-festcup/CHECKLIST-EVENTO.md')
console.log('=== Listo para ensayo manual ===\n')
