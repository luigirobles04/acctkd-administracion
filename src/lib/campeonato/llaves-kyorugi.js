function nextPowerOf2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Tamaño de llave (potencia de 2) */
function bracketSizeFor(n) {
  return nextPowerOf2(n)
}

/** Orden estándar de seeds en llave (1 vs último, etc.) */
function getSeedOrder(size) {
  if (size <= 1) return [1]
  const half = getSeedOrder(size / 2)
  const out = []
  for (const s of half) {
    out.push(s)
    out.push(size + 1 - s)
  }
  return out
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function firstRoundOpponentSeed(bracketSize, seed) {
  const order = getSeedOrder(bracketSize)
  for (let i = 0; i < order.length; i += 2) {
    if (order[i] === seed) return order[i + 1]
    if (order[i + 1] === seed) return order[i]
  }
  return null
}

function academyId(p) {
  return p?.id_academia_campeonato ?? null
}

/**
 * Asigna participantes a seeds 1..n con aleatoriedad y separación de academia
 * (si alguna academia tiene >3, evita mismo club en 1.ª ronda cuando sea posible).
 */
function assignSeeds(participantes, bracketSize) {
  const n = participantes.length
  const pool = shuffleInPlace([...participantes])
  const counts = {}
  for (const p of pool) {
    const ac = academyId(p)
    if (ac) counts[ac] = (counts[ac] || 0) + 1
  }
  const needsSeparation = Object.values(counts).some((c) => c > 3)

  const seeds = {}
  for (let i = 0; i < n; i++) seeds[i + 1] = pool[i]

  if (needsSeparation) {
    for (let attempt = 0; attempt < n * 30; attempt++) {
      let conflict = false
      for (let s = 1; s <= n; s++) {
        const opp = firstRoundOpponentSeed(bracketSize, s)
        if (!opp || opp > n) continue
        const a = academyId(seeds[s])
        const b = academyId(seeds[opp])
        if (a && b && a === b) {
          conflict = true
          const swapWith = 1 + Math.floor(Math.random() * n)
          if (swapWith !== s && swapWith !== opp) {
            ;[seeds[s], seeds[swapWith]] = [seeds[swapWith], seeds[s]]
          }
        }
      }
      if (!conflict) break
    }
  }

  const arr = new Array(n + 1).fill(null)
  for (let s = 1; s <= n; s++) arr[s] = seeds[s]
  return arr
}

function buildSlots(seeds, bracketSize) {
  const order = getSeedOrder(bracketSize)
  const slots = new Array(bracketSize).fill(null)
  for (let i = 0; i < order.length; i++) {
    const seed = order[i]
    if (seed <= seeds.length - 1 && seeds[seed]) {
      slots[i] = seeds[seed]
    }
  }
  return slots
}

/** Primera ronda con máximo de peleas: empareja consecutivamente, mínimo de BYE */
function buildCompactSlots(participantes) {
  const n = participantes.length
  const bracketSize = bracketSizeFor(n)
  const fightCount = Math.floor(n / 2)
  const byeCount = n % 2
  const shuffled = shuffleInPlace([...participantes])

  // Bye al extremo inferior (convención CNU / FESTCUP)
  const byePlayers = byeCount ? [shuffled[n - 1]] : []
  let fighters = byeCount ? shuffled.slice(0, n - 1) : [...shuffled]

  const counts = {}
  for (const p of fighters) {
    const ac = academyId(p)
    if (ac) counts[ac] = (counts[ac] || 0) + 1
  }
  if (Object.values(counts).some((c) => c > 3) && fightCount >= 2) {
    for (let attempt = 0; attempt < 40; attempt++) {
      let ok = true
      for (let m = 0; m < fightCount; m++) {
        const a = academyId(fighters[m * 2])
        const b = academyId(fighters[m * 2 + 1])
        if (a && b && a === b) {
          ok = false
          const j = m * 2 + 1 + Math.floor(Math.random() * (fighters.length - m * 2 - 1))
          if (j < fighters.length) [fighters[m * 2 + 1], fighters[j]] = [fighters[j], fighters[m * 2 + 1]]
        }
      }
      if (ok) break
    }
  }

  const slots = new Array(bracketSize).fill(null)
  for (let m = 0; m < fightCount; m++) {
    slots[m * 2] = fighters[m * 2]
    slots[m * 2 + 1] = fighters[m * 2 + 1]
  }

  return { slots, bracketSize, byePlayers, fightCount }
}

function usarLlaveCompacta(n) {
  const b = bracketSizeFor(n)
  return n < b && n > 4
}

const CANCHAS_DEFAULT = 3
const COLOR_CHUNG = 'azul'
const COLOR_HONG = 'rojo'

function coloresCombate(id_linea1, id_linea2) {
  let color1 = null
  let color2 = null
  if (id_linea1) color1 = COLOR_CHUNG
  if (id_linea2) color2 = COLOR_HONG
  return { color1, color2 }
}

function parseCompetidor(l, academiaNombre) {
  if (!l) return null
  const p = l.miembros?.[0]?.perfil
  return {
    id_linea: l.id_linea,
    dorsal: l.dorsal_display || '',
    nombres: p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '',
    academia: academiaNombre || l.academia_nombre || '',
  }
}

function nombreLinea(l) {
  if (!l) return 'BYE'
  const m = l.miembros?.[0]?.perfil
  if (!m) return l.dorsal_display || `#${l.id_linea}`
  return `${l.dorsal_display || ''} ${m.nombres || ''} ${m.apellidos || ''}`.trim()
}

async function batchUpdateCanchas(sb, rows) {
  const CHUNK = 40
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    await Promise.all(
      slice.map(({ id_llave, cancha, orden_pista }) =>
        sb.from('llave_kyorugi').update({ cancha, orden_pista }).eq('id_llave', id_llave)
      )
    )
  }
}

/** Combates de una categoría ordenados: primero ronda más alta, luego match_numero */
function combatesOrdenados(lista) {
  return (lista || [])
    .filter((c) => c.estado !== 'vacío')
    .sort((a, b) => {
      if (b.ronda !== a.ronda) return b.ronda - a.ronda
      return a.match_numero - b.match_numero
    })
}

/** Intercala combates de categorías pareadas (ej. -67 kg y +67 kg) para dar descanso */
function intercalarParejas(categorias, porCat) {
  const resultado = []
  for (let i = 0; i < categorias.length; i += 2) {
    const a = categorias[i]
    const b = categorias[i + 1]
    const ca = combatesOrdenados(porCat[a.id_categoria])
    const cb = b ? combatesOrdenados(porCat[b.id_categoria]) : []
    const max = Math.max(ca.length, cb.length)
    for (let j = 0; j < max; j++) {
      if (ca[j]) resultado.push({ combate: ca[j], categoria: a })
      if (cb[j]) resultado.push({ combate: cb[j], categoria: b })
    }
  }
  return resultado
}

/** Toda una categoría en la misma cancha; parejas intercaladas 1→2→3→1… */
export async function asignarCanchasCampeonato(sb, idCampeonato, numCanchas = CANCHAS_DEFAULT) {
  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, orden, nombre')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const { data: llaves, error } = await sb
    .from('llave_kyorugi')
    .select('id_llave, ronda, match_numero, estado, id_categoria')
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'vacío')
  if (error) throw error

  const porCat = {}
  for (const l of llaves || []) {
    if (!porCat[l.id_categoria]) porCat[l.id_categoria] = []
    porCat[l.id_categoria].push(l)
  }

  const catsConLlave = (categorias || []).filter((c) => (porCat[c.id_categoria]?.length || 0) > 0)

  const porCancha = Array.from({ length: numCanchas }, () => [])
  catsConLlave.forEach((cat, ci) => {
    porCancha[ci % numCanchas].push(cat)
  })

  const resumen = []
  const updates = []

  for (let n = 0; n < numCanchas; n++) {
    const catsEnCancha = porCancha[n]
    const secuencia = intercalarParejas(catsEnCancha, porCat)
    const conteoCat = {}
    let ordenCancha = 1  // numeración secuencial dentro de cada cancha

    for (const { combate, categoria } of secuencia) {
      updates.push({ id_llave: combate.id_llave, cancha: n + 1, orden_pista: ordenCancha })
      conteoCat[categoria.id_categoria] = (conteoCat[categoria.id_categoria] || 0) + 1
      ordenCancha++
    }

    for (const cat of catsEnCancha) {
      resumen.push({
        categoria: cat.nombre,
        cancha: n + 1,
        combates: conteoCat[cat.id_categoria] || 0,
      })
    }
  }

  if (updates.length) await batchUpdateCanchas(sb, updates)

  return { asignados: llaves?.length || 0, canchas: numCanchas, porCategoria: resumen }
}

export async function generarLlaveCategoria(sb, idCampeonato, idCategoria, { asignarCanchas = true } = {}) {
  const { data: cat } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, modalidad')
    .eq('id_categoria', idCategoria)
    .eq('id_campeonato', idCampeonato)
    .single()
  if (!cat) throw new Error('Categoría no encontrada')
  if (cat.modalidad !== 'kyorugi') throw new Error('Solo categorías kyorugi')

  const { data: lineas, error } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, dorsal_display, dorsal_numero, id_academia_campeonato,
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
    `)
    .eq('id_campeonato', idCampeonato)
    .eq('id_categoria', idCategoria)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if (error) throw error

  const participantes = lineas || []
  if (participantes.length < 2) {
    throw new Error(`Se necesitan al menos 2 competidores con dorsal (hay ${participantes.length})`)
  }

  await sb.from('llave_kyorugi').delete().eq('id_categoria', idCategoria)

  const n = participantes.length
  const compacta = usarLlaveCompacta(n)
  let bracketSize
  let slots
  let byePlayers = []

  if (compacta) {
    const built = buildCompactSlots(participantes)
    bracketSize = built.bracketSize
    slots = built.slots
    byePlayers = built.byePlayers
  } else {
    bracketSize = bracketSizeFor(n)
    const seeds = assignSeeds(participantes, bracketSize)
    slots = buildSlots(seeds, bracketSize)
  }

  const numRondas = Math.log2(bracketSize)

  const estructura = []
  for (let r = numRondas; r >= 1; r--) {
    estructura.push({ ronda: r, count: 2 ** (r - 1) })
  }

  // Preparar todas las filas para batch insert
  const rowsToInsert = []
  const rowMetaByRondaMatch = {}  // key: `${ronda}_${m}` → row index in rowsToInsert

  for (let ri = 0; ri < estructura.length; ri++) {
    const { ronda, count } = estructura[ri]
    for (let m = 1; m <= count; m++) {
      let id_linea1 = null
      let id_linea2 = null
      let es_bye = false
      let ganador_id_linea = null
      let estado = 'pendiente'

      if (ri === 0) {
        const p1 = slots[(m - 1) * 2]
        const p2 = slots[(m - 1) * 2 + 1]
        id_linea1 = p1?.id_linea || null
        id_linea2 = p2?.id_linea || null

        if (p1 && !p2) {
          es_bye = true
          ganador_id_linea = p1.id_linea
          estado = 'saltado'
        } else if (!p1 && p2) {
          es_bye = true
          id_linea1 = p2.id_linea
          id_linea2 = null
          ganador_id_linea = p2.id_linea
          estado = 'saltado'
        } else if (!p1 && !p2) {
          estado = 'vacío'
        }
      }

      const { color1, color2 } = coloresCombate(id_linea1, id_linea2)
      const rowIdx = rowsToInsert.length
      rowsToInsert.push({ id_campeonato: idCampeonato, id_categoria: idCategoria, ronda, match_numero: m, id_linea1, id_linea2, es_bye, ganador_id_linea, estado, color1, color2 })
      rowMetaByRondaMatch[`${ronda}_${m}`] = { ri, mi: m - 1, rowIdx }
    }
  }

  // Batch insert — un solo round-trip
  const { data: inserted, error: errI } = await sb.from('llave_kyorugi').insert(rowsToInsert).select('id_llave, ronda, match_numero')
  if (errI) throw errI

  // Construir map ronda→match_numero→id_llave de los registros insertados
  const idMap = {}
  for (const row of inserted || []) {
    idMap[`${row.ronda}_${row.match_numero}`] = row.id_llave
  }

  const idsPorRonda = estructura.map(({ ronda, count }) =>
    Array.from({ length: count }, (_, mi) => idMap[`${ronda}_${mi + 1}`]).filter(Boolean)
  )

  // Computar siguiente_llave y propagar bye-advances en paralelo
  const sigUpdates = []
  const byeAdvances = []

  for (let ri = 0; ri < idsPorRonda.length - 1; ri++) {
    for (let mi = 0; mi < idsPorRonda[ri].length; mi++) {
      const idActual = idsPorRonda[ri][mi]
      const idSiguiente = idsPorRonda[ri + 1]?.[Math.floor(mi / 2)]
      if (!idActual || !idSiguiente) continue
      sigUpdates.push(sb.from('llave_kyorugi').update({ siguiente_llave: idSiguiente }).eq('id_llave', idActual))

      const row = rowsToInsert[rowMetaByRondaMatch[`${estructura[ri].ronda}_${mi + 1}`]?.rowIdx]
      if (row?.ganador_id_linea) {
        const g = row.ganador_id_linea
        const isFirst = mi % 2 === 0
        const advPatch = isFirst
          ? { id_linea1: g, color1: g === row.id_linea1 ? row.color1 : row.color2 }
          : { id_linea2: g, color2: g === row.id_linea1 ? row.color1 : row.color2 }
        byeAdvances.push(sb.from('llave_kyorugi').update(advPatch).eq('id_llave', idSiguiente))
      }
    }
  }

  await Promise.all([...sigUpdates, ...byeAdvances])

  if (compacta && byePlayers.length === 1 && idsPorRonda.length >= 2) {
    const bye = byePlayers[0]
    const sfIds = idsPorRonda[idsPorRonda.length - 2]
    const idSfBye = sfIds[sfIds.length - 1]
    await sb.from('llave_kyorugi').update({ id_linea1: bye.id_linea, color1: COLOR_CHUNG, id_linea2: null, estado: 'pendiente', es_bye: true }).eq('id_llave', idSfBye)
  }

  if (asignarCanchas) await asignarCanchasCampeonato(sb, idCampeonato)

  return {
    categoria: cat.nombre,
    participantes: participantes.length,
    combates: idsPorRonda.flat().length,
    rondas: numRondas,
    tamanoLlave: bracketSize,
  }
}

export async function generarTodasLasLlaves(sb, idCampeonato, { idsCategorias = null } = {}) {
  const qCats = sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (idsCategorias?.length) qCats.in('id_categoria', idsCategorias)

  const { data: categorias, error } = await qCats
  if (error) throw error

  const { data: lineasInscritas, error: errL } = await sb
    .from('linea_inscripcion')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if (errL) throw errL

  const inscritosPorCat = (lineasInscritas || []).reduce((acc, l) => {
    if (l.id_categoria) acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1
    return acc
  }, {})

  const resultados = []
  const errores = []

  for (const cat of categorias || []) {
    if ((inscritosPorCat[cat.id_categoria] || 0) < 2) continue

    try {
      const r = await generarLlaveCategoria(sb, idCampeonato, cat.id_categoria, { asignarCanchas: false })
      resultados.push({ id_categoria: cat.id_categoria, nombre: cat.nombre, ...r })
    } catch (e) {
      errores.push({ id_categoria: cat.id_categoria, nombre: cat.nombre, error: e.message })
    }
  }

  if (resultados.length) await asignarCanchasCampeonato(sb, idCampeonato)

  return { generadas: resultados.length, resultados, errores }
}

export async function registrarGanadorCombate(sb, idLlave, ganadorIdLinea, { puntaje1, puntaje2 } = {}) {
  const id = Number(idLlave)
  if (!id) throw new Error('ID de combate inválido')

  const { data: match, error } = await sb.from('llave_kyorugi').select('*').eq('id_llave', id).maybeSingle()
  if (error || !match) throw new Error('Combate no encontrado')
  if (match.estado === 'vacío') throw new Error('Combate vacío')
  if (match.estado === 'saltado') throw new Error('Este combate no requiere resultado')

  const g = Number(ganadorIdLinea)
  if (g !== match.id_linea1 && g !== match.id_linea2) {
    throw new Error('El ganador debe ser uno de los competidores del combate')
  }
  if (!match.id_linea1 || !match.id_linea2) {
    throw new Error('Espera a que ambos competidores estén definidos')
  }

  const p1 = puntaje1 != null ? Number(puntaje1) : 0
  const p2 = puntaje2 != null ? Number(puntaje2) : 0

  await sb
    .from('llave_kyorugi')
    .update({
      ganador_id_linea: g,
      estado: 'finalizado',
      puntaje1: p1,
      puntaje2: p2,
    })
    .eq('id_llave', id)

  if (match.siguiente_llave) {
    const { data: sig } = await sb.from('llave_kyorugi').select('*').eq('id_llave', match.siguiente_llave).maybeSingle()
    if (sig) {
      const patch = {}
      const colorGanador = g === match.id_linea1 ? match.color1 : match.color2
      if (!sig.id_linea1) {
        patch.id_linea1 = g
        patch.color1 = colorGanador || COLOR_CHUNG
      } else if (!sig.id_linea2 && sig.id_linea1 !== g) {
        patch.id_linea2 = g
        patch.color2 = colorGanador || COLOR_HONG
      }
      if (Object.keys(patch).length) {
        await sb.from('llave_kyorugi').update(patch).eq('id_llave', match.siguiente_llave)
      }
    }
  }

  // Semifinal con bye: al cerrar la SF real, el bye pasa a la final
  if (match.ronda === 2 && match.siguiente_llave) {
    const { data: fin } = await sb.from('llave_kyorugi').select('*').eq('id_llave', match.siguiente_llave).maybeSingle()
    const { data: siblings } = await sb
      .from('llave_kyorugi')
      .select('*')
      .eq('id_categoria', match.id_categoria)
      .eq('ronda', 2)
    const byeSf = (siblings || []).find((s) => s.id_llave !== id && s.es_bye && (s.id_linea1 || s.id_linea2))
    if (fin && byeSf) {
      const byeId = byeSf.id_linea1 || byeSf.id_linea2
      const byeColor = byeSf.id_linea1 === byeId ? byeSf.color1 : byeSf.color2
      const patch = {}
      if (fin.id_linea1 && !fin.id_linea2 && fin.id_linea1 !== byeId) {
        patch.id_linea2 = byeId
        patch.color2 = byeColor || COLOR_HONG
      } else if (fin.id_linea2 && !fin.id_linea1 && fin.id_linea2 !== byeId) {
        patch.id_linea1 = byeId
        patch.color1 = byeColor || COLOR_CHUNG
      }
      if (Object.keys(patch).length) {
        await sb.from('llave_kyorugi').update(patch).eq('id_llave', fin.id_llave)
      }
    }
  }

  return { ok: true, id_llave: id, ganador_id_linea: g }
}

export {
  nombreLinea,
  parseCompetidor,
  nextPowerOf2,
  bracketSizeFor,
  getSeedOrder,
  firstRoundOpponentSeed,
  assignSeeds,
  buildSlots,
  buildCompactSlots,
  usarLlaveCompacta,
  CANCHAS_DEFAULT,
}
