import { describe, it, expect } from 'vitest'
import { MODALIDADES_POOMSAE } from '@/lib/campeonato/poomsae-orden'

describe('poomsae-orden', () => {
  it('exporta modalidades poomsae conocidas', () => {
    expect(MODALIDADES_POOMSAE).toContain('poomsae_individual')
    expect(MODALIDADES_POOMSAE).toContain('poomsae_equipo')
    expect(MODALIDADES_POOMSAE.every((m) => m.startsWith('poomsae_'))).toBe(true)
  })
})
