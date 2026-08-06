import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { parseFestcupInscripcionExcel } from '@/lib/campeonato/import-inscripcion-excel'
import { CATEGORIAS_WT } from '@/lib/campeonato/categorias-wt'

const FILE =
  '/Users/luigiarmandoroblespalacios/Desktop/FICHA DE INSCRIPCION FESTCUP /Ficha inscripcion FestCup 2026 - poomsae kyorugi.xlsx'

describe('import ficha usuario FestCup 2026', () => {
  it('resuelve la mayoría de kyorugi/poomsae sin columna código', () => {
    if (!existsSync(FILE)) return

    const categorias = CATEGORIAS_WT.map((c, i) => ({ ...c, id_categoria: i + 1 }))
    const parsed = parseFestcupInscripcionExcel(readFileSync(FILE), {
      categorias,
      anioCampeonato: 2026,
    })

    const kyorugi = parsed.lineas.filter((l) => l.tipo === 'kyorugi_individual')
    const poomsae = parsed.lineas.filter((l) => l.tipo === 'poomsae_individual')
    const kOk = kyorugi.filter((l) => !l.errores?.length)
    const pOk = poomsae.filter((l) => !l.errores?.length)

    // Antes: ~0 kyorugi OK. Ahora debe resolver casi todos por edad+peso.
    expect(kOk.length).toBeGreaterThanOrEqual(35)
    expect(pOk.length).toBeGreaterThanOrEqual(8)
    expect(parsed.resumen.ok).toBeGreaterThanOrEqual(45)

    // Edad corrige Infantil A → Infantil B
    const lucas = kOk.find((l) => /Lucas Mateo Silva/i.test(l.label))
    expect(lucas?.categoriaNombre).toMatch(/Infantil B/)

    // Taegeuk mapeado
    const sofia = pOk.find((l) => /Sofía Valentina Castro|Sofia Valentina Castro/i.test(l.label))
    expect(sofia?.categoriaNombre).toMatch(/Il Jang/)
  })
})
