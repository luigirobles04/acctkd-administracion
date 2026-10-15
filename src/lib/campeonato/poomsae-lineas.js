/** Criterios de visibilidad poomsae (lista, sorteo, PSS): dorsal asignado; pago aparte. */

export function montoPagadoLinea(linea) {
  const pagos = linea.pagos || linea.asignacion_pago || []
  return (pagos || []).reduce((s, a) => s + Number(a.monto || 0), 0)
}

/** true si la línea de cobro no tiene el monto cubierto por asignaciones de pago */
export function lineaFaltaPago(linea) {
  if (linea?.estado === 'anulado') return false
  const precio = Number(linea?.precio_aplicado || 0)
  if (linea?.es_cobro === false || precio <= 0) return false
  return montoPagadoLinea(linea) + 0.001 < precio
}

export function lineaVisibleEnPoomsae(linea) {
  if (!linea || linea.estado === 'anulado' || linea.estado === 'borrador') return false
  return linea.dorsal_numero != null || Boolean(linea.dorsal_display)
}
