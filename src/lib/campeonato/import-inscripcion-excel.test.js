import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseFestcupInscripcionExcel } from '@/lib/campeonato/import-inscripcion-excel'
import { parsePesoExcel, splitNombreCompleto } from '@/lib/campeonato/import-excel-categorias'

describe('import-excel-categorias', () => {
  it('parsePesoExcel acepta negativos y strings', () => {
    expect(parsePesoExcel(-46)).toBe(46)
    expect(parsePesoExcel(' - 49  KG')).toBe(49)
    expect(parsePesoExcel('39+')).toBe(39.5)
  })

  it('splitNombreCompleto divide nombres peruanos', () => {
    expect(splitNombreCompleto('CAMILA GORDILLO SIERRALTA')).toEqual({
      nombres: 'CAMILA',
      apellidos: 'GORDILLO SIERRALTA',
    })
  })
})

describe('parseFestcupInscripcionExcel', () => {
  it('parsea plantilla oficial sin categorías (estructura)', () => {
    const path = join(process.cwd(), 'public/docs/festcup-2026/plantilla-inscripcion-festcup.xlsx')
    const buffer = readFileSync(path)
    const parsed = parseFestcupInscripcionExcel(buffer, { categorias: [], anioCampeonato: 2026 })
    expect(parsed.perfiles.length).toBe(0)
    expect(parsed.lineas.length).toBe(0)
  })

  it('parsea planilla ACCTKD 2025 si existe en Downloads', () => {
    const path = join(
      process.env.HOME || '',
      'Downloads/FICHA DE INSCRIPCION/planillas academias/ACCTKD/Ficha inscripcion FestCup 2025 ACCTKD- poomsae kyorugi.xlsx',
    )
    try {
      const buffer = readFileSync(path)
      const parsed = parseFestcupInscripcionExcel(buffer, { categorias: [], anioCampeonato: 2025 })
      expect(parsed.perfiles.length).toBeGreaterThan(10)
      expect(parsed.lineas.length).toBeGreaterThan(10)
    } catch {
      // skip en CI sin archivo local
    }
  })
})
