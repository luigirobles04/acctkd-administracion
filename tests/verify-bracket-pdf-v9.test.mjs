/**
 * Verifica conectores PDF v9: cuenta líneas dibujadas por tamaño de llave.
 * Ejecutar: node --experimental-vm-modules node_modules/vitest/vitest.mjs run tests/verify-bracket-pdf-v9.test.mjs
 */
import { describe, it, expect } from 'vitest'
import { buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque } from '@/lib/campeonato/bracket-export'
import { dibujarBracketCategoriaPdf } from '@/lib/campeonato/export-bracket-pdf'

function makeCnuPorRonda(nPlayers) {
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(nPlayers, 2)))
  const maxR = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: nPlayers }, (_, i) => ({
    id: i + 1,
    id_linea: i + 1,
    nombres: `P${i + 1}`,
    academia: 'Club',
  }))]
  const slots = buildSlotsCnu(seeds, nPlayers)
  const porRonda = {}

  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = []
    for (let m = 1; m <= count; m++) {
      let id_linea1 = null
      let id_linea2 = null
      let es_bye = false
      let estado = 'pendiente'
      let orden = m + r * 100

      if (r === maxR) {
        const p1 = slots[(m - 1) * 2]
        const p2 = slots[(m - 1) * 2 + 1]
        id_linea1 = p1?.id_linea || null
        id_linea2 = p2?.id_linea || null
        if (p1 && !p2) {
          es_bye = true
          estado = 'saltado'
        } else if (!p1 && p2) {
          es_bye = true
          id_linea1 = p2.id_linea
          id_linea2 = null
          estado = 'saltado'
        } else if (!p1 && !p2) {
          estado = 'vacío'
        }
      }

      porRonda[r].push({
        ronda: r,
        match_numero: m,
        orden_pista: orden,
        estado,
        es_bye,
        competidor1: id_linea1
          ? { id_linea: id_linea1, nombres: `P${id_linea1}`, academia: 'Club', color: es_bye ? colorByeEnBloque(m) : 'azul' }
          : null,
        competidor2: id_linea2
          ? { id_linea: id_linea2, nombres: `P${id_linea2}`, academia: 'Club', color: 'rojo' }
          : null,
        color1: es_bye ? colorByeEnBloque(m) : 'azul',
        color2: id_linea2 ? 'rojo' : null,
      })
    }
  }
  return porRonda
}

function countLines(n) {
  return new Promise(async (resolve) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    let lines = 0
    const orig = doc.line.bind(doc)
    doc.line = (...args) => { lines++; return orig(...args) }

    const porRonda = makeCnuPorRonda(n)
    const ok = dibujarBracketCategoriaPdf(
      doc,
      { nombre: 'Verify v9', fecha_inicio: '2026-08-15' },
      { nombre: `${n} comp`, cancha: 1, inscritos: n, porRonda },
      { pageW: 297, pageH: 210 }
    )
    resolve({ ok, lines })
  })
}

describe('verify bracket PDF v9 conectores', () => {
  /** Mínimo esperado de segmentos de línea según tamaño (árbol completo con byes). */
  const minLines = { 3: 12, 4: 14, 6: 18, 7: 20, 8: 22, 9: 24, 10: 26 }

  for (const n of [3, 4, 6, 7, 8, 9, 10]) {
    it(`${n} competidores: líneas conectan hasta winner (≥${minLines[n]})`, async () => {
      const { ok, lines } = await countLines(n)
      expect(ok).toBe(true)
      expect(lines).toBeGreaterThanOrEqual(minLines[n])
    })
  }

  it('footer incluye v9', async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    dibujarBracketCategoriaPdf(
      doc,
      { nombre: 'Test' },
      { nombre: '4 comp', cancha: 1, inscritos: 4, porRonda: makeCnuPorRonda(4) },
      { pageW: 297, pageH: 210 }
    )
    const text = doc.output('datauristring')
    expect(text).toContain('v9')
  })
})

describe('4 comp solo semis (sin columna Final en cols)', () => {
  it('dibuja merge de ambas semis hacia winner', async () => {
    const porRonda = {
      2: [
        {
          ronda: 2, match_numero: 1, orden_pista: 1, estado: 'pendiente',
          competidor1: { id_linea: 1, nombres: 'A', academia: 'X' },
          competidor2: { id_linea: 2, nombres: 'B', academia: 'Y' },
          color1: 'azul', color2: 'rojo',
        },
        {
          ronda: 2, match_numero: 2, orden_pista: 2, estado: 'pendiente',
          competidor1: { id_linea: 3, nombres: 'C', academia: 'X' },
          competidor2: { id_linea: 4, nombres: 'D', academia: 'Y' },
          color1: 'azul', color2: 'rojo',
        },
      ],
      1: [{
        ronda: 1, match_numero: 1, orden_pista: 3, estado: 'pendiente',
        competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo',
      }],
    }
    const { lines, ok } = await countLinesWithPorRonda(porRonda, 4)
    expect(ok).toBe(true)
    expect(lines).toBeGreaterThanOrEqual(14)
  })
})

async function countLinesWithPorRonda(porRonda, inscritos) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  let lines = 0
  const orig = doc.line.bind(doc)
  doc.line = (...args) => { lines++; return orig(...args) }
  const ok = dibujarBracketCategoriaPdf(
    doc,
    { nombre: 'Test' },
    { nombre: 'test', cancha: 1, inscritos, porRonda },
    { pageW: 297, pageH: 210 }
  )
  return { ok, lines }
}
