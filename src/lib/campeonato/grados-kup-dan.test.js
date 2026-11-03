import { describe, expect, it } from 'vitest'
import { GRADOS_KUP_DAN } from '@/lib/campeonato/constants'
import { parseGrado } from '@/lib/campeonato/validar-categoria'

describe('GRADOS_KUP_DAN', () => {
  it('incluye dan 6 a 10 para registro de competidores y oficiales', () => {
    expect(GRADOS_KUP_DAN).toContain('6º dan')
    expect(GRADOS_KUP_DAN).toContain('7º dan')
    expect(GRADOS_KUP_DAN).toContain('10º dan')
  })

  it('parseGrado reconoce grados altos', () => {
    expect(parseGrado('7º dan')).toEqual({ tipo: 'dan', nivel: 7 })
    expect(parseGrado('10º dan')).toEqual({ tipo: 'dan', nivel: 10 })
  })
})
