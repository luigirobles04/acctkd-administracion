import { describe, it, expect } from 'vitest'
import {
  poomsaeGrupoKey,
  parsePoomsaeGrupoKey,
  compareGruposPoomsae,
} from '@/lib/campeonato/poomsae-grupo'

describe('poomsae-grupo', () => {
  it('arma y parsea grupo_key catálogo + modalidad', () => {
    const key = poomsaeGrupoKey(10379, 'poomsae_equipo')
    expect(key).toBe('10379:poomsae_equipo')
    expect(parsePoomsaeGrupoKey(key)).toEqual({
      idCategoria: 10379,
      modalidad: 'poomsae_equipo',
    })
  })

  it('ordena misma forma/edad: individual antes que equipo', () => {
    const base = {
      nombre: 'Poomsae Chil Jang · Pre Cadete · F',
      genero: 'F',
    }
    const ind = { ...base, modalidad_key: 'poomsae_individual' }
    const eq = { ...base, modalidad_key: 'poomsae_equipo' }
    expect(compareGruposPoomsae(ind, eq)).toBeLessThan(0)
    expect(compareGruposPoomsae(eq, ind)).toBeGreaterThan(0)
  })
})
