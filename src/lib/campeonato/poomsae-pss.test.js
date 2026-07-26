import { describe, it, expect } from 'vitest'
import { organizarPantallaPoomsae } from '@/lib/campeonato/poomsae-pss'

describe('organizarPantallaPoomsae', () => {
  it('elige categoría con en_curso y lista siguientes', () => {
    const cats = [
      {
        id_categoria: 1,
        nombre: 'Poomsae Taegeuk 1 · Infantil · M',
        division: 'Cintas · Infantil',
        inscritos: 2,
        calificados: 0,
        cerrada: false,
        participantes: [
          { id_linea: 10, orden: 1, dorsal: 'A-1', nombres: 'Ana', calificado: false, en_curso: true, estado: 'en_curso' },
          { id_linea: 11, orden: 2, dorsal: 'A-2', nombres: 'Luis', calificado: false, estado: 'pendiente' },
        ],
      },
      {
        id_categoria: 2,
        nombre: 'Poomsae Ranking · Cadete · F',
        division: 'Ranking · Cadete',
        inscritos: 1,
        calificados: 0,
        cerrada: false,
        participantes: [
          { id_linea: 20, orden: 1, dorsal: 'B-1', nombres: 'Mia', calificado: false, estado: 'pendiente' },
        ],
      },
    ]

    const p = organizarPantallaPoomsae(cats)
    expect(p.categoriaActual.nombre).toContain('Taegeuk 1')
    expect(p.actual.id_linea).toBe(10)
    expect(p.proximos.map((x) => x.id_linea)).toEqual([11])
    expect(p.categoriasPendientes).toHaveLength(1)
    expect(p.stats.pendientes).toBe(3)
  })

  it('sin pendientes devuelve vacío', () => {
    const p = organizarPantallaPoomsae([
      {
        id_categoria: 1,
        nombre: 'Cat',
        inscritos: 1,
        calificados: 1,
        cerrada: true,
        participantes: [{ id_linea: 1, calificado: true, puntaje: 8.5 }],
      },
    ])
    expect(p.categoriaActual).toBeNull()
    expect(p.actual).toBeNull()
    expect(p.stats.pendientes).toBe(0)
  })
})
