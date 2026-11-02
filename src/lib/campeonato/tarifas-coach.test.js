import { describe, expect, it } from 'vitest'
import { tarifasCoachDesdeLista, TARIFAS_LISTA_FDPTKD } from '@/lib/campeonato/tarifas-coach'

describe('tarifasCoachDesdeLista', () => {
  it('resta S/ 20 a pareja y equipo (100/120 y 120/140 coach)', () => {
    const coach = tarifasCoachDesdeLista()
    const pareja = coach.find((t) => t.modalidad === 'poomsae_pareja_reconocida')
    const equipo = coach.find((t) => t.modalidad === 'poomsae_equipo')
    expect(pareja).toEqual({ modalidad: 'poomsae_pareja_reconocida', precio_regular: 100, precio_tardia: 120 })
    expect(equipo).toEqual({ modalidad: 'poomsae_equipo', precio_regular: 120, precio_tardia: 140 })
  })

  it('individual y kyorugi quedan en 70/100', () => {
    const coach = tarifasCoachDesdeLista()
    expect(coach.find((t) => t.modalidad === 'kyorugi_individual')).toMatchObject({ precio_regular: 70, precio_tardia: 100 })
    expect(TARIFAS_LISTA_FDPTKD.find((t) => t.modalidad === 'poomsae_pareja_reconocida')).toMatchObject({
      precio_regular: 120,
      precio_tardia: 140,
    })
  })
})
