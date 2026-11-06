import {
  buildSchedulePorCategoria,
  combatesPeleables,
  ordenPistaDesdeSchedule,
} from '@/lib/campeonato/schedule-canchas'

/** Combates exportables en llave (no vacío/bye). */
export function combateEnLlave(c) {
  return c && !['vacío', 'bye'].includes(c.estado) && !c.es_bye
}

export { ordenPistaDesdeSchedule }

/**
 * Reparte áreas **balanceando el número de combates peleables** por categoría (greedy LPT).
 * Evita que un área acumule muchas más peleas que otras (ej. 20 vs 30).
 * Debe coincidir con `asignarCanchasCampeonato` y con el export PDF (no usar solo el `cancha` en BD).
 */
export function canchaPorCategoriaBalanceada(categoriasConLlaveEnOrden, porCat, numCanchas = 3) {
  const cats = [...(categoriasConLlaveEnOrden || [])].sort((a, b) => {
    const wa = combatesPeleables(porCat[a.id_categoria] || []).length
    const wb = combatesPeleables(porCat[b.id_categoria] || []).length
    if (wb !== wa) return wb - wa
    const oa = a.orden ?? 9999
    const ob = b.orden ?? 9999
    if (oa !== ob) return oa - ob
    return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
  })

  const loads = Array.from({ length: numCanchas }, () => 0)
  const out = {}
  for (const cat of cats) {
    const w = combatesPeleables(porCat[cat.id_categoria] || []).length
    let best = 0
    for (let i = 1; i < numCanchas; i++) {
      if (loads[i] < loads[best]) best = i
    }
    out[cat.id_categoria] = best + 1
    loads[best] += w
  }
  return out
}

/**
 * Numeración híbrida para PDF por categoría:
 * pre-final seguidos 1..N, hueco, final = N+2.
 */
export function computeOrdenLlavePdf(combates) {
  const activos = (combates || [])
    .filter(combateEnLlave)
    .sort((a, b) => {
      if (b.ronda !== a.ronda) return b.ronda - a.ronda
      return a.match_numero - b.match_numero
    })

  const preFinal = activos.filter((c) => c.ronda !== 1)
  const finals = activos.filter((c) => c.ronda === 1)

  const map = {}
  preFinal.forEach((c, i) => {
    map[c.id_llave] = i + 1
  })
  const finalNum = preFinal.length > 0 ? preFinal.length + 2 : 1
  finals.forEach((c) => {
    map[c.id_llave] = finalNum
  })
  return map
}

/**
 * Mapa id_llave → orden_pista por área.
 * Orden del programa: todas las peleas de una categoría seguidas, luego la siguiente (numeración densa).
 * canchaPorCat: balance por cantidad de combates (ver `canchaPorCategoriaBalanceada`).
 */
export function buildOrdenPistaMapPorCancha(categorias, porCat, canchaPorCat, { numCanchas = 3 } = {}) {
  const map = {}
  for (let cancha = 1; cancha <= numCanchas; cancha++) {
    const cats = (categorias || [])
      .filter((c) => Number(canchaPorCat[c.id_categoria]) === cancha)
      .sort((a, b) => {
        const oa = a.orden ?? 9999
        const ob = b.orden ?? 9999
        if (oa !== ob) return oa - ob
        return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
      })
    Object.assign(map, ordenPistaDesdeSchedule(buildSchedulePorCategoria(cats, porCat)))
  }
  return map
}
