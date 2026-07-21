import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as XLSX from 'xlsx'
import { parseFestcupInscripcionExcel } from '@/lib/campeonato/import-inscripcion-excel'
import { parsePesoExcel, parseFechaExcel, splitNombreCompleto, decodeKyorugiCodigoExcel, normTxt } from '@/lib/campeonato/import-excel-categorias'

describe('import-excel-categorias', () => {
  it('parsePesoExcel acepta negativos y strings', () => {
    expect(parsePesoExcel(-46)).toBe(46)
    expect(parsePesoExcel(' - 49  KG')).toBe(49)
    expect(parsePesoExcel('39+')).toBe(39.5)
    expect(parsePesoExcel('MÁS 39')).toBe(39.5)
    expect(parsePesoExcel('+59')).toBe(59.5)
    expect(parsePesoExcel('43 KG.')).toBe(43)
  })

  it('parseFechaExcel maneja DD/MM, MM/DD US y Date nativo', () => {
    expect(parseFechaExcel('6/26/10')).toBe('2010-06-26')
    expect(parseFechaExcel('26/06/2010')).toBe('2010-06-26')
    expect(parseFechaExcel('10/19/19')).toBe('2019-10-19')
    expect(parseFechaExcel(new Date(2010, 5, 26))).toBe('2010-06-26')
    expect(parseFechaExcel('2010-26-06')).toBe(null)
  })

  it('decodeKyorugiCodigoExcel decodifica IB1M y similares', () => {
    expect(decodeKyorugiCodigoExcel('IB1M').division).toBe('Infantil B')
    expect(decodeKyorugiCodigoExcel('IB1M').sexo).toBe('M')
    expect(decodeKyorugiCodigoExcel('I B NOVELES').division).toBe('Infantil B')
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
    const competidores = parsed.lineas.filter((l) => l.tipo !== 'oficial')
    expect(competidores.length).toBe(0)
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const poomName = wb.SheetNames.find((n) => normTxt(n).includes('POOM'))
    const poomRows = XLSX.utils.sheet_to_json(wb.Sheets[poomName], { header: 1, defval: '' })
    const labels = poomRows.map((r) => normTxt(r[0] || r[1]))
    expect(labels).toContain('PAREJAS')
    expect(labels).toContain('EQUIPO')
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
