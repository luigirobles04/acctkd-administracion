/**
 * Excel de corroboración — una categoría por tamaño de llave (2–12 pers.)
 *   npm test -- --run tests/generar-excel-todos-tamanos.test.mjs
 */
import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, copyFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { buildLlavesExcelBuffer } from '@/lib/campeonato/export-llaves-excel'
import { layoutCnuBracket } from '@/lib/campeonato/bracket-cnu-layout'
import { bracketSizeFor, buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'

const CLUBS = ['Thunder Team', 'Golden Kick', 'Guerreros Norte', 'Cobra Kai', 'Samurai Kick', 'Warrior Spirit']

function mkPart(i) {
  return {
    id_linea: i,
    nombres: `ATLETA P${String(i).padStart(2, '0')}`,
    academia: CLUBS[(i - 1) % CLUBS.length],
    id_academia_campeonato: (i - 1) % CLUBS.length + 1,
  }
}

function toComp(p) {
  if (!p) return null
  return { nombres: p.nombres, academia: p.academia, id_linea: p.id_linea }
}

/** Réplica determinista de generarLlaveCategoria con estándar CNU */
function buildPorRondaForN(n, ordenBase = 1) {
  const participantes = Array.from({ length: n }, (_, i) => mkPart(i + 1))
  const bracketSize = bracketSizeFor(n)
  const seeds = new Array(n + 1).fill(null)
  for (let s = 1; s <= n; s++) seeds[s] = participantes[s - 1]
  const slots = buildSlotsCnu(seeds, n)

  const numRondas = Math.log2(bracketSize)
  const porRonda = {}
  let orden = ordenBase

  for (let r = numRondas; r >= 1; r--) porRonda[r] = []

  const rFirst = numRondas
  const countFirst = 2 ** (numRondas - 1)
  for (let m = 1; m <= countFirst; m++) {
    const p1 = slots[(m - 1) * 2]
    const p2 = slots[(m - 1) * 2 + 1]
    let es_bye = false
    let estado = 'pendiente'
    let comp1 = null
    let comp2 = null
    let ganador_id_linea = null

    if (p1 && !p2) {
      es_bye = true
      estado = 'saltado'
      comp1 = toComp(p1)
      ganador_id_linea = p1.id_linea
    } else if (!p1 && p2) {
      es_bye = true
      estado = 'saltado'
      comp1 = toComp(p2)
      ganador_id_linea = p2.id_linea
    } else if (p1 && p2) {
      comp1 = toComp(p1)
      comp2 = toComp(p2)
    } else {
      estado = 'vacío'
    }

    porRonda[rFirst].push({
      ronda: rFirst,
      match_numero: m,
      orden_pista: es_bye || estado === 'vacío' ? 0 : orden++,
      estado,
      es_bye,
      competidor1: comp1,
      competidor2: comp2,
      color1: 'azul',
      color2: 'rojo',
      ganador_id_linea,
    })
  }

  for (let r = numRondas - 1; r >= 1; r--) {
    const count = 2 ** (r - 1)
    for (let m = 1; m <= count; m++) {
      porRonda[r].push({
        ronda: r,
        match_numero: m,
        orden_pista: orden++,
        estado: 'pendiente',
        es_bye: false,
        competidor1: null,
        competidor2: null,
        color1: 'azul',
        color2: 'rojo',
      })
    }
  }

  return { porRonda, bracketSize }
}

function catForN(n, cancha = 1) {
  const { porRonda, bracketSize } = buildPorRondaForN(n, n * 100)
  return {
    nombre: `${n} pers. (llave ${bracketSize}, CNU)`,
    cancha,
    tiene_llave: true,
    porRonda,
  }
}

const TAMANOS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

describe('generar excel todos los tamaños', () => {
  for (const n of TAMANOS) {
    it(`layout ${n} pers. se genera`, () => {
      const cat = catForN(n)
      const layout = layoutCnuBracket(cat.porRonda, { cancha: 1 })
      expect(layout).not.toBeNull()
      expect(layout.rows).toBeGreaterThan(0)
    })
  }

  it('6 pers.: byes semillas 1 y 6 como PDF CNU', () => {
    const cat = catForN(6)
    const entradas = cat.porRonda[3]
    expect(entradas[0].es_bye).toBe(true)
    expect(entradas[0].competidor1.nombres).toContain('P01')
    expect(entradas[1].competidor1.nombres).toContain('P02')
    expect(entradas[1].competidor2.nombres).toContain('P03')
    expect(entradas[3].es_bye).toBe(true)
    expect(entradas[3].competidor1.nombres).toContain('P06')
  })

  it('escribe tmp/llaves-kyorugi-todos-tamanos.xlsx', async () => {
    const categorias = TAMANOS.map((n, i) => catForN(n, (i % 3) + 1))

    const data = {
      campeonato: { nombre: 'Corroboración llaves CNU 2–12 pers.' },
      resumen: categorias.map((c, i) => ({
        categoria: c.nombre,
        division: 'Prueba',
        genero: 'Mixto',
        inscritos: TAMANOS[i],
        combates: Object.values(c.porRonda).flat().filter((m) => !m.es_bye && m.estado !== 'vacío').length,
        cancha: c.cancha,
        llave: 'Sí',
      })),
      categorias,
    }

    const buffer = await buildLlavesExcelBuffer(data)
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tmp')
    mkdirSync(dir, { recursive: true })
    const outPath = join(dir, 'llaves-kyorugi-todos-tamanos.xlsx')
    writeFileSync(outPath, Buffer.from(buffer))

    const desktop = join(homedir(), 'Desktop', 'llaves-kyorugi-todos-tamanos.xlsx')
    copyFileSync(outPath, desktop)

    console.log('\n✓ Excel generado:')
    console.log('  ', outPath)
    console.log('  ', desktop, '\n')
  })
})
