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

  const byePlayers = byeCount ? [shuffled[0]] : []
  let fighters = byeCount ? shuffled.slice(1) : [...shuffled]

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

/** Toda una categoría en la misma cancha; categorías repartidas 1→2→3→1… */
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
    .neq('estado', 'bye')
    .neq('estado', 'saltado')
  if (error) throw error

  const porCat = {}
  for (const l of llaves || []) {
    if (!porCat[l.id_categoria]) porCat[l.id_categoria] = []
    porCat[l.id_categoria].push(l)
  }

  const catsConLlave = (categorias || []).filter((c) => (porCat[c.id_categoria]?.length || 0) > 0)
  let ordenGlobal = 1
  const resumen = []

  for (let ci = 0; ci < catsConLlave.length; ci++) {
    const cat = catsConLlave[ci]
    const cancha = (ci % numCanchas) + 1
    const combates = (porCat[cat.id_categoria] || []).sort((a, b) => {
      if (b.ronda !== a.ronda) return b.ronda - a.ronda
      return a.match_numero - b.match_numero
    })

    for (const c of combates) {
      await sb
        .from('llave_kyorugi')
        .update({ cancha, orden_pista: ordenGlobal })
        .eq('id_llave', c.id_llave)
      ordenGlobal++
    }
    resumen.push({ categoria: cat.nombre, cancha, combates: combates.length })
  }

  return { asignados: llaves?.length || 0, canchas: numCanchas, porCategoria: resumen }
}

export async function generarLlaveCategoria(sb, idCampeonato, idCategoria) {
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

  const idsPorRonda = []

  for (let ri = 0; ri < estructura.length; ri++) {
    const { ronda, count } = estructura[ri]
    idsPorRonda[ri] = []
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

      const { data: ins, error: errI } = await sb
        .from('llave_kyorugi')
        .insert({
          id_campeonato: idCampeonato,
          id_categoria: idCategoria,
          ronda,
          match_numero: m,
          id_linea1,
          id_linea2,
          es_bye,
          ganador_id_linea,
          estado,
          color1,
          color2,
        })
        .select()
        .single()
      if (errI) throw errI
      idsPorRonda[ri].push(ins.id_llave)
    }
  }

  for (let ri = 0; ri < idsPorRonda.length - 1; ri++) {
    for (let mi = 0; mi < idsPorRonda[ri].length; mi++) {
      const idActual = idsPorRonda[ri][mi]
      const idSiguiente = idsPorRonda[ri + 1][Math.floor(mi / 2)]
      await sb.from('llave_kyorugi').update({ siguiente_llave: idSiguiente }).eq('id_llave', idActual)

      const { data: match } = await sb.from('llave_kyorugi').select('*').eq('id_llave', idActual).single()
      if (!match || match.estado === 'saltado' || match.estado === 'vacío') continue
      if (match?.ganador_id_linea && idSiguiente) {
        const { data: sig } = await sb.from('llave_kyorugi').select('*').eq('id_llave', idSiguiente).single()
        if (!sig) continue
        const patch = {}
        const g = match.ganador_id_linea
        if (!sig.id_linea1) {
          patch.id_linea1 = g
          patch.color1 = g === match.id_linea1 ? match.color1 : match.color2
        } else if (!sig.id_linea2 && sig.id_linea1 !== g) {
          patch.id_linea2 = g
          patch.color2 = g === match.id_linea1 ? match.color1 : match.color2
        }
        if (Object.keys(patch).length) {
          await sb.from('llave_kyorugi').update(patch).eq('id_llave', idSiguiente)
        }
      }
    }
  }

  if (compacta && byePlayers.length === 1 && idsPorRonda.length >= 2) {
    const bye = byePlayers[0]
    const sfIds = idsPorRonda[idsPorRonda.length - 2]
    const idSfBye = sfIds[sfIds.length - 1]
    const idFinal = idsPorRonda[idsPorRonda.length - 1][0]

    await sb
      .from('llave_kyorugi')
      .update({ estado: 'saltado', es_bye: true })
      .eq('id_llave', idSfBye)

    await sb
      .from('llave_kyorugi')
      .update({
        id_linea2: bye.id_linea,
        color2: COLOR_HONG,
        estado: 'pendiente',
      })
      .eq('id_llave', idFinal)
  }

  await asignarCanchasCampeonato(sb, idCampeonato)

  return {
    categoria: cat.nombre,
    participantes: participantes.length,
    combates: idsPorRonda.flat().length,
    rondas: numRondas,
    tamanoLlave: bracketSize,
  }
}

export async function generarTodasLasLlaves(sb, idCampeonato) {
  const { data: categorias, error } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (error) throw error

  const resultados = []
  const errores = []

  for (const cat of categorias || []) {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('id_linea', { count: 'exact', head: true })
      .eq('id_campeonato', idCampeonato)
      .eq('id_categoria', cat.id_categoria)
      .eq('modalidad', 'kyorugi_individual')
      .eq('estado', 'aprobado')
      .not('dorsal_numero', 'is', null)

    if ((count || 0) < 2) continue

    try {
      const r = await generarLlaveCategoria(sb, idCampeonato, cat.id_categoria)
      resultados.push({ id_categoria: cat.id_categoria, nombre: cat.nombre, ...r })
    } catch (e) {
      errores.push({ id_categoria: cat.id_categoria, nombre: cat.nombre, error: e.message })
    }
  }

  await asignarCanchasCampeonato(sb, idCampeonato)

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

  return { ok: true, id_llave: id, ganador_id_linea: g }
}

export {
  nombreLinea,
  parseCompetidor,
  bracketSizeFor,
  getSeedOrder,
  assignSeeds,
  buildSlots,
  CANCHAS_DEFAULT,
}
