import { describe, it, expect } from 'vitest'
import { buildMedallero, categoriaSumaPuntos, MIN_ACADEMIAS_PARA_PUNTOS } from './medallero'

const comp = (id, academia) => ({
  id_linea: id,
  dorsal: `D${id}`,
  nombres: `Atleta ${id}`,
  academia,
})

const catCompleta = (id, { oro, plata, bronce = [], academias_distintas = 4, suma_puntos } = {}) => ({
  id_categoria: id,
  estado: 'completo',
  academias_distintas,
  suma_puntos: suma_puntos ?? academias_distintas >= MIN_ACADEMIAS_PARA_PUNTOS,
  podio: { oro, plata, bronce },
})

describe('buildMedallero', () => {
  it('vacío sin podios', () => {
    const m = buildMedallero({ kyorugi: { podios: [] }, poomsae: { podios: [] }, campeonato: {} })
    expect(m.academias.global).toEqual([])
    expect(m.atletas.global).toEqual([])
    expect(m.puntos).toEqual({ oro: 120, plata: 50, bronce: 20 })
  })

  it('usa puntos personalizados del campeonato', () => {
    const m = buildMedallero({
      kyorugi: { podios: [catCompleta(1, { oro: comp(1, 'A'), plata: null })] },
      poomsae: { podios: [] },
      campeonato: { puntos_oro: 10, puntos_plata: 5, puntos_bronce: 1 },
    })
    expect(m.academias.global[0]).toMatchObject({ nombre: 'A', oro: 1, puntos_total: 10 })
  })

  it('acumula kyorugi + poomsae por academia y atleta', () => {
    const kyorugi = {
      podios: [
        catCompleta(1, { oro: comp(1, 'Tigres'), plata: comp(2, 'Dragones'), bronce: [comp(3, 'Tigres')] }),
        { id_categoria: 2, estado: 'en_curso', podio: null, academias_distintas: 4 },
      ],
    }
    const poomsae = {
      podios: [catCompleta(3, { oro: comp(10, 'Dragones'), plata: comp(1, 'Tigres') })],
    }
    const m = buildMedallero({ kyorugi, poomsae, campeonato: {} })

    const tigres = m.academias.global.find((a) => a.nombre === 'Tigres')
    const dragones = m.academias.global.find((a) => a.nombre === 'Dragones')
    expect(tigres).toMatchObject({ oro: 1, plata: 1, bronce: 1, puntos_total: 190, puntos_kyorugi: 140, puntos_poomsae: 50 })
    expect(dragones).toMatchObject({ puntos_total: 170 })
    expect(m.academias.global[0].nombre).toBe('Tigres')

    const at1 = m.atletas.global.find((a) => a.id_linea === 1)
    expect(at1).toMatchObject({ oro: 1, plata: 1, puntos: 170, kyorugi: 120, poomsae: 50 })

    expect(m.resumen.medallasKyorugi).toBe(1)
    expect(m.resumen.medallasPoomsae).toBe(1)
  })

  it('no suma puntos si hay menos de 3 academias (sí registra medallas)', () => {
    const m = buildMedallero({
      kyorugi: {
        podios: [
          catCompleta(1, {
            oro: comp(1, 'Solo'),
            plata: comp(2, 'Solo'),
            bronce: [comp(3, 'Otra')],
            academias_distintas: 2,
          }),
        ],
      },
      poomsae: { podios: [] },
      campeonato: {},
    })
    expect(m.academias.global).toEqual([])
    // Medallas sí se contabilizan en el mapa interno solo si hay puntos... 
    // Con 0 puntos la academia no entra al top, pero el resumen de medallas de categoría sí.
    expect(m.resumen.medallasKyorugi).toBe(1)
    expect(m.resumen.categoriasConPuntosKyorugi).toBe(0)
  })

  it('3 de la misma academia no suman puntos', () => {
    const m = buildMedallero({
      kyorugi: {
        podios: [
          catCompleta(1, {
            oro: comp(1, 'ACCTKD'),
            plata: comp(2, 'ACCTKD'),
            bronce: [comp(3, 'ACCTKD')],
            academias_distintas: 1,
          }),
        ],
      },
      poomsae: { podios: [] },
      campeonato: {},
    })
    expect(m.academias.global).toEqual([])
    expect(m.atletas.global).toEqual([])
  })

  it('ignora categorías no completas y podios nulos', () => {
    const m = buildMedallero({
      kyorugi: { podios: [{ estado: 'completo', podio: null }, { estado: 'sin_calificar', podio: { oro: comp(9, 'X') } }] },
      poomsae: { podios: [] },
      campeonato: {},
    })
    expect(m.academias.global).toEqual([])
  })

  it('academia vacía se agrupa como "Sin academia"', () => {
    const m = buildMedallero({
      kyorugi: { podios: [catCompleta(1, { oro: comp(1, ''), plata: comp(2, '  ') })] },
      poomsae: { podios: [] },
      campeonato: {},
    })
    expect(m.academias.global).toHaveLength(1)
    expect(m.academias.global[0].nombre).toBe('Sin academia')
    expect(m.academias.global[0].puntos_total).toBe(170)
  })
})

describe('categoriaSumaPuntos', () => {
  it('exige ≥ 3 academias distintas', () => {
    expect(categoriaSumaPuntos({ academias_distintas: 2 })).toBe(false)
    expect(categoriaSumaPuntos({ academias_distintas: 3 })).toBe(true)
    expect(categoriaSumaPuntos({ academias_distintas: 4 })).toBe(true)
    expect(categoriaSumaPuntos({ suma_puntos: true, academias_distintas: 1 })).toBe(true)
  })
})
