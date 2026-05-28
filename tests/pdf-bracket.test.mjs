import { describe, it, expect } from 'vitest'

// Smoke test: el render del PDF no debe lanzar excepciones con datos reales.
// Se valida la función de dibujo de una categoría usando un doc jsPDF real.

function makePorRonda({ rondas }) {
  // rondas: array desc (ej. [4,3,2,1]) → construye combates mínimos
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
      // El doc debe haber generado contenido
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
