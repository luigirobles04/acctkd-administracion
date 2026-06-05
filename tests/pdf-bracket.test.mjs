import { describe, it, expect } from 'vitest'

function makePorRonda({ rondas }) {
  const porRonda = {}
  for (const r of rondas) {
    const numMatches = Math.pow(2, r - 1)
    porRonda[r] = Array.from({ length: numMatches }, (_, i) => ({
      ronda: r,
      match_numero: i + 1,
      orden_pista: r === Math.max(...rondas) ? i + 1 : '',
      es_bye: false,
      estado: 'pendiente',
      id_linea1: r === Math.max(...rondas) ? i * 2 + 1 : null,
      id_linea2: r === Math.max(...rondas) ? i * 2 + 2 : null,
      competidor1: r === Math.max(...rondas) ? { id_linea: i * 2 + 1, nombres: `ATLETA ${i * 2 + 1}`, academia: 'Club X' } : null,
      competidor2: r === Math.max(...rondas) ? { id_linea: i * 2 + 2, nombres: `ATLETA ${i * 2 + 2}`, academia: 'Club Y' } : null,
      color1: 'azul',
      color2: 'rojo',
    }))
  }
  return porRonda
}

describe('export-bracket-pdf layout', () => {
  it('cada bloque de la 1.ª ronda tiene altura suficiente (sin solapamiento)', async () => {
    const { calcLayout, yCenterBlock, yCenterMerge, mergesEnRonda } = await import('@/lib/campeonato/export-bracket-pdf')

    for (const numBlocks of [8, 16, 32]) {
      const cols = Array.from({ length: Math.log2(numBlocks) }, (_, i) => ({
        label: `R${i}`,
        combates: Array.from({ length: numBlocks / 2 ** (i + 1) }, () => ({})),
      }))
      const layout = calcLayout(cols, numBlocks, 297, 210)
      const pairH = layout.boxH * 2 + layout.gap

      for (let bi = 0; bi < numBlocks; bi++) {
        const yCenter = yCenterBlock(bi, layout)
        const yTop = yCenter - pairH / 2
        const yBot = yCenter + pairH / 2
        if (bi > 0) {
          const prevCenter = yCenterBlock(bi - 1, layout)
          expect(yTop).toBeGreaterThanOrEqual(prevCenter + pairH / 2 - 0.01)
        }
        expect(yBot - yTop).toBeLessThanOrEqual(layout.blockSpan + 0.01)
      }

      expect(mergesEnRonda(numBlocks, 0)).toBe(numBlocks / 2)
      const qf0 = yCenterMerge(numBlocks, 0, 0, layout)
      const qf1 = yCenterMerge(numBlocks, 0, 1, layout)
      expect(qf1 - qf0).toBeGreaterThan(layout.boxH)
    }
  })
})

describe('export-bracket-pdf (smoke)', () => {
  it('dibuja brackets de 8, 16 y 32 sin lanzar', async () => {
    const { jsPDF } = await import('jspdf')
    const { dibujarBracketCategoriaPdf } = await import('@/lib/campeonato/export-bracket-pdf')

    for (const { rondas, nombre } of [
      { rondas: [3, 2, 1], nombre: '8 competidores' },
      { rondas: [4, 3, 2, 1], nombre: '16 competidores' },
      { rondas: [5, 4, 3, 2, 1], nombre: '32 competidores' },
    ]) {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const cat = {
        nombre,
        cancha: 1,
        inscritos: Math.pow(2, rondas[0] - 1) * 2,
        porRonda: makePorRonda({ rondas }),
      }
      expect(() =>
        dibujarBracketCategoriaPdf(doc, { nombre: 'Test Cup', fecha_inicio: '2026-07-18' }, cat, {
          pageW: doc.internal.pageSize.getWidth(),
          pageH: doc.internal.pageSize.getHeight(),
        })
      ).not.toThrow()
      const out = doc.output('arraybuffer')
      expect(out.byteLength).toBeGreaterThan(800)
    }
  })

  it('no lanza con porRonda vacío', async () => {
    const { jsPDF } = await import('jspdf')
    const { dibujarBracketCategoriaPdf } = await import('@/lib/campeonato/export-bracket-pdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    expect(() =>
      dibujarBracketCategoriaPdf(doc, { nombre: 'Test' }, { nombre: 'Vacía', porRonda: {} }, { pageW: 297, pageH: 210 })
    ).not.toThrow()
  })

  it('no lanza con llave compacta 3 competidores (feeder único)', async () => {
    const { jsPDF } = await import('jspdf')
    const { dibujarBracketCategoriaPdf } = await import('@/lib/campeonato/export-bracket-pdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const porRonda = {
      2: [
        {
          ronda: 2,
          match_numero: 1,
          orden_pista: 1,
          estado: 'pendiente',
          competidor1: { id_linea: 1, nombres: 'ATLETA 1', academia: 'Club' },
          competidor2: { id_linea: 2, nombres: 'ATLETA 2', academia: 'Club' },
          color1: 'azul',
          color2: 'rojo',
        },
      ],
      1: [
        {
          ronda: 1,
          match_numero: 1,
          orden_pista: 2,
          estado: 'pendiente',
          competidor1: null,
          competidor2: null,
          color1: 'azul',
          color2: 'rojo',
        },
      ],
    }
    expect(() =>
      dibujarBracketCategoriaPdf(
        doc,
        { nombre: 'Test Cup' },
        { nombre: 'Compacta 3', cancha: 1, inscritos: 3, porRonda },
        { pageW: doc.internal.pageSize.getWidth(), pageH: doc.internal.pageSize.getHeight() }
      )
    ).not.toThrow()
  })
})
