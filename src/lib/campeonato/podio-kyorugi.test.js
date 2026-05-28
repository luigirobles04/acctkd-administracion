import { describe, it, expect } from 'vitest'
import { calcularPodioCategoria } from '@/lib/campeonato/podio-kyorugi'

// Helpers para construir combates
const finalC = (over) => ({ ronda: 1, id_linea1: 10, id_linea2: 20, estado: 'finalizado', ganador_id_linea: 10, ...over })
const semi = (id, l1, l2, ganador) => ({ ronda: 2, id_linea1: l1, id_linea2: l2, estado: 'finalizado', ganador_id_linea: ganador })

describe('calcularPodioCategoria', () => {
  it('sin combates útiles → sin_llave', () => {
    expect(calcularPodioCategoria([]).estado).toBe('sin_llave')
    expect(calcularPodioCategoria([{ estado: 'vacío' }]).estado).toBe('sin_llave')
  })

  it('final no finalizada → en_curso, sin podio', () => {
    const res = calcularPodioCategoria([{ ronda: 1, id_linea1: 10, id_linea2: 20, estado: 'pendiente' }])
    expect(res.estado).toBe('en_curso')
    expect(res.podio).toBeNull()
  })

  it('final finalizada → oro y plata correctos', () => {
    const res = calcularPodioCategoria([finalC()])
    expect(res.estado).toBe('completo')
    expect(res.podio.oro).toBe(10)
    expect(res.podio.plata).toBe(20)
  })

  it('dos semifinales → dos bronces (regla WT sin combate por bronce)', () => {
    const combates = [
      finalC({ id_linea1: 10, id_linea2: 20, ganador_id_linea: 10 }),
      semi(1, 10, 30, 10), // 30 pierde → bronce
      semi(2, 20, 40, 20), // 40 pierde → bronce
    ]
    const res = calcularPodioCategoria(combates)
    expect(res.estado).toBe('completo')
    expect(res.podio.oro).toBe(10)
    expect(res.podio.plata).toBe(20)
    expect(res.podio.bronce.sort()).toEqual([30, 40])
  })

  it('el perdedor de la final NO aparece como bronce', () => {
    const combates = [
      finalC({ id_linea1: 10, id_linea2: 20, ganador_id_linea: 10 }),
      semi(1, 10, 30, 10),
      semi(2, 20, 40, 20),
    ]
    const res = calcularPodioCategoria(combates)
    expect(res.podio.bronce).not.toContain(20)
  })

  it('no duplica bronces si el mismo competidor aparece dos veces', () => {
    const combates = [
      finalC({ id_linea1: 10, id_linea2: 20, ganador_id_linea: 10 }),
      semi(1, 10, 30, 10),
      semi(2, 20, 30, 20), // 30 repetido (caso defensivo)
    ]
    const res = calcularPodioCategoria(combates)
    expect(res.podio.bronce).toEqual([30])
  })
})
