import { describe, it, expect } from 'vitest'
import { lineaYaExiste } from '@/lib/campeonato/import-excel-commit'

describe('lineaYaExiste', () => {
  const keyToId = new Map([['juan', 1], ['maria', 2]])

  it('detecta festival duplicado sin categoría', () => {
    const existentes = [{ modalidad: 'festival', id_categoria: null, miembros: [{ id_perfil: 1 }] }]
    const nueva = { tipo: 'festival', idCategoria: null, perfilKeys: ['juan'] }
    expect(lineaYaExiste(existentes, nueva, keyToId)).toBe(true)
  })

  it('detecta oficial duplicado mismo rol', () => {
    const existentes = [{
      modalidad: 'oficial',
      tipo_oficial: 'coach',
      miembros: [{ id_perfil: 1 }],
    }]
    const nueva = { tipo: 'oficial', tipoOficial: 'coach', perfilKeys: ['juan'] }
    expect(lineaYaExiste(existentes, nueva, keyToId)).toBe(true)
  })

  it('permite mismo perfil en modalidades distintas', () => {
    const existentes = [{ modalidad: 'kyorugi_individual', id_categoria: 10, miembros: [{ id_perfil: 1 }] }]
    const nueva = { tipo: 'festival', idCategoria: null, perfilKeys: ['juan'] }
    expect(lineaYaExiste(existentes, nueva, keyToId)).toBe(false)
  })

  it('distingue kyorugi por categoría', () => {
    const existentes = [{ modalidad: 'kyorugi_individual', id_categoria: 10, miembros: [{ id_perfil: 1 }] }]
    const nueva = { tipo: 'kyorugi_individual', idCategoria: 11, perfilKeys: ['juan'] }
    expect(lineaYaExiste(existentes, nueva, keyToId)).toBe(false)
  })
})
