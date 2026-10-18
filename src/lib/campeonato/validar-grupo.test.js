import { describe, it, expect } from 'vitest'
import { categoriasPoomsaeGrupo } from '@/lib/campeonato/validar-grupo'
import { grupoPoomsae } from '@/lib/campeonato/validar-categoria'

const anio = 2026

function cat(id, { division, grado_rango, genero = 'M', edad_min = 8, edad_max = 11 }) {
  return {
    id_categoria: id,
    modalidad: 'poomsae',
    division,
    nombre: `${division} · ${genero}`,
    grado_rango,
    genero,
    edad_min,
    edad_max,
    orden: id,
  }
}

function perfil(id, { grado, sexo = 'M', nacimiento = '2016-06-01' }) {
  return {
    id_perfil: id,
    grado,
    sexo,
    fecha_nacimiento: nacimiento,
  }
}

describe('categoriasPoomsaeGrupo', () => {
  const categorias = [
    cat(1, { division: 'Reconocido · Infantil A', grado_rango: 'kup:5-5', genero: 'M' }),
    cat(2, { division: 'Reconocido · Infantil A', grado_rango: 'kup:5-5', genero: 'F' }),
    cat(3, { division: 'Dan · Infantil A', grado_rango: 'dan:1', genero: 'M' }),
    cat(4, { division: 'Dan · Infantil A', grado_rango: 'dan:2', genero: 'M' }),
  ]

  it('pareja mismo sexo y cinturón color: ofrece reconocido, no dan', () => {
    const p1 = perfil(10, { grado: '5to kup' })
    const p2 = perfil(11, { grado: '5 kup' })
    const validas = categoriasPoomsaeGrupo(categorias, [p1, p2], anio, 'poomsae_pareja_reconocida')
    expect(validas.some((c) => c.id_categoria === 1)).toBe(true)
    expect(validas.every((c) => grupoPoomsae(c) === 'Poomsae reconocido')).toBe(true)
  })

  it('pareja de dan: incluye su forma dan (y reconocido, igual que individual)', () => {
    const p1 = perfil(20, { grado: '1er dan' })
    const p2 = perfil(21, { grado: '1 dan' })
    const validas = categoriasPoomsaeGrupo(categorias, [p1, p2], anio, 'poomsae_pareja_reconocida')
    expect(validas.map((c) => c.id_categoria).sort()).toEqual([1, 3])
  })

  it('equipo WT tres kup 5: una división reconocida común', () => {
    const miembros = [101, 102, 103].map((id) => perfil(id, { grado: '5to kup' }))
    const validas = categoriasPoomsaeGrupo(categorias, miembros, anio, 'poomsae_equipo')
    expect(validas).toHaveLength(1)
    expect(validas[0].grado_rango).toBe('kup:5-5')
  })
})
