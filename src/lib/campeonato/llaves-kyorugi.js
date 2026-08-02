import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'
import { lineaAptaParaLlave, PESAJE_ESTADOS_APTOS_LLAVE } from '@/lib/campeonato/pesaje'

const SELECT_LINEA_LLAVE = `
  id_linea, id_categoria, dorsal_display, dorsal_numero, id_academia_campeonato, pesaje_estado,
  miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
`

export async function campeonatoLlavesSinPesaje(sb, idCampeonato) {
  const { data } = await sb
    .from('campeonato')
    .select('llaves_sin_pesaje')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  return Boolean(data?.llaves_sin_pesaje)
}

function queryLineasKyorugiLlave(sb, idCampeonato, { idCategoria, omitirPesaje } = {}) {
  let q = sb
    .from('linea_inscripcion')
    .select(SELECT_LINEA_LLAVE)
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if (idCategoria) q = q.eq('id_categoria', idCategoria)
  if (!omitirPesaje) q = q.in('pesaje_estado', PESAJE_ESTADOS_APTOS_LLAVE)
  return q
}

/** Conteos por categoría: inscritos con dorsal vs aptos tras pesaje */
export async function conteosKyorugiLlave(sb, idCampeonato, omitirPesaje = false) {
  const { data: lineas, error } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, pesaje_estado')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  if (error) throw error

  const inscritosPorCat = {}
  const aptosPorCat = {}
  for (const l of lineas || []) {
    if (!l.id_categoria) continue
    inscritosPorCat[l.id_categoria] = (inscritosPorCat[l.id_categoria] || 0) + 1
    if (lineaAptaParaLlave(l.pesaje_estado, { omitirPesaje })) {
      aptosPorCat[l.id_categoria] = (aptosPorCat[l.id_categoria] || 0) + 1
    }
  }
  return { inscritosPorCat, aptosPorCat }
}

async function mensajeMinimoParticipantes(sb, idCampeonato, idCategoria, aptos, omitirPesaje) {
  if (aptos >= 2) return null
  if (omitirPesaje) {
    return `Se necesitan al menos 2 competidores con dorsal (hay ${aptos})`
  }
  const { data: todas } = await sb
    .from('linea_inscripcion')
    .select('id_linea')
    .eq('id_campeonato', idCampeonato)
    .eq('id_categoria', idCategoria)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  const inscritos = (todas || []).length
  const faltan = Math.max(0, inscritos - aptos)
  if (inscritos >= 2 && aptos < 2) {
    return `Se necesitan al menos 2 con pesaje OK (aptos: ${aptos}, inscritos: ${inscritos}${faltan ? `, faltan ${faltan} por pesar` : ''})`
  }
  return `Se necesitan al menos 2 competidores con pesaje OK (aptos: ${aptos})`
}

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

/**
 * Llave de 8 slots — layout posicional WT/CNU (tournamentmgr 6-team).
 *
 *   s1 (bye) ───────────── SF1
 *   s2 ──┐
 *        ├─ QF1 ──────────┘
 *   s3 ──┘
 *   s4 ──┐
 *        ├─ QF2 ──────┐
 *   s5 ──┘            ├─ SF2
 *   s6 (bye) ─────────┘
 */
function buildSlotsCnu6(seeds) {
  const slots = new Array(8).fill(null)
  slots[0] = seeds[1] ?? null
  slots[2] = seeds[2] ?? null
  slots[3] = seeds[3] ?? null
  slots[4] = seeds[4] ?? null
  slots[5] = seeds[5] ?? null
  slots[6] = seeds[6] ?? null
  return slots
}

/**
 * Llave de 8 slots — layout posicional WT/CNU (tournamentmgr 7-team).
 *
 *   s1 (bye) ───────────── SF1
 *   s2 ──┐
 *        ├─ QF1 ──────────┘
 *   s3 ──┘
 *   s4 ──┐
 *        ├─ QF2 ──┐
 *   s5 ──┘        ├─ SF2 ── FINAL
 *   s6 ──┐        │
 *        ├─ QF3 ──┘
 *   s7 ──┘
 */
function buildSlotsCnu7(seeds) {
  const slots = new Array(8).fill(null)
  slots[0] = seeds[1] ?? null
  slots[2] = seeds[2] ?? null
  slots[3] = seeds[3] ?? null
  slots[4] = seeds[4] ?? null
  slots[5] = seeds[5] ?? null
  slots[6] = seeds[6] ?? null
  slots[7] = seeds[7] ?? null
  return slots
}

/** Parejas de cuartos (índices de slot 0..7) para llave de 8. */
export function qfPairsFromSlots(slots) {
  const pairs = []
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push([slots[i] ?? null, slots[i + 1] ?? null])
  }
  return pairs
}

/** Coloca participantes en slots según estándar CNU (siempre llave potencia de 2). */
function buildSlotsCnu(seeds, n) {
  const bracketSize = bracketSizeFor(n)
  if (n === 6) return buildSlotsCnu6(seeds)
  if (n === 7) return buildSlotsCnu7(seeds)
  return buildSlots(seeds, bracketSize)
}

/** @deprecated Llave compacta — ya no se usa; CNU siempre usa llave estándar. */
function buildCompactSlots(participantes) {
  const n = participantes.length
  const bracketSize = bracketSizeFor(n)
  const seeds = assignSeeds(participantes, bracketSize)
  const slots = buildSlotsCnu(seeds, n)
  return { slots, bracketSize, byePlayers: [], fightCount: Math.floor(n / 2) }
}

/** @deprecated Siempre false — CNU usa llave estándar para todos los tamaños. */
function usarLlaveCompacta() {
  return false
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

function parseCompetidor(l, academiaNombre, academiaLogoUrl = null) {
  if (!l) return null
  const p = l.miembros?.[0]?.perfil
  return {
    id_linea: l.id_linea,
    dorsal: l.dorsal_display || '',
    nombres: p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '',
    academia: academiaNombre || l.academia_nombre || '',
    academia_logo: academiaLogoUrl || l.academia_logo_url || '',
    foto: fotoCompetidorProxyUrl(p?.foto_url),
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

/** Garantiza orden_pista 1…N único por cancha antes de persistir. */
function normalizarUpdatesOrdenPista(updates) {
  const byCancha = new Map()
  for (const u of updates) {
    const k = Number(u.cancha) || 1
    if (!byCancha.has(k)) byCancha.set(k, [])
    byCancha.get(k).push({ ...u })
  }
  const out = []
  for (const rows of byCancha.values()) {
    rows.sort((a, b) => (a.orden_pista ?? 9999) - (b.orden_pista ?? 9999) || (a.id_llave || 0) - (b.id_llave || 0))
    rows.forEach((r, i) => out.push({ ...r, orden_pista: i + 1 }))
  }
  return out
}

import { buildSchedulePorCategoria } from '@/lib/campeonato/schedule-canchas'

/** Toda una categoría en la misma cancha; parejas intercaladas 1→2→3→1… */
export async function asignarCanchasCampeonato(sb, idCampeonato, numCanchas = CANCHAS_DEFAULT) {
  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, orden, nombre')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const llaves = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('llave_kyorugi')
      .select('id_llave, ronda, match_numero, estado, id_categoria')
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'vacío')
      .order('id_llave', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    llaves.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

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
  let updates = []

  for (let n = 0; n < numCanchas; n++) {
    const catsEnCancha = porCancha[n]
    const secuencia = buildSchedulePorCategoria(catsEnCancha, porCat)
    const conteoCat = {}
    let ordenCancha = 1

    for (const combate of secuencia) {
      updates.push({ id_llave: combate.id_llave, cancha: n + 1, orden_pista: ordenCancha })
      conteoCat[combate.id_categoria] = (conteoCat[combate.id_categoria] || 0) + 1
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

  if (updates.length) {
    updates = normalizarUpdatesOrdenPista(updates)
    await batchUpdateCanchas(sb, updates)
  }

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

  const omitirPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)
  const { data: lineas, error } = await queryLineasKyorugiLlave(sb, idCampeonato, {
    idCategoria,
    omitirPesaje,
  })
  if (error) throw error

  const participantes = lineas || []
  if (participantes.length < 2) {
    const msg = await mensajeMinimoParticipantes(sb, idCampeonato, idCategoria, participantes.length, omitirPesaje)
    throw new Error(msg)
  }

  await sb.from('llave_kyorugi').delete().eq('id_categoria', idCategoria)

  const n = participantes.length
  const bracketSize = bracketSizeFor(n)
  const seeds = assignSeeds(participantes, bracketSize)
  const slots = buildSlotsCnu(seeds, n)

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

      let color1 = null
      let color2 = null

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
        } else {
          ;({ color1, color2 } = coloresCombate(id_linea1, id_linea2))
        }
        if (es_bye) color1 = (m - 1) % 2 === 0 ? COLOR_CHUNG : COLOR_HONG
      } else {
        ;({ color1, color2 } = coloresCombate(id_linea1, id_linea2))
      }
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
  const omitirPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)
  const qCats = sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (idsCategorias?.length) qCats.in('id_categoria', idsCategorias)

  const { data: categorias, error } = await qCats
  if (error) throw error

  const { aptosPorCat } = await conteosKyorugiLlave(sb, idCampeonato, omitirPesaje)

  const resultados = []
  const errores = []

  for (const cat of categorias || []) {
    if ((aptosPorCat[cat.id_categoria] || 0) < 2) continue

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

export async function registrarGanadorCombate(sb, idLlave, ganadorIdLinea, { puntaje1, puntaje2, motivoResultado } = {}) {
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

  // Idempotente: Unity/PSS reintenta sync sin volver a avanzar el bracket.
  if (match.estado === 'finalizado') {
    if (Number(match.ganador_id_linea) === g) {
      return {
        ok: true,
        id_llave: id,
        ganador_id_linea: g,
        motivo_resultado: match.motivo_resultado || motivoResultado || 'normal',
        idempotent: true,
      }
    }
    throw new Error('Combate ya finalizado con otro ganador')
  }

  const p1 = puntaje1 != null ? Number(puntaje1) : 0
  const p2 = puntaje2 != null ? Number(puntaje2) : 0
  const motivo = motivoResultado || 'normal'

  // Guard anti-carrera: solo finaliza si nadie lo finalizó entre la lectura y este write.
  const { data: finalizadoAhora } = await sb
    .from('llave_kyorugi')
    .update({
      ganador_id_linea: g,
      estado: 'finalizado',
      puntaje1: p1,
      puntaje2: p2,
      motivo_resultado: motivo,
    })
    .eq('id_llave', id)
    .neq('estado', 'finalizado')
    .select('id_llave')

  if (!finalizadoAhora?.length) {
    // Otro proceso finalizó primero: validar coherencia del ganador.
    const { data: actual } = await sb.from('llave_kyorugi').select('ganador_id_linea, motivo_resultado').eq('id_llave', id).maybeSingle()
    if (actual && Number(actual.ganador_id_linea) === g) {
      return { ok: true, id_llave: id, ganador_id_linea: g, motivo_resultado: actual.motivo_resultado || motivo, idempotent: true }
    }
    throw new Error('Combate ya finalizado con otro ganador')
  }

  if (match.siguiente_llave) {
    const { data: sig } = await sb.from('llave_kyorugi').select('*').eq('id_llave', match.siguiente_llave).maybeSingle()
    if (sig && sig.id_linea1 !== g && sig.id_linea2 !== g) {
      if (!sig.id_linea1) {
        // .is(null) evita pisar un slot llenado por otro proceso en paralelo.
        const { data: upd } = await sb
          .from('llave_kyorugi')
          .update({ id_linea1: g, color1: COLOR_CHUNG })
          .eq('id_llave', match.siguiente_llave)
          .is('id_linea1', null)
          .select('id_llave')
        if (!upd?.length && !sig.id_linea2) {
          await sb
            .from('llave_kyorugi')
            .update({ id_linea2: g, color2: COLOR_HONG })
            .eq('id_llave', match.siguiente_llave)
            .is('id_linea2', null)
            .neq('id_linea1', g)
        }
      } else if (!sig.id_linea2) {
        await sb
          .from('llave_kyorugi')
          .update({ id_linea2: g, color2: COLOR_HONG })
          .eq('id_llave', match.siguiente_llave)
          .is('id_linea2', null)
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
        patch.color2 = COLOR_HONG
      } else if (fin.id_linea2 && !fin.id_linea1 && fin.id_linea2 !== byeId) {
        patch.id_linea1 = byeId
        patch.color1 = COLOR_CHUNG
      }
      if (Object.keys(patch).length) {
        await sb.from('llave_kyorugi').update(patch).eq('id_llave', fin.id_llave)
      }
    }
  }

  return { ok: true, id_llave: id, ganador_id_linea: g, motivo_resultado: motivo }
}

/** Walkover: rival no se presentó — avanza el presente sin pelear. */
export async function registrarWalkoverCombate(sb, idLlave, ganadorIdLinea) {
  return registrarGanadorCombate(sb, idLlave, ganadorIdLinea, {
    puntaje1: 0,
    puntaje2: 0,
    motivoResultado: 'walkover',
  })
}

/** Llave mínima para categoría con 1 solo competidor → oro automático (motivo unico). */
export async function generarLlaveCategoriaUnico(sb, idCampeonato, idCategoria, { asignarCanchas = true } = {}) {
  const { data: cat, error: errCat } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre')
    .eq('id_categoria', idCategoria)
    .maybeSingle()
  if (errCat || !cat) throw new Error('Categoría no encontrada')

  const omitirPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)
  const { data: lineas, error } = await queryLineasKyorugiLlave(sb, idCampeonato, {
    idCategoria,
    omitirPesaje,
  })
  if (error) throw error

  const participantes = lineas || []
  if (participantes.length !== 1) {
    const etiqueta = omitirPesaje ? 'competidor con dorsal' : 'competidor con pesaje OK'
    throw new Error(`Oro único requiere exactamente 1 ${etiqueta} (hay ${participantes.length})`)
  }

  await sb.from('llave_kyorugi').delete().eq('id_categoria', idCategoria)

  const p = participantes[0]
  const { data: sf, error: errSf } = await sb
    .from('llave_kyorugi')
    .insert({
      id_campeonato: idCampeonato,
      id_categoria: idCategoria,
      ronda: 2,
      match_numero: 1,
      id_linea1: p.id_linea,
      id_linea2: null,
      es_bye: true,
      ganador_id_linea: p.id_linea,
      estado: 'saltado',
      color1: COLOR_CHUNG,
    })
    .select('id_llave')
    .single()
  if (errSf) throw errSf

  const { data: fin, error: errFin } = await sb
    .from('llave_kyorugi')
    .insert({
      id_campeonato: idCampeonato,
      id_categoria: idCategoria,
      ronda: 1,
      match_numero: 1,
      id_linea1: p.id_linea,
      id_linea2: null,
      ganador_id_linea: p.id_linea,
      estado: 'finalizado',
      motivo_resultado: 'unico',
      color1: COLOR_CHUNG,
      siguiente_llave: null,
    })
    .select('id_llave')
    .single()
  if (errFin) throw errFin

  await sb.from('llave_kyorugi').update({ siguiente_llave: fin.id_llave }).eq('id_llave', sf.id_llave)

  if (asignarCanchas) await asignarCanchasCampeonato(sb, idCampeonato)

  return {
    categoria: cat.nombre,
    participantes: 1,
    oro_unico: true,
    id_linea: p.id_linea,
  }
}

/**
 * Valida inputs de consolidación (puro, testeable).
 * idsCategoriasOrigen: categorías con 1 competidor seleccionadas
 * idCategoriaDestino: categoría donde quedará la llave consolidada
 */
export function validarConsolidacionOros({ idsCategoriasOrigen, idCategoriaDestino } = {}) {
  const origenes = [...new Set((idsCategoriasOrigen || []).map(Number).filter(Boolean))]
  const destino = Number(idCategoriaDestino)
  if (origenes.length < 2) {
    return { ok: false, error: 'Selecciona al menos 2 categorías con 1 competidor' }
  }
  if (!destino) {
    return { ok: false, error: 'Elige la categoría destino de la llave' }
  }
  if (!origenes.includes(destino)) {
    return { ok: false, error: 'La categoría destino debe estar entre las seleccionadas' }
  }
  return { ok: true, origenes, destino }
}

/**
 * Consolida oros únicos: mueve los competidores solos de varias categorías
 * a una categoría destino (elegida entre ellas) y genera llave competitiva.
 * Omite validación WT de peso a propósito (consolidación administrativa del evento).
 */
export async function consolidarOrosUnicos(sb, idCampeonato, {
  idsCategoriasOrigen,
  idCategoriaDestino,
} = {}) {
  const v = validarConsolidacionOros({ idsCategoriasOrigen, idCategoriaDestino })
  if (!v.ok) throw new Error(v.error)
  const { origenes, destino } = v

  const { data: cats, error: errCats } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, modalidad, id_campeonato')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .in('id_categoria', origenes)
  if (errCats) throw errCats
  if ((cats || []).length !== origenes.length) {
    throw new Error('Alguna categoría no pertenece a este campeonato')
  }
  const nombrePorId = Object.fromEntries((cats || []).map((c) => [c.id_categoria, c.nombre]))

  const omitirPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)
  const movidos = []

  for (const idCat of origenes) {
    const { data: lineas, error } = await queryLineasKyorugiLlave(sb, idCampeonato, {
      idCategoria: idCat,
      omitirPesaje,
    })
    if (error) throw error
    const aptos = lineas || []
    if (aptos.length !== 1) {
      const etiqueta = omitirPesaje ? 'con dorsal' : 'con pesaje OK'
      throw new Error(
        `"${nombrePorId[idCat] || idCat}" debe tener exactamente 1 competidor ${etiqueta} (hay ${aptos.length})`
      )
    }
    movidos.push({
      id_linea: aptos[0].id_linea,
      id_academia_campeonato: aptos[0].id_academia_campeonato,
      dorsal: aptos[0].dorsal_display,
      desde: idCat,
      desdeNombre: nombrePorId[idCat],
    })
  }

  // Mover a destino (las ya en destino quedan igual)
  for (const m of movidos) {
    if (m.desde === destino) continue
    const { error: errU } = await sb
      .from('linea_inscripcion')
      .update({ id_categoria: destino, updated_at: new Date().toISOString() })
      .eq('id_linea', m.id_linea)
      .eq('id_campeonato', idCampeonato)
    if (errU) throw errU

    await sb.from('bitacora_inscripcion').insert({
      id_academia_campeonato: m.id_academia_campeonato,
      id_linea: m.id_linea,
      accion: 'consolidar_categoria_llave',
      detalle: {
        desde: m.desde,
        desde_nombre: m.desdeNombre,
        hacia: destino,
        hacia_nombre: nombrePorId[destino],
      },
      actor: 'admin',
    })
  }

  // Limpiar llaves huérfanas de categorías origen (ya vacías o con oro único previo)
  const origenesVacios = origenes.filter((id) => id !== destino)
  if (origenesVacios.length) {
    await sb.from('llave_kyorugi').delete().eq('id_campeonato', idCampeonato).in('id_categoria', origenesVacios)
  }

  const result = await generarLlaveCategoria(sb, idCampeonato, destino, { asignarCanchas: true })

  return {
    ok: true,
    categoria_destino: nombrePorId[destino],
    id_categoria_destino: destino,
    movidos: movidos.length,
    participantes: result.participantes ?? movidos.length,
    dorsales: movidos.map((m) => m.dorsal).filter(Boolean),
    ...result,
  }
}

/** Combates de exhibición entre atletas del campeonato (no afectan podio). */
export async function insertarCombateExhibicion(sb, idCampeonato, { idLinea1, idLinea2, cancha = 1 } = {}) {
  const l1 = Number(idLinea1)
  const l2 = Number(idLinea2)
  if (!l1 || !l2 || l1 === l2) throw new Error('Se requieren dos competidores distintos')

  const { data: lineas, error: errL } = await sb
    .from('linea_inscripcion')
    .select('id_linea, id_categoria, id_campeonato')
    .in('id_linea', [l1, l2])
    .eq('id_campeonato', idCampeonato)
  if (errL) throw errL
  if ((lineas || []).length !== 2) throw new Error('Competidores no encontrados en este campeonato')

  const area = Math.min(3, Math.max(1, Number(cancha) || 1))
  const idCategoria = lineas[0].id_categoria

  const { data: existentes } = await sb
    .from('llave_kyorugi')
    .select('orden_pista, match_numero')
    .eq('id_campeonato', idCampeonato)
    .eq('cancha', area)
    .order('orden_pista', { ascending: false })
    .limit(1)

  let ordenPista = ((existentes?.[0]?.orden_pista) || 0) + 1

  const { data: maxMatch } = await sb
    .from('llave_kyorugi')
    .select('match_numero')
    .eq('id_campeonato', idCampeonato)
    .order('match_numero', { ascending: false })
    .limit(1)

  const matchNumero = ((maxMatch?.[0]?.match_numero) || 0) + 1

  const { color1, color2 } = coloresCombate(l1, l2)

  const { data: inserted, error: errI } = await sb
    .from('llave_kyorugi')
    .insert({
      id_campeonato: idCampeonato,
      id_categoria: idCategoria,
      ronda: 0,
      match_numero: matchNumero,
      id_linea1: l1,
      id_linea2: l2,
      es_exhibicion: true,
      es_bye: false,
      estado: 'pendiente',
      cancha: area,
      orden_pista: ordenPista,
      color1,
      color2,
      motivo_resultado: 'normal',
    })
    .select('id_llave')
    .single()
  if (errI) throw errI

  return { ok: true, id_llave: inserted.id_llave, cancha: area, orden_pista: ordenPista, es_exhibicion: true }
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
  buildSlotsCnu6,
  buildSlotsCnu7,
  buildSlotsCnu,
  buildCompactSlots,
  usarLlaveCompacta,
  CANCHAS_DEFAULT,
}
