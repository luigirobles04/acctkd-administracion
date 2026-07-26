import { describe, it, expect } from 'vitest'
import { calcularRecaudacion, montoPagadoLinea, resumenPagosPorAcademia } from './resumen-pagos'

const academias = [
  { id: 1, monto_total: 300, monto_asignado: 300, estado_pago: 'pagado', academia: { nombre: 'Alfa' } },
  { id: 2, monto_total: 200, monto_asignado: 50, estado_pago: 'parcial', academia: { nombre: 'Beta' } },
  { id: 3, monto_total: 0, monto_asignado: 0, estado_pago: 'pendiente', academia: { nombre: 'Gamma' } },
]

const lineas = [
  // Alfa: 2 líneas pagadas con dorsal
  { id_linea: 1, id_academia_campeonato: 1, modalidad: 'kyorugi_individual', dorsal_display: 'A-001', precio_aplicado: 150, pagos: [{ monto: 150 }] },
  { id_linea: 2, id_academia_campeonato: 1, modalidad: 'poomsae_individual', dorsal_display: 'A-002', precio_aplicado: 150, pagos: [{ monto: 100 }, { monto: 50 }] },
  // Beta: 1 pagada sin dorsal, 1 pendiente
  { id_linea: 3, id_academia_campeonato: 2, modalidad: 'kyorugi_individual', dorsal_display: null, precio_aplicado: 50, pagos: [{ monto: 50 }] },
  { id_linea: 4, id_academia_campeonato: 2, modalidad: 'kyorugi_individual', dorsal_display: null, precio_aplicado: 150, pagos: [] },
  // Línea gratis (precio 0): pagada, no cuenta como pendiente
  { id_linea: 5, id_academia_campeonato: 2, modalidad: 'festival', dorsal_display: 'B-003', precio_aplicado: 0, pagos: [] },
]

describe('calcularRecaudacion', () => {
  it('misma regla que el cálculo anterior con líneas completas', () => {
    const r = calcularRecaudacion(academias)
    expect(r).toEqual({ totalEsperado: 500, recaudado: 350, pendiente: 150 })
  })

  it('pendiente nunca es negativo', () => {
    const r = calcularRecaudacion([{ monto_total: 100, monto_asignado: 180 }])
    expect(r.pendiente).toBe(0)
  })

  it('tolera lista vacía', () => {
    expect(calcularRecaudacion([])).toEqual({ totalEsperado: 0, recaudado: 0, pendiente: 0 })
  })
})

describe('montoPagadoLinea', () => {
  it('suma asignaciones embebidas', () => {
    expect(montoPagadoLinea({ pagos: [{ monto: 100 }, { monto: 50 }] })).toBe(150)
    expect(montoPagadoLinea({ pagos: [] })).toBe(0)
    expect(montoPagadoLinea({})).toBe(0)
  })
})

describe('resumenPagosPorAcademia', () => {
  const comprobantes = [{ estado: 'pendiente' }, { estado: 'validado' }, { estado: 'pendiente' }]
  const { resumen, porAcademia } = resumenPagosPorAcademia(lineas, academias, comprobantes)

  it('resumen global igual que el cálculo anterior', () => {
    expect(resumen.total).toBe(5)
    expect(resumen.aprobadas).toBe(3) // con dorsal_display
    expect(resumen.pagadas).toBe(4) // pago >= precio (incluye precio 0)
    expect(resumen.pendientes).toBe(1) // sin pago completo y precio > 0
    expect(resumen.comprobantesPendientes).toBe(2)
  })

  it('agrega por academia y excluye academias sin líneas', () => {
    expect(porAcademia.map((g) => g.nombre)).toEqual(['Alfa', 'Beta'])
    const alfa = porAcademia.find((g) => g.id === 1)
    expect(alfa).toMatchObject({ totalLineas: 2, conDorsal: 2, pagadas: 2, pendientesPago: 0, pendiente: 0 })
    const beta = porAcademia.find((g) => g.id === 2)
    expect(beta).toMatchObject({ totalLineas: 3, conDorsal: 1, pagadas: 2, pendientesPago: 1, pendiente: 150 })
  })

  it('incluye modalidades únicas por academia', () => {
    const beta = porAcademia.find((g) => g.id === 2)
    expect(beta.modalidades.sort()).toEqual(['festival', 'kyorugi_individual'])
  })
})
