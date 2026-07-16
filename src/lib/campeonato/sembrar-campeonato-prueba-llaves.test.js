import { describe, it, expect } from 'vitest'
import { cupoParaCategoria, perfilParaCategoria } from '@/lib/campeonato/sembrar-campeonato-prueba-llaves'

describe('sembrar-campeonato-prueba-llaves', () => {
  it('cupoParaCategoria devuelve entre 2 y 10', () => {
    for (let i = 1; i <= 50; i++) {
      const n = cupoParaCategoria({ id_categoria: i }, i)
      expect(n).toBeGreaterThanOrEqual(2)
      expect(n).toBeLessThanOrEqual(10)
    }
  })

  it('kyorugi Área 1 (idx % 3 === 0) alterna 2 y 3 comp', () => {
    const cat = { id_categoria: 99, modalidad: 'kyorugi' }
    expect(cupoParaCategoria(cat, 0, { kyorugiIdx: 0 })).toBe(2)
    expect(cupoParaCategoria(cat, 0, { kyorugiIdx: 3 })).toBe(3)
    expect(cupoParaCategoria(cat, 0, { kyorugiIdx: 6 })).toBe(2)
    expect(cupoParaCategoria(cat, 0, { kyorugiIdx: 1 })).toBe(2 + (99 % 9))
    expect(cupoParaCategoria({ id_categoria: 5, modalidad: 'kyorugi' }, 0, { kyorugiIdx: 1 })).toBeGreaterThanOrEqual(4)
  })

  it('perfilParaCategoria genera nombres de persona y datos coherentes', () => {
    const cat = {
      id_categoria: 12,
      genero: 'M',
      edad_min: 12,
      edad_max: 14,
      grado_rango: 'kup:4-6',
      peso_min: 45,
      peso_max: 55,
    }
    const p = perfilParaCategoria(cat, 42, 5, 99)
    expect(p.nombres).not.toMatch(/^Atleta/)
    expect(p.apellidos).toContain(' ')
    expect(p.sexo).toBe('M')
    expect(p.grado).toMatch(/kup|dan/)
    expect(p.documento_numero).toMatch(/^7\d{11}$/)
  })
})
