import { describe, it, expect } from 'vitest'
import { buildMedallero } from './medallero'

const comp = (id, academia) => ({
  id_linea: id,
  dorsal: `D${id}`,
  nombres: `Atleta ${id}`,
  academia,
})

const catCompleta = (id, { oro, plata, bronce = [] }) => ({
  id_categoria: id,
  estado: 'completo',
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
        { id_categoria: 2, estado: 'en_curso', podio: null },
      ],
    }
    const poomsae = {
      podios: [catCompleta(3, { oro: comp(10, 'Dragones'), plata: comp(1, 'Tigres') })],
    }
    const m = buildMedallero({ kyorugi, poomsae, campeonato: {} })

    const tigres = m.academias.global.find((a) => a.nombre === 'Tigres')
    const dragones = m.academias.global.find((a) => a.nombre === 'Dragones')
    // Tigres: oro k (120) + bronce k (20) + plata p (50) = 190
    expect(tigres).toMatchObject({ oro: 1, plata: 1, bronce: 1, puntos_total: 190, puntos_kyorugi: 140, puntos_poomsae: 50 })
    // Dragones: plata k (50) + oro p (120) = 170
    expect(dragones).toMatchObject({ puntos_total: 170 })
    // Ranking global: Tigres > Dragones
    expect(m.academias.global[0].nombre).toBe('Tigres')

    // Atleta 1 acumula en ambas modalidades
    const at1 = m.atletas.global.find((a) => a.id_linea === 1)
    expect(at1).toMatchObject({ oro: 1, plata: 1, puntos: 170, kyorugi: 120, poomsae: 50 })

    expect(m.resumen).toEqual({ medallasKyorugi: 1, medallasPoomsae: 1 })
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
