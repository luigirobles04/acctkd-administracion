/**
 * Agregados de pagos/recaudación calculados en servidor a partir de
 * líneas "ligeras" (sin joins de perfiles). Mantiene exactamente las
 * mismas reglas que antes se calculaban con las líneas completas.
 */

/** Recaudación global desde academia_campeonato (monto_total / monto_asignado). */
export function calcularRecaudacion(academias) {
  const recaudacion = (academias || []).reduce(
    (acc, ac) => {
      acc.totalEsperado += Number(ac.monto_total || 0)
      acc.recaudado += Number(ac.monto_asignado || 0)
      return acc
    },
    { totalEsperado: 0, recaudado: 0 }
  )
  recaudacion.pendiente = Math.max(0, recaudacion.totalEsperado - recaudacion.recaudado)
  return recaudacion
}

/** Suma el monto pagado de una línea desde su array embebido de asignacion_pago. */
export function montoPagadoLinea(linea) {
  return (linea?.pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0)
}

/**
 * Resumen global + agregados por academia.
 * lineas: [{ id_linea, id_academia_campeonato, dorsal_display, precio_aplicado, modalidad, pagos: [{monto}] }]
 * academias: filas de academia_campeonato con academia.nombre
 */
export function resumenPagosPorAcademia(lineas, academias, comprobantes = []) {
  const porAcademia = new Map()
  for (const ac of academias || []) {
    porAcademia.set(ac.id, {
      id: ac.id,
      nombre: ac.academia?.nombre || ac.nombre || `Academia #${ac.id}`,
      monto_total: Number(ac.monto_total || 0),
      monto_asignado: Number(ac.monto_asignado || 0),
      pendiente: Math.max(0, Number(ac.monto_total || 0) - Number(ac.monto_asignado || 0)),
      estado_pago: ac.estado_pago,
      totalLineas: 0,
      conDorsal: 0,
      pagadas: 0,
      pendientesPago: 0,
      modalidades: [],
    })
  }

  const resumen = { total: 0, aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 }
  const modalidadesPorAc = new Map()

  for (const l of lineas || []) {
    const pagado = montoPagadoLinea(l)
    const precio = Number(l.precio_aplicado || 0)
    const pagoCompleto = pagado >= precio
    resumen.total += 1
    if (l.dorsal_display) resumen.aprobadas += 1
    if (pagoCompleto) resumen.pagadas += 1
    if (!pagoCompleto && precio > 0) resumen.pendientes += 1

    const g = porAcademia.get(l.id_academia_campeonato)
    if (!g) continue
    g.totalLineas += 1
    if (l.dorsal_display) g.conDorsal += 1
    if (pagoCompleto) g.pagadas += 1
    if (!pagoCompleto && precio > 0) g.pendientesPago += 1
    if (l.modalidad) {
      const set = modalidadesPorAc.get(g.id) || new Set()
      set.add(l.modalidad)
      modalidadesPorAc.set(g.id, set)
    }
  }

  resumen.comprobantesPendientes = (comprobantes || []).filter((c) => c.estado === 'pendiente').length

  const lista = [...porAcademia.values()]
    .map((g) => ({ ...g, modalidades: [...(modalidadesPorAc.get(g.id) || [])] }))
    .filter((g) => g.totalLineas > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return { resumen, porAcademia: lista }
}
