import { describe, it, expect } from 'vitest'
import { agruparPoomsaePorForma, organizarPantallaPoomsaePorAreas, parseNombrePoomsae } from './poomsae-formas'

describe('parseNombrePoomsae', () => {
  it('separa forma, edad y género', () => {
    expect(parseNombrePoomsae('Poomsae Kibom · Infantil A · M')).toEqual({
      forma: 'Kibom',
      edad: 'Infantil A',
      genero: 'M',
      esRanking: false,
    })
  })

  it('detecta ranking', () => {
    expect(parseNombrePoomsae('Poomsae Ranking · Cadete · F').forma).toBe('Ranking')
  })
})

describe('agruparPoomsaePorForma', () => {
  it('junta edades/sexos de la misma forma en una cola', () => {
    const cats = [
      {
        id_categoria: 1,
        nombre: 'Poomsae Kibom · Infantil A · M',
        inscritos: 1,
        calificados: 0,
        cerrada: false,
        participantes: [
          { id_linea: 10, orden: 1, dorsal: 'A-1', nombres: 'Ana', calificado: false, estado: 'pendiente' },
        ],
      },
      {
        id_categoria: 2,
        nombre: 'Poomsae Kibom · Senior I · F',
        inscritos: 1,
        calificados: 0,
        cerrada: false,
        participantes: [
          { id_linea: 20, orden: 1, dorsal: 'B-1', nombres: 'Bea', calificado: false, estado: 'pendiente' },
        ],
      },
      {
        id_categoria: 3,
        nombre: 'Poomsae Il Jang · Infantil A · M',
        inscritos: 1,
        calificados: 0,
        cerrada: false,
        participantes: [
          { id_linea: 30, orden: 1, dorsal: 'C-1', nombres: 'Ciro', calificado: false, estado: 'pendiente' },
        ],
      },
    ]

    const formas = agruparPoomsaePorForma(cats)
    const kibom = formas.find((f) => f.forma === 'Kibom')
    expect(kibom.inscritos).toBe(2)
    expect(kibom.participantes.map((p) => p.id_linea)).toEqual([10, 20])
    expect(formas.find((f) => f.forma === 'Il Jang').inscritos).toBe(1)
  })
})

describe('organizarPantallaPoomsaePorAreas', () => {
  it('coloca forma en_curso en su área', () => {
    const cats = [
      {
        id_categoria: 1,
        nombre: 'Poomsae Kibom · Infantil A · M',
        inscritos: 2,
        calificados: 0,
        cerrada: false,
        participantes: [
          {
            id_linea: 10,
            orden: 1,
            dorsal: 'A-1',
            nombres: 'Ana',
            calificado: false,
            en_curso: true,
            estado: 'en_curso',
            poomsae_cancha: 2,
          },
          { id_linea: 11, orden: 2, dorsal: 'A-2', nombres: 'Luis', calificado: false, estado: 'pendiente' },
        ],
      },
    ]

    const p = organizarPantallaPoomsaePorAreas(cats)
    expect(p.areas[1].forma.nombre).toBe('Kibom')
    expect(p.areas[1].actual.id_linea).toBe(10)
    expect(p.areas[0].forma).toBeNull()
    expect(p.areas[2].forma).toBeNull()
  })
})
