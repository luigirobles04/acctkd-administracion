
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
 * Orden de salida seguido; la numeración en pista reserva 1 combate de descanso antes de cada final.
 */
export function buildSchedulePorCategoria(categorias, porCat) {
  const schedule = []
  for (const cat of categorias) {
    const combates = combatesPeleables(porCat[cat.id_categoria])
    schedule.push(...combates)
  }
  return schedule
}

function soloFinalPendiente(list) {
  return list.length === 1 && esFinal(list[0])
}

function cabezaEsFinal(list) {
  return list.length > 0 && esFinal(list[0])
}

/** Mejor combate ajeno para descanso: preferir final directa (2 inscritos, 1 pelea). */
function elegirColaBuffer(otros) {
  if (!otros?.length) return null
  const score = (q) => {
    if (soloFinalPendiente(q.list)) return 0
    if (!cabezaEsFinal(q.list)) return 1
    return 2
  }
  return [...otros].sort((a, b) => {
    const d = score(a) - score(b)
    if (d !== 0) return d
    if (a.list.length !== b.list.length) return a.list.length - b.list.length
    return compararColaCategoria(a, b)
  })[0]
}

function compararColaCategoria(a, b) {
  const oa = a.catOrden ?? 9999
  const ob = b.catOrden ?? 9999
  if (oa !== ob) return oa - ob
  return (a.catId ?? 0) - (b.catId ?? 0)
}

/**
 * Orden para numeración en pista:
 * - Pre-finales repartidos entre categorías (round-robin).
 * - Tras el último pre-final de una categoría, **un solo** combate ajeno y luego su final (no enfriar al ganador).
 */
export function buildScheduleNumeracionIntercalada(categorias, porCat) {
  const queues = (categorias || []).map((cat) => ({
    catId: cat.id_categoria,
    catOrden: cat.orden ?? 9999,
    list: [...combatesPeleables(porCat[cat.id_categoria])],
  }))

  const schedule = []
  let guard = 0
  /** Cola FIFO: cada categoría que terminó pre-finales espera 1 combate ajeno y su final. */
  const finalesUrgentes = []

  function encolarFinalUrgente(catId) {
    if (!finalesUrgentes.includes(catId)) finalesUrgentes.push(catId)
  }

  function marcarSiQuedaSoloFinal(q, { usadoComoBuffer = false } = {}) {
    if (!usadoComoBuffer && soloFinalPendiente(q.list)) encolarFinalUrgente(q.catId)
  }

  function reescanearFinalesUrgentes() {
    for (const q of queues) {
      if (q.list.length && soloFinalPendiente(q.list)) encolarFinalUrgente(q.catId)
    }
  }

  while (queues.some((q) => q.list.length) && guard++ < 10000) {
    const last = schedule[schedule.length - 1] ?? null
    const lastCat = last?.id_categoria ?? null
    const activas = queues.filter((q) => q.list.length)

    if (finalesUrgentes.length) {
      const catId = finalesUrgentes[0]
      const qFin = activas.find((q) => q.catId === catId && soloFinalPendiente(q.list))
      if (!qFin) {
        finalesUrgentes.shift()
        continue
      }
      if (lastCat === catId) {
        const otros = activas.filter((q) => q.catId !== catId)
        const pick = elegirColaBuffer(otros)
        if (pick) {
          schedule.push(pick.list.shift())
          marcarSiQuedaSoloFinal(pick, { usadoComoBuffer: true })
          continue
        }
        schedule.push(qFin.list.shift())
        finalesUrgentes.shift()
        reescanearFinalesUrgentes()
        continue
      }
      schedule.push(qFin.list.shift())
      finalesUrgentes.shift()
      reescanearFinalesUrgentes()
      continue
    }

    const elegibles = activas.filter((q) => !(cabezaEsFinal(q.list) && lastCat === q.catId))
    const conPre = elegibles.filter((q) => !cabezaEsFinal(q.list))
    const minPreOrden = conPre.length ? Math.min(...conPre.map((q) => q.catOrden)) : Infinity
    const solosAntes = elegibles.filter(
      (q) => soloFinalPendiente(q.list) && q.catOrden < minPreOrden,
    )
    let pool = solosAntes.length ? solosAntes : conPre.length ? conPre : elegibles

    if (pool.length) {
      pool.sort(compararColaCategoria)
      const pick = pool.find((q) => q.catId !== lastCat) || pool[0]
      schedule.push(pick.list.shift())
      marcarSiQuedaSoloFinal(pick)
      continue
    }

    const q0 = activas[0]
    if (q0) {
      schedule.push(q0.list.shift())
      marcarSiQuedaSoloFinal(q0)
    }
  }

  return schedule
}

/** Numeración densa 1, 2, 3… según la secuencia intercalada (sin números omitidos). */
export function ordenPistaDesdeSchedule(schedule) {
  const map = {}
  let n = 0
  for (const combate of schedule || []) {
    n += 1
    map[combate.id_llave] = n
  }
  return map
}

function compararCategoriaExport(a, b) {
  const oa = a.orden ?? 9999
  const ob = b.orden ?? 9999
  if (oa !== ob) return oa - ob
  return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
}

/** Misma ronda o misma distancia a la final → misma “fase” (8vos / 4tos / semi / final). */
function faseKey(combate) {
  const r = Number(combate?.ronda)
  return Number.isFinite(r) ? r : 0
}

/**
 * Bloques consecutivos de categorías con 4–5 inscritos (misma área): numerar por fases
 * (primero todos los combates de la ronda más lejana, luego la siguiente…) antes de volver al intercalado.
 */
export function buildScheduleNumeracionPorFases(categorias, porCat, inscritosPorCat) {
  const sorted = [...(categorias || [])].sort(compararCategoriaExport)
  const blocks = []
  let cur = []
  let prevIdx = -2
  for (let i = 0; i < sorted.length; i++) {
    const cat = sorted[i]
    const n = inscritosPorCat?.[cat.id_categoria]
    const inBlock = n != null && n >= 4 && n <= 5
    if (!inBlock) {
      if (cur.length) {
        blocks.push(cur)
        cur = []
      }
      prevIdx = -2
      continue
    }
    if (!cur.length) {
      cur.push(cat)
    } else if (prevIdx === i - 1) {
      cur.push(cat)
    } else {
      blocks.push(cur)
      cur = [cat]
    }
    prevIdx = i
  }
  if (cur.length) blocks.push(cur)

  const schedule = []
  for (const block of blocks) {
    const listas = block.map((cat) => combatesPeleables(porCat[cat.id_categoria]))
    const maxR = listas.reduce((m, L) => {
      const mx = L.reduce((a, c) => Math.max(a, faseKey(c)), 0)
      return Math.max(m, mx)
    }, 0)
    for (let r = maxR; r >= 1; r--) {
      for (let bi = 0; bi < block.length; bi++) {
        for (const c of listas[bi]) {
          if (faseKey(c) === r) schedule.push(c)
        }
      }
    }
  }
  const blockIds = new Set(blocks.flat().map((c) => c.id_categoria))
  const rest = sorted.filter((c) => !blockIds.has(c.id_categoria))
  const porRest = {}
  for (const cat of rest) porRest[cat.id_categoria] = porCat[cat.id_categoria]
  schedule.push(...buildScheduleNumeracionIntercalada(rest, porRest))
  return schedule
}

/** Combates planos desde porRonda { [ronda]: combate[] }. */
export function combatesDesdePorRonda(porRonda) {
  const lista = []
  for (const r of Object.keys(porRonda || {})) {
    for (const m of porRonda[r] || []) {
      if (m.ronda == null) m.ronda = Number(r)
      lista.push(m)
    }
  }
  return lista
}

/**
 * Asigna orden_pista por área (intercalado entre categorías + hueco antes de final).
 * Muta porRonda in-place (sin bye/saltado/vacío).
 */
export function asignarOrdenPistaPorCancha(categorias, { getCancha = (c) => c.cancha ?? 1 } = {}) {
  const porCat = {}
  const canchaPorCat = {}
  for (const cat of categorias || []) {
    const id = cat.id_categoria
    canchaPorCat[id] = Number(getCancha(cat)) || 1
    porCat[id] = combatesPeleables(combatesDesdePorRonda(cat.porRonda))
  }
  const byCancha = new Map()
  for (const cat of categorias || []) {
    const k = canchaPorCat[cat.id_categoria] || 1
    if (!byCancha.has(k)) byCancha.set(k, [])
    byCancha.get(k).push(cat)
  }
  const map = {}
  for (const cats of byCancha.values()) {
    cats.sort(compararCategoriaExport)
    Object.assign(map, ordenPistaDesdeSchedule(buildScheduleNumeracionIntercalada(cats, porCat)))
  }
  for (const cat of categorias || []) {
    for (const c of combatesPeleables(combatesDesdePorRonda(cat.porRonda))) {
      if (map[c.id_llave] != null) c.orden_pista = map[c.id_llave]
    }
  }
}
