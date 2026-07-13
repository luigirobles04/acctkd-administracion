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
  it('usa geometría CNU (4 filas por bloque) sin solapamiento', async () => {
    const { calcLayout, yCenterBlock, yCenterMerge, mergesEnRonda, buildRowMap } = await import('@/lib/campeonato/export-bracket-pdf')
    const { ROWS_PER_MATCH } = await import('@/lib/campeonato/bracket-cnu-layout')

    for (const numBlocks of [4, 8, 16]) {
      const cols = Array.from({ length: Math.log2(numBlocks) }, (_, i) => ({
        label: `R${i}`,
        combates: Array.from({ length: numBlocks / 2 ** (i + 1) }, () => ({})),
      }))
      const entradas = Array.from({ length: numBlocks }, () => ({
        vacio: false,
        es_bye: false,
        chung: { nombre: 'A', vacio: false },
        hong: { nombre: 'B', vacio: false },
      }))
      const layout = calcLayout(cols, numBlocks, entradas, 297, 210)
      const pairH = layout.boxH * 2 + layout.pairGap

      expect(layout.totalRows).toBe(buildRowMap(entradas).totalRows)
      expect(layout.pairGap).toBeGreaterThanOrEqual(2)

      for (let bi = 0; bi < numBlocks; bi++) {
        const yCenter = yCenterBlock(bi, layout)
        const yTop = yCenter - pairH / 2
        const yBot = yCenter + pairH / 2
        if (bi > 0) {
          const prevCenter = yCenterBlock(bi - 1, layout)
          expect(yTop).toBeGreaterThanOrEqual(prevCenter + pairH / 2 - 1.5)
        }
        const blockH = ROWS_PER_MATCH * layout.rowH
        expect(yBot - yTop).toBeLessThanOrEqual(blockH + 1)
      }

      expect(mergesEnRonda(numBlocks, 0)).toBe(numBlocks / 2)
      if (numBlocks >= 8) {
        const qf0 = yCenterMerge(1, 0, layout)
        const qf1 = yCenterMerge(1, 1, layout)
        expect(qf1 - qf0).toBeGreaterThan(layout.boxH)
      }
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

  it('filtra por cancha y omite categorías sin árbol dibujable', async () => {
    const { buildBracketPdfBuffer } = await import('@/lib/campeonato/export-bracket-pdf')
    const data = {
      campeonato: { nombre: 'Test Cup', fecha_inicio: '2026-08-15' },
      categorias: [
        {
          id_categoria: 1,
          nombre: 'Cat A',
          cancha: 1,
          inscritos: 2,
          tiene_llave: true,
          orden: 1,
          porRonda: {
            1: [{
              ronda: 1,
              match_numero: 1,
              orden_pista: 1,
              estado: 'pendiente',
              competidor1: { id_linea: 1, nombres: 'A', academia: 'X' },
              competidor2: { id_linea: 2, nombres: 'B', academia: 'Y' },
              color1: 'azul',
              color2: 'rojo',
            }],
          },
        },
        {
          id_categoria: 2,
          nombre: 'Cat B',
          cancha: 2,
          inscritos: 2,
          tiene_llave: true,
          orden: 1,
          porRonda: {
            1: [{
              ronda: 1,
              match_numero: 1,
              orden_pista: 50,
              estado: 'pendiente',
              competidor1: { id_linea: 3, nombres: 'C', academia: 'X' },
              competidor2: { id_linea: 4, nombres: 'D', academia: 'Y' },
              color1: 'azul',
              color2: 'rojo',
            }],
          },
        },
        {
          id_categoria: 3,
          nombre: 'Vacía',
          cancha: 1,
          inscritos: 0,
          tiene_llave: true,
          orden: 2,
          porRonda: {},
        },
      ],
    }
    const bufArea1 = await buildBracketPdfBuffer(data, null, { cancha: 1 })
    expect(bufArea1.byteLength).toBeGreaterThan(500)
    const bufAll = await buildBracketPdfBuffer(data, null)
    expect(bufAll.byteLength).toBeGreaterThan(bufArea1.byteLength)
  })

  it('export grande comprimido: válido y bajo el tope de Vercel (4.5MB)', async () => {
    const { buildBracketPdfBuffer } = await import('@/lib/campeonato/export-bracket-pdf')
    // Simula un campeonato real: 60 categorías de 16 competidores repartidas en 3 canchas.
    const categorias = Array.from({ length: 60 }, (_, i) => ({
      id_categoria: i + 1,
      nombre: `Categoría ${i + 1} - Kyorugi`,
      cancha: (i % 3) + 1,
      inscritos: 16,
      tiene_llave: true,
      orden: i + 1,
      porRonda: makePorRonda({ rondas: [4, 3, 2, 1] }),
    }))
    const data = { campeonato: { nombre: 'Taekwondo FestCup 2026', fecha_inicio: '2026-11-07' }, categorias }

    const bufAll = await buildBracketPdfBuffer(data, null)
    // PDF completo y bien formado (cabecera + EOF presentes).
    const head = Buffer.from(bufAll.subarray(0, 5)).toString('latin1')
    const tail = Buffer.from(bufAll.subarray(bufAll.length - 1024)).toString('latin1')
    expect(head).toBe('%PDF-')
    expect(tail).toContain('%%EOF')
    // Debe caber holgadamente bajo el límite de respuesta serverless (~4.5MB).
    expect(bufAll.byteLength).toBeLessThan(4_000_000)

    // Export por cancha: aún más pequeño.
    const bufArea = await buildBracketPdfBuffer(data, null, { cancha: 1 })
    expect(bufArea.byteLength).toBeLessThan(bufAll.byteLength)
  })

  it('no lanza con llave parcial (slots vacíos en bracket de 8)', async () => {
    const { jsPDF } = await import('jspdf')
    const { dibujarBracketCategoriaPdf } = await import('@/lib/campeonato/export-bracket-pdf')
    const { entradasPrimeraRonda } = await import('@/lib/campeonato/bracket-cnu-layout')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const porRonda = {
      3: [
        {
          ronda: 3,
          match_numero: 1,
          orden_pista: 1,
          estado: 'pendiente',
          competidor1: { id_linea: 1, nombres: 'A1', academia: 'X' },
          competidor2: { id_linea: 2, nombres: 'A2', academia: 'Y' },
          color1: 'azul',
          color2: 'rojo',
        },
        {
          ronda: 3,
          match_numero: 2,
          orden_pista: 2,
          estado: 'pendiente',
          competidor1: { id_linea: 3, nombres: 'A3', academia: 'X' },
          competidor2: { id_linea: 4, nombres: 'A4', academia: 'Y' },
          color1: 'azul',
          color2: 'rojo',
        },
      ],
      2: [{ ronda: 2, match_numero: 1, orden_pista: 3, estado: 'pendiente', competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo' }],
      1: [{ ronda: 1, match_numero: 1, orden_pista: 4, estado: 'pendiente', competidor1: null, competidor2: null, color1: 'azul', color2: 'rojo' }],
    }
    const entradas = entradasPrimeraRonda(porRonda)
    expect(entradas.some((e) => e.vacio)).toBe(true)
    expect(() =>
      dibujarBracketCategoriaPdf(
        doc,
        { nombre: 'Test Cup' },
        { nombre: 'Parcial 4 de 8', cancha: 1, inscritos: 4, porRonda },
        { pageW: doc.internal.pageSize.getWidth(), pageH: doc.internal.pageSize.getHeight() }
      )
    ).not.toThrow()
  })
})
