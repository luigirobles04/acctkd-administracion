/**
 * Resolución de "cuántos inscritos" para bucketing de llaves: BD puede usar id numérico vs string
 * y el conteo por linea_inscripcion a veces no coincide; la llave generada es respaldo.
 */

export function lookupInscritosMap(map, idCategoria) {
  if (map == null) return undefined
  if (map[idCategoria] != null) return map[idCategoria]
  const s = String(idCategoria)
  if (map[s] != null) return map[s]
  return undefined
}

function combatesActivosBracket(lista) {
  return (lista || []).filter(
    (c) =>
      c &&
      !c.es_bye &&
      !['vacío', 'bye', 'saltado'].includes(c.estado),
  )
}

/**
 * Infiere N inscritos a partir de la llave ya generada (cuando el conteo de inscripciones falla o la clave no matchea).
 */
export function inferirInscritosDesdeLlave(porCat, idCategoria) {
  const lista = porCat?.[idCategoria] || porCat?.[String(idCategoria)] || []
  const activos = combatesActivosBracket(lista)
  if (!activos.length) return null
  const maxR = Math.max(...activos.map((c) => Number(c.ronda) || 0))
  if (maxR === 1 && activos.length === 1) return 2
  if (maxR === 2) {
    if (activos.length >= 3) return 4
    if (activos.length === 2) return 3
  }
  if (maxR >= 3) return 2 ** maxR
  return null
}

/**
 * Un conteo por categoría para schedule/export: BD + cat.inscritos + inferencia desde llave.
 */
export function inscritosResueltosParaCategoria(cat, inscritosPorCat, porCat) {
  const id = cat?.id_categoria
  if (id == null) return 0
  const fromMap = lookupInscritosMap(inscritosPorCat, id)
  let n =
    fromMap != null ? Number(fromMap) : cat.inscritos != null ? Number(cat.inscritos) : null
  if (n == null || !Number.isFinite(n)) n = 0
  const num = Math.max(0, Math.floor(n))
  if (num >= 2) return num
  /** Solo inferir si hay conteo explícito (mapa o cat.inscritos) — evita cambiar tests sin inscritos. */
  const tieneConteoExplicito = fromMap != null || cat.inscritos != null
  const inf = inferirInscritosDesdeLlave(porCat, id)
  if (tieneConteoExplicito && inf != null && inf >= 2) return inf
  return num
}

/** Mapa id_categoria → inscritos resueltos (solo las categorías pasadas). */
export function buildMapInscritosResueltos(categorias, inscritosPorCat, porCat) {
  const out = {}
  for (const cat of categorias || []) {
    if (cat?.id_categoria == null) continue
    out[cat.id_categoria] = inscritosResueltosParaCategoria(cat, inscritosPorCat, porCat)
  }
  return out
}

/**
 * @param {Record<number, number>} inscritosPorCat
 * @param {{ id_categoria: number, inscritos?: number }[]} categorias
 * @param {Record<number, object[]>} porCat
 */
export function buildInscritosPorCatResuelto(inscritosPorCat, categorias, porCat) {
  return buildMapInscritosResueltos(categorias, inscritosPorCat, porCat)
}
