/**
 * Vista previa PDF llaves FestCup — numeración con descanso antes de final.
 * npx vitest run src/lib/campeonato/_gen-llaves-festcup-preview.test.js
 */
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'
import { buildExportLlaves } from '@/lib/campeonato/export-llaves'
import { buildBracketPdfBuffer } from '@/lib/campeonato/export-bracket-pdf'
import { computeOrdenLlavePdf } from '@/lib/campeonato/orden-llave'
import { bracketSizeFor, buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque } from '@/lib/campeonato/bracket-export'

const ID_CAMP = 10
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const desktop = join(process.env.HOME || '', 'Desktop')

for (const envFile of ['.env.local', '.env']) {
  const p = join(root, envFile)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (val && !process.env[key]) process.env[key] = val
  }
}

function mkPlayer(i) {
  return {
    id_linea: i,
    nombres: `ATLETA ${i}`,
    academia: `CLUB ${((i - 1) % 4) + 1}`,
    dorsal: String(i).padStart(2, '0'),
  }
}

/** Llave de 8 con numeración real (1,2,3,4,6 en final). */
function buildMuestra8PorRonda() {
  const n = 8
  const bracketSize = bracketSizeFor(n)
  const numRondas = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: n }, (_, i) => mkPlayer(i + 1))]
  const slots = buildSlotsCnu(seeds, n)
  const porRonda = {}
  const flat = []

  for (let ri = 0; ri < numRondas; ri++) {
    const ronda = numRondas - ri
    const count = 2 ** (ronda - 1)
    porRonda[ronda] = []
    for (let m = 1; m <= count; m++) {
      let p1 = null
      let p2 = null
      let es_bye = false
      if (ri === 0) {
        p1 = slots[(m - 1) * 2] ?? null
        p2 = slots[(m - 1) * 2 + 1] ?? null
        if ((p1 && !p2) || (!p1 && p2)) es_bye = true
      }
      const id = ronda * 10 + m
      const combate = {
        id_llave: id,
        ronda,
        match_numero: m,
        es_bye,
        estado: es_bye ? 'saltado' : 'pendiente',
        color1: p1 ? 'azul' : es_bye ? colorByeEnBloque(m) : null,
        color2: p2 ? 'rojo' : null,
        competidor1: p1
          ? { id_linea: p1.id_linea, nombres: p1.nombres, academia: p1.academia, dorsal: p1.dorsal }
          : null,
        competidor2: p2
          ? { id_linea: p2.id_linea, nombres: p2.nombres, academia: p2.academia, dorsal: p2.dorsal }
          : null,
      }
      porRonda[ronda].push(combate)
      if (!es_bye) flat.push(combate)
    }
  }

  const ordenMap = computeOrdenLlavePdf(flat)
  for (const lista of Object.values(porRonda)) {
    for (const c of lista) {
      if (ordenMap[c.id_llave] != null) c.orden_pista = ordenMap[c.id_llave]
    }
  }
  return porRonda
}

function numerosPorCategoria(cat) {
  const nums = []
  for (const lista of Object.values(cat.porRonda || {})) {
    for (const m of lista || []) {
      if (m.es_bye || m.estado === 'saltado' || m.estado === 'vacío') continue
      if (m.orden_pista != null) nums.push(Number(m.orden_pista))
    }
  }
  return [...new Set(nums)].sort((a, b) => a - b)
}

describe('preview PDF llaves FestCup', () => {
  it(
    'genera PDF área 1 y muestra en Desktop',
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) {
        console.warn('Sin .env — omitiendo preview remoto')
        return
      }

      const sb = createClient(url, key)
      const data = await buildExportLlaves(sb, ID_CAMP)
      expect(data.categorias?.length).toBeGreaterThan(0)

      const slug = (data.campeonato?.nombre || 'festcup').replace(/\s+/g, '-').slice(0, 40)

      for (const area of [1, 2, 3]) {
        const cats = data.categorias.filter((c) => Number(c.cancha) === area && c.tiene_llave)
        if (!cats.length) continue

        const buffer = await buildBracketPdfBuffer(data, sb, { cancha: area })
        const out = join(desktop, `llaves-festcup-2026-area-${area}-descanso-final.pdf`)
        writeFileSync(out, buffer)

        console.log(`\n=== Área ${area} → ${out} (${cats.length} categorías) ===`)
        for (const cat of cats.slice(0, 8)) {
          const nums = numerosPorCategoria(cat)
          const finalMatch = Object.values(cat.porRonda || {})
            .flat()
            .find((m) => m.ronda === 1 && !m.es_bye)
          const finalNum = finalMatch?.orden_pista
          const maxPre = nums.filter((n) => n !== finalNum).pop()
          const gap =
            maxPre != null && finalNum != null && finalNum - maxPre === 2
              ? '✓ descanso (N+2)'
              : finalNum != null
                ? `final=${finalNum}, prev=${maxPre ?? '—'}`
                : '—'
          console.log(`  ${cat.nombre?.slice(0, 50)}: [${nums.join(', ')}] ${gap}`)
        }
        if (cats.length > 8) console.log(`  … y ${cats.length - 8} categorías más`)
      }

      const bufAll = await buildBracketPdfBuffer(data, sb)
      const outAll = join(desktop, `llaves-festcup-2026-todas-areas-descanso-final.pdf`)
      writeFileSync(outAll, bufAll)
      console.log(`\nTodas las áreas: ${outAll}`)

      const muestra8 = await buildBracketPdfBuffer({
        campeonato: { nombre: 'MUESTRA 8 — descanso antes de final (1,2,3,4 → 6)', fecha_inicio: '2026-11-05' },
        categorias: [
          {
            id_categoria: 8008,
            nombre: '8 competidores — numeración con descanso',
            cancha: 1,
            inscritos: 8,
            tiene_llave: true,
            porRonda: buildMuestra8PorRonda(),
            orden: 1,
          },
        ],
      })
      const outMuestra = join(desktop, 'llaves-muestra-8-descanso-final.pdf')
      writeFileSync(outMuestra, muestra8)
      console.log(`Muestra didáctica 8: ${outMuestra} (QF 1-4, final 6, combate 5 = descanso)`)
    },
    120_000,
  )
})
