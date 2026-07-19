import { describe, it, expect } from 'vitest'
import { divisionFestivalPorEdad, compararParticipantesFestival, FESTIVAL_GRUPOS, divisionFestivalFromText } from '@/lib/campeonato/festival-grupos'

describe('festival-grupos', () => {
  it('resuelve PRE INFANTIL 4-5 años', () => {
    expect(divisionFestivalPorEdad(4)?.division).toBe('PRE INFANTIL')
    expect(divisionFestivalPorEdad(5)?.division).toBe('PRE INFANTIL')
  })

  it('resuelve INFANTIL A 6-7', () => {
    expect(divisionFestivalPorEdad(6)?.division).toBe('INFANTIL A')
  })

  it('resuelve SENIOR 18+', () => {
    expect(divisionFestivalPorEdad(18)?.division).toBe('SENIOR')
    expect(divisionFestivalPorEdad(40)?.division).toBe('SENIOR')
  })

  it('ordena F antes que M', () => {
    const a = { sexo: 'M', nombre: 'Ana' }
    const b = { sexo: 'F', nombre: 'Zoe' }
    expect(compararParticipantesFestival(a, b)).toBeGreaterThan(0)
  })

  it('tiene 7 grupos oficiales', () => {
    expect(FESTIVAL_GRUPOS).toHaveLength(7)
  })

  it('resuelve IA / IB como festival', () => {
    expect(divisionFestivalFromText('IA')?.division).toBe('INFANTIL A')
    expect(divisionFestivalFromText('IB NOVELES')?.division).toBe('INFANTIL B')
    expect(divisionFestivalFromText('PRE CADETE')?.division).toBe('PRE CADETE')
  })
})
