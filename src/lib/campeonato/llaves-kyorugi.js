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

function nombreLinea(l) {
  if (!l) return 'BYE'
  const m = l.miembros?.[0]?.perfil
  if (!m) return l.dorsal_display || `#${l.id_linea}`
  return `${l.dorsal_display || ''} ${m.nombres || ''} ${m.apellidos || ''}`.trim()
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

  const bracketSize = bracketSizeFor(participantes.length)
  const numRondas = Math.log2(bracketSize)
  const seeds = assignSeeds(participantes, bracketSize)
  const slots = buildSlots(seeds, bracketSize)

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
          estado = 'bye'
        } else if (!p1 && p2) {
          es_bye = true
          id_linea1 = p2.id_linea
          id_linea2 = null
          ganador_id_linea = p2.id_linea
          estado = 'bye'
        } else if (!p1 && !p2) {
          estado = 'vacío'
        }
      }

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
      if (match?.ganador_id_linea && idSiguiente) {
        const { data: sig } = await sb.from('llave_kyorugi').select('*').eq('id_llave', idSiguiente).single()
        const patch = {}
        if (!sig.id_linea1) patch.id_linea1 = match.ganador_id_linea
        else if (!sig.id_linea2) patch.id_linea2 = match.ganador_id_linea
        if (Object.keys(patch).length) {
          await sb.from('llave_kyorugi').update(patch).eq('id_llave', idSiguiente)
        }
      }
    }
  }

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

  return { generadas: resultados.length, resultados, errores }
}

export {
  nombreLinea,
  bracketSizeFor,
  getSeedOrder,
  assignSeeds,
  buildSlots,
}
