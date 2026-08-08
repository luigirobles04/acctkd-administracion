import { describe, it, expect } from 'vitest'
import {
  divisionKyorugiPorEdad,
  divisionPoomsaePorEdad,
  nivelKyorugiFromText,
  poomsaeFormFromExcel,
  resolverCategoriaKyorugi,
  resolverCategoriaPoomsae,
  parseGradoExcel,
} from '@/lib/campeonato/import-excel-categorias'
import { CATEGORIAS_WT } from '@/lib/campeonato/categorias-wt'

const cats = CATEGORIAS_WT.map((c, i) => ({ ...c, id_categoria: i + 1 }))

describe('FestCup 2026 · divisiones por edad', () => {
  it('kyorugi', () => {
    expect(divisionKyorugiPorEdad(5)).toBe('Pre Infantil')
    expect(divisionKyorugiPorEdad(6)).toBe('Infantil A')
    expect(divisionKyorugiPorEdad(8)).toBe('Infantil B')
    expect(divisionKyorugiPorEdad(10)).toBe('Pre Cadete')
    expect(divisionKyorugiPorEdad(13)).toBe('Cadete')
    expect(divisionKyorugiPorEdad(16)).toBe('Juvenil')
    expect(divisionKyorugiPorEdad(25)).toBe('Mayores')
  })

  it('poomsae', () => {
    expect(divisionPoomsaePorEdad(5)).toBe('Pre Infantil')
    expect(divisionPoomsaePorEdad(16)).toBe('Junior')
    expect(divisionPoomsaePorEdad(25)).toBe('Senior 1')
    expect(divisionPoomsaePorEdad(35)).toBe('Senior 2')
    expect(divisionPoomsaePorEdad(45)).toBe('Master 1')
    expect(divisionPoomsaePorEdad(64)).toBe('Master 3')
    expect(divisionPoomsaePorEdad(65)).toBe('Master 4')
  })
})

describe('FestCup 2026 · alias formas', () => {
  it('mapea Taegeuk a formas reconocidas', () => {
    expect(poomsaeFormFromExcel('Taegeuk 1 Jang')).toBe('Il Jang')
    expect(poomsaeFormFromExcel('Taegeuk 2 Jang')).toBe('I Jang')
    expect(poomsaeFormFromExcel('Taegeuk 3 Jang')).toBe('Sam Jang')
    expect(poomsaeFormFromExcel('Kibom Poomsae')).toBe('Kibom')
    expect(poomsaeFormFromExcel('Koryo / Keumgang')).toBe('Koryo')
  })

  it('detecta nivel kyorugi en texto', () => {
    expect(nivelKyorugiFromText('IA NOVELES')).toBe('Noveles')
    expect(nivelKyorugiFromText('CADETE - AVANZADO')).toBe('Avanzados')
    expect(nivelKyorugiFromText('FESTIVAL')).toBe('Festival')
  })

  it('parsea grado excel', () => {
    expect(parseGradoExcel('5to kup')).toBe('5º kup')
    expect(parseGradoExcel('1er dan')).toBe('1º dan')
  })
})

describe('FestCup 2026 · resolver kyorugi inteligente', () => {
  it('corrige Infantil A → Infantil B por edad y peso -21', () => {
    const perfil = {
      fecha_nacimiento: '2018-03-12',
      sexo: 'M',
      grado: null,
    }
    const { cat, advertencias } = resolverCategoriaKyorugi(cats, {
      categoriaTexto: 'Infantil A',
      pesoRaw: '-21 kg',
      sexo: 'M',
      perfil,
      anio: 2026,
    })
    expect(cat).toBeTruthy()
    expect(cat.nombre).toMatch(/Infantil B/)
    expect(cat.nombre).toMatch(/-21kg/)
    expect(advertencias.some((a) => /edad WT/i.test(a))).toBe(true)
  })

  it('usa grado para elegir Avanzados', () => {
    const perfil = {
      fecha_nacimiento: '2013-03-14',
      sexo: 'M',
      grado: '1º kup',
    }
    const { cat } = resolverCategoriaKyorugi(cats, {
      categoriaTexto: 'Cadete',
      pesoRaw: '-33 kg',
      sexo: 'M',
      perfil,
      anio: 2026,
      gradoTexto: '1º kup',
    })
    expect(cat?.nombre).toMatch(/Cadete · Avanzados/)
    expect(cat?.nombre).toMatch(/-33kg/)
  })
})

describe('FestCup 2026 · resolver poomsae inteligente', () => {
  it('Taegeuk 1 + Infantil genérico → Il Jang por edad', () => {
    const perfil = {
      fecha_nacimiento: '2017-08-14', // edad WT 2026 = 9 → Infantil B
      sexo: 'F',
      grado: null,
    }
    const { cat } = resolverCategoriaPoomsae(cats, {
      divisionTexto: 'Infantil',
      poomsaeTexto: 'Taegeuk 1 Jang',
      sexo: 'F',
      perfil,
      anio: 2026,
    })
    expect(cat).toBeTruthy()
    expect(cat.nombre).toMatch(/Il Jang/)
    expect(cat.nombre).toMatch(/Infantil B/)
  })

  it('Koryo en Cadete dan', () => {
    const perfil = {
      fecha_nacimiento: '2012-04-28',
      sexo: 'F',
      grado: '1º dan',
    }
    const { cat } = resolverCategoriaPoomsae(cats, {
      divisionTexto: 'Cadete',
      poomsaeTexto: 'Koryo',
      sexo: 'F',
      perfil,
      anio: 2026,
    })
    expect(cat?.nombre).toMatch(/Koryo · Cadete · F/)
  })
})
