/** Retención organizador sobre lista FDPTKD (S/ 20). */
export const RETENCION_ORGANIZADOR = 20

/** Lista FDPTKD / FestCup (antes de retención organizador). */
export const TARIFAS_LISTA_FDPTKD = [
  { modalidad: 'kyorugi_individual', precio_regular: 90, precio_tardia: 120 },
  { modalidad: 'poomsae_individual', precio_regular: 90, precio_tardia: 120 },
  { modalidad: 'poomsae_pareja_reconocida', precio_regular: 120, precio_tardia: 140 },
  { modalidad: 'poomsae_pareja_freestyle', precio_regular: 120, precio_tardia: 140 },
  { modalidad: 'poomsae_equipo', precio_regular: 140, precio_tardia: 160 },
  { modalidad: 'festival', precio_regular: 90, precio_tardia: 120 },
]

/** Precio que paga el coach = lista − retención (S/ 20). */
export function tarifasCoachDesdeLista(
  lista = TARIFAS_LISTA_FDPTKD,
  retencion = RETENCION_ORGANIZADOR,
) {
  return lista.map((t) => ({
    modalidad: t.modalidad,
    precio_regular: Math.max(0, Number(t.precio_regular) - retencion),
    precio_tardia: Math.max(0, Number(t.precio_tardia) - retencion),
  }))
}

export function tarifaCoachPorModalidad(modalidad, lista = TARIFAS_LISTA_FDPTKD, retencion = RETENCION_ORGANIZADOR) {
  const row = lista.find((t) => t.modalidad === modalidad)
  if (!row) return null
  return {
    modalidad,
    precio_regular: Math.max(0, row.precio_regular - retencion),
    precio_tardia: Math.max(0, row.precio_tardia - retencion),
  }
}
