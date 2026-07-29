import { describe, it, expect } from 'vitest'
import { organizarPantallaCancha, ganadorCombate } from './canchas-data'

const combate = (id, estado, orden, extra = {}) => ({
  id_llave: id,
  estado,
  orden_pista: orden,
  id_linea1: 100 + id,
  id_linea2: 200 + id,
  competidor1: { id_linea: 100 + id, dorsal: `A${id}`, nombres: `Azul ${id}` },
  competidor2: { id_linea: 200 + id, dorsal: `R${id}`, nombres: `Rojo ${id}` },
  ...extra,
})

describe('organizarPantallaCancha (base de /llamados y TV)', () => {
  it('vacía: sin actual ni próximos', () => {
    const r = organizarPantallaCancha([])
    expect(r.actual).toBeNull()
    expect(r.proximos).toEqual([])
    expect(r.recientes).toEqual([])
    expect(r.stats).toEqual({ terminados: 0, total: 0, pendientes: 0 })
  })

  it('el combate en curso tiene prioridad como actual', () => {
    const r = organizarPantallaCancha([
      combate(1, 'pendiente', 1),
      combate(2, 'en_curso', 2),
      combate(3, 'pendiente', 3),
    ])
    expect(r.actual.id_llave).toBe(2)
    expect(r.proximos.map((c) => c.id_llave)).toEqual([3])
  })

  it('sin en curso: primer pendiente por orden_pista es el actual (aunque falte rival)', () => {
    const r = organizarPantallaCancha([
      combate(5, 'pendiente', 9),
      combate(4, 'pendiente', 2),
    ])
    expect(r.actual.id_llave).toBe(4)
    expect(r.proximos.map((c) => c.id_llave)).toEqual([5])
  })

  it('siguientes respetan numeración de pista aunque el combate no tenga ambos rivales', () => {
    const espera = combate(3, 'pendiente', 3, { id_linea1: null, competidor1: null })
    const r = organizarPantallaCancha([
      combate(2, 'en_curso', 2),
      espera,
      combate(5, 'pendiente', 5),
    ])
    expect(r.actual.id_llave).toBe(2)
    expect(r.proximos.map((c) => c.orden_pista)).toEqual([3, 5])
  })

  it('combate pendiente con un solo competidor es actual si es el menor orden en pista', () => {
    const incompleto = combate(7, 'pendiente', 1, { id_linea2: null, competidor2: null })
    const r = organizarPantallaCancha([incompleto, combate(8, 'pendiente', 2)])
    expect(r.actual.id_llave).toBe(7)
    expect(r.proximos.map((c) => c.id_llave)).toEqual([8])
  })

  it('finalizados alimentan recientes (últimos primero) y stats', () => {
    const r = organizarPantallaCancha([
      combate(1, 'finalizado', 1, { ganador_id_linea: 101 }),
      combate(2, 'finalizado', 2, { ganador_id_linea: 202 }),
      combate(3, 'pendiente', 3),
    ])
    expect(r.recientes.map((c) => c.id_llave)).toEqual([2, 1])
    expect(r.stats).toEqual({ terminados: 2, total: 3, pendientes: 1 })
  })
})

describe('ganadorCombate', () => {
  it('devuelve el competidor correcto o null', () => {
    const c = combate(1, 'finalizado', 1, { ganador_id_linea: 101 })
    expect(ganadorCombate(c)?.dorsal).toBe('A1')
    expect(ganadorCombate(combate(2, 'pendiente', 2))).toBeNull()
    expect(ganadorCombate(null)).toBeNull()
  })
})
