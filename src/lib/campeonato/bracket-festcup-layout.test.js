import { describe, it, expect } from 'vitest'
import { layoutFestcupBracket } from '@/lib/campeonato/bracket-festcup-layout'

function mkMatch(ronda, i, comp, ordenBase = 0) {
  return {
    ronda,
    match_numero: i + 1,
    orden_pista: comp ? ordenBase + i + 1 : ordenBase + i + 10,
    estado: 'pendiente',
    competidor1: comp ? { nombres: `CHUNG${i}`, academia: 'Club A', id_linea: i + 1 } : null,
    competidor2: comp ? { nombres: `HONG${i}`, academia: 'Club B', id_linea: i + 10 } : null,
    color1: 'azul',
    color2: 'rojo',
  }
}

function porRonda2() {
  return { 1: [mkMatch(1, 0, true, 0)] }
}

function porRonda4() {
  return { 2: [mkMatch(2, 0, true, 0), mkMatch(2, 1, true, 0)], 1: [mkMatch(1, 0, false, 0)] }
}

function porRonda8() {
  return {
    3: [mkMatch(3, 0, true), mkMatch(3, 1, true), mkMatch(3, 2, true), mkMatch(3, 3, true)],
    2: [mkMatch(2, 0, false), mkMatch(2, 1, false)],
    1: [mkMatch(1, 0, false)],
  }
}

function porRonda6() {
  return {
    3: [mkMatch(3, 0, true, 0), mkMatch(3, 1, true, 0), mkMatch(3, 2, true, 0)],
    2: [mkMatch(2, 0, false, 0), mkMatch(2, 1, false, 0)],
    1: [mkMatch(1, 0, false, 0)],
  }
}

describe('layoutFestcupBracket', () => {
  it('2 pers.: 3 filas, conector en H', () => {
    const layout = layoutFestcupBracket(porRonda2(), { cancha: 2 })
    expect(layout.rows).toBe(3)
    expect(layout.cells.get('1,7')?.border?.top).toBe(true)
    expect(layout.cells.get('1,7')?.v).toBe('2/01')
    expect(layout.cells.get('1,6')?.border?.top).toBe(true)
  })

  it('4 pers.: 7 filas, semillas 1,4,3,2', () => {
    const layout = layoutFestcupBracket(porRonda4())
    expect(layout.rows).toBe(7)
    expect(layout.cells.get('0,0')?.v).toBe(1)
    expect(layout.cells.get('2,0')?.v).toBe(4)
    expect(layout.cells.get('4,0')?.v).toBe(3)
    expect(layout.cells.get('6,0')?.v).toBe(2)
  })

  it('8 pers.: 15 filas', () => {
    expect(layoutFestcupBracket(porRonda8()).rows).toBe(15)
  })

  it('6 pers.: 11 filas plantilla FESTCUP', () => {
    expect(layoutFestcupBracket(porRonda6()).rows).toBe(11)
  })

  it('6 pers. con byes: final centrada en H fila 5, SF en G', () => {
    const porRonda = {
      3: [
        {
          ronda: 3,
          match_numero: 1,
          es_bye: true,
          competidor1: { nombres: 'P1', academia: 'A', id_linea: 1 },
          competidor2: null,
          estado: 'saltado',
        },
        mkMatch(3, 1, true, 0),
        {
          ronda: 3,
          match_numero: 3,
          es_bye: true,
          competidor1: { nombres: 'P2', academia: 'B', id_linea: 2 },
          competidor2: null,
          estado: 'saltado',
        },
        mkMatch(3, 3, true, 3),
      ],
      2: [mkMatch(2, 0, false, 0), mkMatch(2, 1, false, 0)],
      1: [mkMatch(1, 0, false, 90)],
    }
    const layout = layoutFestcupBracket(porRonda, { cancha: 2 })
    expect(layout.rows).toBe(11)
    expect(layout.cells.get('0,1')?.v).toBe('P1')
    expect(layout.cells.get('10,1')?.v).toBe('P2')
    expect(layout.cells.get('2,1')?.v).toBe('HONG1')
    expect(layout.cells.get('4,1')?.v).toBe('CHUNG1')
    expect(layout.cells.get('0,6')?.border?.bottom).toBe(true)
    expect(layout.cells.get('10,6')?.border?.bottom).toBe(true)
    expect(layout.cells.get('2,7')?.v).toBe('2/100')
    expect(layout.cells.get('5,8')?.border?.bottom).toBe(true)
    expect(layout.cells.get('1,6')?.v).toBe('2/10')
    expect(layout.cells.get('10,6')?.v).toBe('2/11')
    expect(layout.cells.get('8,6')?.v).toBeFalsy()
    expect(layout.cells.get('2,5')?.border?.right).toBe(true)
    expect(layout.cells.get('6,5')?.border?.right).toBe(true)
    expect(layout.cells.get('9,6')?.border?.right).toBe(true)
  })

  it('8 pers.: puente final en centro vertical (fila 9)', () => {
    const layout = layoutFestcupBracket(porRonda8(), { cancha: 1 })
    expect(layout.cells.get('9,7')?.border?.right).toBe(true)
    expect(layout.cells.get('9,8')?.border?.bottom).toBe(true)
    expect(layout.cells.get('9,8')?.border?.left).toBe(true)
  })

  it('4 pers.: puente H:R I:BL en fila gap', () => {
    const layout = layoutFestcupBracket(porRonda4(), { cancha: 1 })
    expect(layout.cells.get('3,7')?.border?.right).toBe(true)
    expect(layout.cells.get('3,8')?.border?.bottom).toBe(true)
    expect(layout.cells.get('3,8')?.border?.left).toBe(true)
  })
})
