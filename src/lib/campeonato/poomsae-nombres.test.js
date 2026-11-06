import { describe, it, expect } from 'vitest'
import {
  miembrosNombresCompletos,
  nombresPoomsaeParaLlamado,
  nombresPoomsaeInline,
} from '@/lib/campeonato/poomsae-nombres'

const lineaPareja = {
  modalidad: 'poomsae_pareja_reconocida',
  miembros: [
    { perfil: { nombres: 'Ana', apellidos: 'García López' } },
    { perfil: { nombres: 'Luis', apellidos: 'Pérez Ruiz' } },
  ],
}

describe('poomsae-nombres', () => {
  it('lista nombres completos por miembro', () => {
    expect(miembrosNombresCompletos(lineaPareja)).toEqual(['Ana García López', 'Luis Pérez Ruiz'])
  })

  it('pareja/equipo: salto de línea para llamados', () => {
    expect(nombresPoomsaeParaLlamado(lineaPareja)).toBe('Ana García López\nLuis Pérez Ruiz')
  })

  it('individual: separador inline', () => {
    const ind = { modalidad: 'poomsae_individual', miembros: lineaPareja.miembros.slice(0, 1) }
    expect(nombresPoomsaeParaLlamado(ind)).toBe('Ana García López')
    expect(nombresPoomsaeInline(lineaPareja)).toBe('Ana García López · Luis Pérez Ruiz')
  })
})
