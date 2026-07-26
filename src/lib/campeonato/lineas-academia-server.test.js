import { describe, it, expect } from 'vitest'
import { academiaPerteneceACampeonato, lineaConPagos } from './lineas-academia-server'

/** Stub mínimo de supabase para el chequeo de scope. */
function sbStub(filas) {
  return {
    from() {
      const chain = {
        _filtros: {},
        select() { return chain },
        eq(col, val) { chain._filtros[col] = val; return chain },
        async maybeSingle() {
          const match = filas.find(
            (f) => f.id === chain._filtros.id && f.id_campeonato === chain._filtros.id_campeonato
          )
          return { data: match || null, error: null }
        },
      }
      return chain
    },
  }
}

describe('academiaPerteneceACampeonato (scope de seguridad)', () => {
  const sb = sbStub([{ id: 7, id_campeonato: 10 }])

  it('true cuando la academia pertenece al campeonato', async () => {
    expect(await academiaPerteneceACampeonato(sb, 7, 10)).toBe(true)
  })

  it('false cuando la academia es de OTRO campeonato (→ endpoint responde 404)', async () => {
    expect(await academiaPerteneceACampeonato(sb, 7, 99)).toBe(false)
  })

  it('false cuando la academia no existe o faltan IDs', async () => {
    expect(await academiaPerteneceACampeonato(sb, 123, 10)).toBe(false)
    expect(await academiaPerteneceACampeonato(sb, null, 10)).toBe(false)
    expect(await academiaPerteneceACampeonato(sb, 7, null)).toBe(false)
  })
})

describe('lineaConPagos', () => {
  it('aplana pagos embebidos en monto_pagado/pago_completo', () => {
    const l = lineaConPagos({ id_linea: 1, precio_aplicado: 100, pagos: [{ monto: 60 }, { monto: 40 }] })
    expect(l.monto_pagado).toBe(100)
    expect(l.pago_completo).toBe(true)
    expect(l.pagos).toBeUndefined()
  })

  it('pago incompleto cuando falta monto', () => {
    const l = lineaConPagos({ precio_aplicado: 100, pagos: [{ monto: 30 }] })
    expect(l.monto_pagado).toBe(30)
    expect(l.pago_completo).toBe(false)
  })

  it('línea gratis cuenta como pagada', () => {
    expect(lineaConPagos({ precio_aplicado: 0, pagos: [] }).pago_completo).toBe(true)
  })
})
