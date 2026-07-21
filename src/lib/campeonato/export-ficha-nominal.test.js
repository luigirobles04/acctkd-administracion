import { describe, it, expect } from 'vitest'
import { lineaIncluidaFichaNominal, agruparLineasFichaAcademia } from './export-ficha-nominal'

function linea(modalidad, estado, perfil = { nombres: 'Ana', apellidos: 'López' }) {
  return {
    modalidad,
    estado,
    dorsal_display: 'FY-01',
    peso_declarado: null,
    categoria: { nombre: 'Infantil' },
    miembros: [{ perfil }],
  }
}

describe('lineaIncluidaFichaNominal', () => {
  it('incluye pendiente_pago y aprobado', () => {
    expect(lineaIncluidaFichaNominal(linea('festival', 'pendiente_pago'))).toBe(true)
    expect(lineaIncluidaFichaNominal(linea('kyorugi_individual', 'aprobado'))).toBe(true)
    expect(lineaIncluidaFichaNominal(linea('kyorugi_individual', 'pagado'))).toBe(true)
  })

  it('excluye anulado', () => {
    expect(lineaIncluidaFichaNominal(linea('festival', 'anulado'))).toBe(false)
  })
})

describe('agruparLineasFichaAcademia', () => {
  it('agrupa festival y mapea nombres', () => {
    const grupos = agruparLineasFichaAcademia(
      [
        linea('festival', 'pendiente_pago'),
        linea('kyorugi_individual', 'pendiente_pago', { nombres: 'Luis', apellidos: 'Pérez' }),
        linea('poomsae_individual', 'aprobado', { nombres: 'María', apellidos: 'García' }),
        linea('oficial', 'aprobado', { nombres: 'Coach', apellidos: 'Uno' }),
      ],
      2026
    )
    expect(grupos.festival).toHaveLength(1)
    expect(grupos.festival[0].nombre).toBe('Ana López')
    expect(grupos.kyorugi).toHaveLength(1)
    expect(grupos.kyorugi[0].nombre).toBe('Luis Pérez')
    expect(grupos.poomsae).toHaveLength(1)
    expect(grupos.oficiales).toHaveLength(1)
    expect(grupos.total_competidores).toBe(3)
    expect(grupos.total).toBe(4)
  })
})
