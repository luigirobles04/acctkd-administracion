import {
  buildScheduleNumeracionIntercalada,
  ordenPistaDesdeSchedule,
} from '@/lib/campeonato/schedule-canchas'

/** Combates exportables en llave (no vacío/bye). */
export function combateEnLlave(c) {
  return c && !['vacío', 'bye'].includes(c.estado) && !c.es_bye
}

export { ordenPistaDesdeSchedule }

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
 * Pre-finales repartidos; 1 combate ajeno y final (numeración 1, 2, 3… sin saltos).
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
    const schedule = buildScheduleNumeracionIntercalada(cats, porCat)
    Object.assign(map, ordenPistaDesdeSchedule(schedule))
  }
  return map
}
