/** Combates activos ordenados: ronda más alta primero, luego match_numero. */
export function combatesOrdenados(lista) {
  return (lista || [])
    .filter((c) => c.estado !== 'vacío')
    .sort((a, b) => {
      if (b.ronda !== a.ronda) return b.ronda - a.ronda
      return a.match_numero - b.match_numero
    })
}

/** Combates reales (sin bye/saltado) para numeración y pista. */
export function combatesPeleables(lista) {
  return combatesOrdenados(lista).filter(
    (c) => !c.es_bye && c.estado !== 'saltado' && c.estado !== 'bye'
  )
}

export function esFinal(combate) {
  return combate?.ronda === 1
}

/** Intercala combates de categorías pareadas (ej. -67 kg y +67 kg). */
export function intercalarParejas(categorias, porCat, { soloPreFinal = false } = {}) {
  const resultado = []
  for (let i = 0; i < categorias.length; i += 2) {
    const a = categorias[i]
    const b = categorias[i + 1]
    const ca = combatesOrdenados(porCat[a.id_categoria]).filter((c) => !soloPreFinal || !esFinal(c))
    const cb = b
      ? combatesOrdenados(porCat[b.id_categoria]).filter((c) => !soloPreFinal || !esFinal(c))
      : []
    const max = Math.max(ca.length, cb.length)
    for (let j = 0; j < max; j++) {
      if (ca[j]) resultado.push({ combate: ca[j], categoria: a })
      if (cb[j]) resultado.push({ combate: cb[j], categoria: b })
    }
  }
  return resultado
}

/**
 * Programación híbrida por área:
 * - Pre-finales intercalados entre categorías
 * - Finales al final, con ≥1 combate de otra categoría antes de cada final
 */
export function buildScheduleHibrido(categorias, porCat) {
  const preFinalSeq = intercalarParejas(categorias, porCat, { soloPreFinal: true })
  const schedule = preFinalSeq.map((x) => x.combate)

  const finals = []
  for (const cat of categorias) {
    for (const c of combatesOrdenados(porCat[cat.id_categoria])) {
      if (esFinal(c)) finals.push({ combate: c, categoria: cat })
    }
  }

  const pending = [...finals]
  let guard = 0
  while (pending.length && guard++ < 5000) {
    let placed = false
    for (let i = 0; i < pending.length; i++) {
      const { combate, categoria } = pending[i]
      const catId = categoria.id_categoria
      const lastIdx = schedule.map((c, idx) => (c.id_categoria === catId ? idx : -1)).reduce((a, b) => Math.max(a, b), -1)
      const lastFight = schedule.length ? schedule[schedule.length - 1] : null
      const gapOk = !lastFight || lastFight.id_categoria !== catId
      const preFinalDone = lastIdx >= 0 || !preFinalSeq.some((x) => x.categoria.id_categoria === catId)

      if (preFinalDone && gapOk) {
        schedule.push(combate)
        pending.splice(i, 1)
        placed = true
        break
      }
    }
    if (!placed) {
      schedule.push(pending.shift().combate)
    }
  }

  return schedule
}

/**
 * Programación por bloques de categoría:
 * termina todos los combates de una categoría antes de pasar a la siguiente.
 * Numeración seguida 1, 2, 3… (pre-finales y final sin hueco).
 */
export function buildSchedulePorCategoria(categorias, porCat) {
  const schedule = []
  for (const cat of categorias) {
    const combates = combatesPeleables(porCat[cat.id_categoria])
    schedule.push(...combates)
  }
  return schedule
}
