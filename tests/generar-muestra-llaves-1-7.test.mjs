import { describe, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bracketSizeFor, buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque } from '@/lib/campeonato/bracket-export'
import { buildBracketPdfBuffer } from '@/lib/campeonato/export-bracket-pdf'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_TMP = join(root, 'tmp/llaves-muestra-1-a-8.pdf')
const OUT_DESKTOP = '/Users/luigiarmandoroblespalacios/Desktop/llaves-muestra-1-a-8.pdf'
const OUT_8 = '/Users/luigiarmandoroblespalacios/Desktop/llaves-muestra-8.pdf'
const OUT_9 = '/Users/luigiarmandoroblespalacios/Desktop/llaves-muestra-9.pdf'
const OUT_10 = '/Users/luigiarmandoroblespalacios/Desktop/llaves-muestra-10.pdf'

function mkPlayer(i) {
  return {
    id_linea: i,
    nombres: `X${i}`,
    academia: `TEAM ${String.fromCharCode(64 + ((i - 1) % 6) + 1)}`,
    dorsal: String(i).padStart(2, '0'),
  }
}

function mkCombate({ ronda, match_numero, p1, p2, orden_bracket, es_bye = false, primeraRonda = false }) {
  const combate = {
    ronda,
    match_numero,
    orden_bracket,
    orden_pista: orden_bracket,
    es_bye,
    estado: 'pendiente',
    ganador_id_linea: null,
    color1: p1 ? 'azul' : null,
    color2: p2 ? 'rojo' : null,
    competidor1: p1
      ? { id_linea: p1.id_linea, nombres: p1.nombres, academia: p1.academia, dorsal: p1.dorsal }
      : null,
    competidor2: p2
      ? { id_linea: p2.id_linea, nombres: p2.nombres, academia: p2.academia, dorsal: p2.dorsal }
      : null,
  }

  if (es_bye) {
    combate.estado = 'saltado'
    combate.ganador_id_linea = p1?.id_linea || p2?.id_linea || null
    combate.color1 = colorByeEnBloque(match_numero)
    combate.color2 = null
    if (p2 && !p1) {
      combate.competidor1 = combate.competidor2
      combate.competidor2 = null
    }
  } else if (primeraRonda && !p1 && !p2) {
    // Solo slots vacíos de la 1.ª ronda; SF/Final siguen 'pendiente' aunque aún no tengan nombres
    combate.estado = 'vacío'
  }

  return combate
}

function buildPorRonda(n) {
  if (n === 1) {
    return {
      bracketSize: 2,
      porRonda: {
        1: [
          mkCombate({
            ronda: 1,
            match_numero: 1,
            p1: mkPlayer(1),
            p2: null,
            orden_bracket: 1,
          }),
        ],
      },
    }
  }

  const bracketSize = bracketSizeFor(n)
  const numRondas = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: n }, (_, i) => mkPlayer(i + 1))]
  const slots = buildSlotsCnu(seeds, n)

  const porRonda = {}
  let orden = 1

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

      porRonda[ronda].push(
        mkCombate({
          ronda,
          match_numero: m,
          p1,
          p2,
          orden_bracket: orden++,
          es_bye,
          primeraRonda: ri === 0,
        })
      )
    }
  }

  return { porRonda, bracketSize }
}

function buildCategoriasMuestra(desde, hasta) {
  const categorias = []
  for (let n = desde; n <= hasta; n++) {
    const { porRonda } = buildPorRonda(n)
    categorias.push({
      id_categoria: n,
      nombre: `${n} competidor${n === 1 ? '' : 'es'} — X1…X${n}`,
      cancha: 1,
      inscritos: n,
      tiene_llave: true,
      porRonda,
      orden: n,
    })
  }
  return categorias
}

describe('generar muestra PDF llaves 1-8', () => {
  it('escribe llaves-muestra-1-a-8.pdf y llaves-muestra-8.pdf', () => {
    const buffer = buildBracketPdfBuffer({
      campeonato: {
        nombre: 'MUESTRA — Llaves 1 a 8 (X1, X2, X3…)',
        fecha_inicio: '2026-07-19',
      },
      categorias: buildCategoriasMuestra(1, 8),
    })

    const buffer8 = buildBracketPdfBuffer({
      campeonato: {
        nombre: 'MUESTRA — Llave 8 competidores',
        fecha_inicio: '2026-07-19',
      },
      categorias: buildCategoriasMuestra(8, 8),
    })

    mkdirSync(join(root, 'tmp'), { recursive: true })
    writeFileSync(OUT_TMP, buffer)
    writeFileSync(OUT_DESKTOP, buffer)
    writeFileSync(OUT_8, buffer8)

    const buffer9 = buildBracketPdfBuffer({
      campeonato: {
        nombre: 'MUESTRA — Llave 9 competidores',
        fecha_inicio: '2026-07-19',
      },
      categorias: buildCategoriasMuestra(9, 9),
    })
    writeFileSync(OUT_9, buffer9)

    const buffer10 = buildBracketPdfBuffer({
      campeonato: {
        nombre: 'MUESTRA — Llave 10 competidores',
        fecha_inicio: '2026-07-19',
      },
      categorias: buildCategoriasMuestra(10, 10),
    })
    writeFileSync(OUT_10, buffer10)
    console.log('PDF 1-8:', OUT_DESKTOP)
    console.log('PDF solo 8:', OUT_8)
    console.log('PDF solo 9:', OUT_9)
    console.log('PDF solo 10:', OUT_10)
  })
})
