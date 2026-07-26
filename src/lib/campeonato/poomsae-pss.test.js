import { describe, it, expect } from 'vitest'
import { organizarPantallaPoomsae } from '@/lib/campeonato/poomsae-pss'

describe('organizarPantallaPoomsae (areas)', () => {
  it('expone 3 áreas y forma en_curso', () => {
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
            poomsae_cancha: 1,
          },
          { id_linea: 11, orden: 2, dorsal: 'A-2', nombres: 'Luis', calificado: false, estado: 'pendiente' },
        ],
      },
    ]

    const p = organizarPantallaPoomsae(cats)
    expect(p.areas).toHaveLength(3)
    expect(p.areas[0].forma.nombre).toBe('Kibom')
    expect(p.areas[0].actual.id_linea).toBe(10)
    expect(p.stats.pendientes).toBe(2)
  })
})
