/**
 * Helpers server-side para el lazy load de líneas de inscripción por academia.
 * Select con joins mínimos (categoría nombre + perfiles) compartido por
 * el endpoint de líneas por academia y la búsqueda global.
 */

export const LINEA_SELECT_ADMIN = `
  id_linea, id_academia_campeonato, modalidad, estado, id_categoria,
  peso_declarado, peso_oficial, dorsal_display, dorsal_numero, precio_aplicado, created_at,
  categoria:categoria_campeonato(nombre),
  academia_campeonato(academia:academia(nombre)),
  miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(id_perfil, nombres, apellidos, sexo, fecha_nacimiento, grado, documento_tipo, documento_numero))
`

export const LINEA_SELECT_ADMIN_PAGOS = `${LINEA_SELECT_ADMIN}, pagos:asignacion_pago(monto)`

/** Valida que la academia_campeonato pertenezca al campeonato (scope de seguridad). */
export async function academiaPerteneceACampeonato(sb, acId, idCampeonato) {
  if (!acId || !idCampeonato) return false
  const { data, error } = await sb
    .from('academia_campeonato')
    .select('id')
    .eq('id', acId)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

/** Aplana el array embebido de pagos en monto_pagado / pago_completo. */
export function lineaConPagos(linea) {
  const { pagos, ...resto } = linea || {}
  const montoPagado = (pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0)
  return {
    ...resto,
    monto_pagado: montoPagado,
    pago_completo: montoPagado >= Number(resto.precio_aplicado || 0),
  }
}
