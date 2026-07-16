/**
 * v15: yMid brazos, clamp altura, passthrough bye.
 */
import { describe, it, expect } from 'vitest'
import { buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque, porRondaFiltrado, bracketSlotsFromInscritos } from '@/lib/campeonato/bracket-export'
import { entradasPrimeraRonda } from '@/lib/campeonato/bracket-cnu-layout'
import { dibujarBracketCategoriaPdf } from '@/lib/campeonato/export-bracket-pdf'

function makeCnuPorRonda(nPlayers) {
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(nPlayers, 2)))
  const maxR = Math.log2(bracketSize)
  const seeds = [null, ...Array.from({ length: nPlayers }, (_, i) => ({
    id: i + 1, id_linea: i + 1, nombres: `P${i + 1}`, academia: 'Club',
  }))]
  const slots = buildSlotsCnu(seeds, nPlayers)
  const porRonda = {}
  let ord = 1
  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = []
    for (let m = 1; m <= count; m++) {
      let id1 = null, id2 = null, es_bye = false, estado = 'pendiente'
      if (r === maxR) {
        const p1 = slots[(m - 1) * 2], p2 = slots[(m - 1) * 2 + 1]
        id1 = p1?.id_linea || null
        id2 = p2?.id_linea || null
        if (p1 && !p2) { es_bye = true; estado = 'saltado' }
        else if (!p1 && p2) { es_bye = true; id1 = p2.id_linea; id2 = null; estado = 'saltado' }
        else if (!p1 && !p2) estado = 'vacío'
      }
      porRonda[r].push({
        ronda: r, match_numero: m, orden_pista: ord++, estado, es_bye,
        competidor1: id1 ? { id_linea: id1, nombres: `P${id1}`, academia: 'Club', color: es_bye ? colorByeEnBloque(m) : 'azul' } : null,
        competidor2: id2 ? { id_linea: id2, nombres: `P${id2}`, academia: 'Club', color: 'rojo' } : null,
        color1: es_bye ? colorByeEnBloque(m) : 'azul', color2: id2 ? 'rojo' : null,
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
      { nombre: 'Verify v14' },
      { nombre: `${n} comp`, cancha: 1, inscritos: n, porRonda },
      { pageW: 297, pageH: 210 }
    )
    resolve({ ok, lines })
  })
}

describe('v14 slots por inscritos', () => {
  it('4 inscritos → 2 bloques (semis), no 4', () => {
    const porRonda = makeCnuPorRonda(4)
    const ent = entradasPrimeraRonda(porRonda, { inscritos: 4 })
    expect(ent.length).toBe(2)
    expect(bracketSlotsFromInscritos(4).expectedSlots).toBe(2)
  })

  it('10 inscritos → 8 bloques', () => {
    const porRonda = makeCnuPorRonda(10)
    const ent = entradasPrimeraRonda(porRonda, { inscritos: 10 })
    expect(ent.length).toBe(8)
  })
})

describe('v14 PDF líneas y badges', () => {
  const minLines = { 3: 8, 4: 10, 5: 10, 6: 12, 7: 14, 10: 18 }

  for (const n of [3, 4, 5, 6, 7, 10]) {
    it(`${n} comp: dibuja árbol (≥${minLines[n]} líneas)`, async () => {
      const { ok, lines } = await countLines(n)
      expect(ok).toBe(true)
      expect(lines).toBeGreaterThanOrEqual(minLines[n])
    })

    it(`${n} comp: todos los combates tienen badge`, async () => {
      const porRonda = porRondaFiltrado(makeCnuPorRonda(n), n)
      const expected = []
      for (const lista of Object.values(porRonda)) {
        for (const m of lista) {
          if (!m.es_bye && m.estado !== 'vacío' && m.estado !== 'bye' && m.orden_pista) {
            expected.push(m.orden_pista)
          }
        }
      }
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const badges = []
      const orig = doc.text.bind(doc)
      doc.text = (txt, x, y, opts) => {
        const s = String(txt)
        if (/^\d+\/\d+$/.test(s)) badges.push(parseInt(s.split('/')[1], 10))
        return orig(txt, x, y, opts)
      }
      dibujarBracketCategoriaPdf(
        doc,
        { nombre: 'T' },
        { nombre: `${n}c`, cancha: 1, inscritos: n, porRonda: makeCnuPorRonda(n) },
        { pageW: 297, pageH: 210 }
      )
      for (const num of expected) expect(badges).toContain(num)
    })
  }
})
