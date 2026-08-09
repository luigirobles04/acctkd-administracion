/**
 * Llamado poomsae = por FORMA (Kibom, Il Jang…), toda la edad/sexo junta.
 * Podios siguen por categoría (edad + sexo).
 */

const EDAD_ORDER = [
  'Pre Infantil',
  'Infantil A',
  'Infantil B',
  'Pre Cadete',
  'Cadete',
  'Junior',
  'Senior 1',
  'Senior 2',
  'Master 1',
  'Master 2',
  'Master 3',
  'Master 4',
]

/** Menor → mayor dificultad (reconocido + dan). Ranking al final. */
export const FORMA_ORDER = [
  'Kibom',
  'Il Jang',
  'I Jang',
  'Sam Jang',
  'Sa Jang',
  'Oh Jang',
  'Yuk Jang',
  'Chil Jang',
  'Pal Jang',
  'Koryo',
  'Keumgang',
  'Taebaek',
  'Pyongwon',
  'Sip Jin',
  'Jitae',
  'Chongkwon',
  'Hansu',
  'Ranking',
]

/** @param {string} nombre ej. "Poomsae Kibom · Infantil A · M" */
export function parseNombrePoomsae(nombre) {
  const n = String(nombre || '').trim()
  const ranking = n.match(/^Poomsae Ranking · (.+?) · ([MFX])$/i)
  if (ranking) {
    return { forma: 'Ranking', edad: ranking[1].trim(), genero: ranking[2].toUpperCase(), esRanking: true }
  }
  const dan = n.match(/^Poomsae (Koryo|Keumgang|Taebaek|Pyongwon|Sip Jin|Jitae|Chongkwon|Hansu) · (.+?) · ([MFX])$/i)
  if (dan) {
    return { forma: dan[1].trim(), edad: dan[2].trim(), genero: dan[3].toUpperCase(), esRanking: false, esDan: true }
  }
  const m = n.match(/^Poomsae (.+?) · (.+?) · ([MFX])$/i)
  if (m) {
    return { forma: m[1].trim(), edad: m[2].trim(), genero: m[3].toUpperCase(), esRanking: false }
  }
  return { forma: n || 'Poomsae', edad: '', genero: '', esRanking: false }
}

export function formaRank(forma) {
  const key = String(forma || '').trim().toLowerCase()
  const i = FORMA_ORDER.findIndex((f) => f.toLowerCase() === key)
  // Desconocidas al final, pero antes de Ranking
  if (i >= 0) return i
  return FORMA_ORDER.length - 0.5
}

function edadRank(edad) {
  const i = EDAD_ORDER.findIndex((e) => e.toLowerCase() === String(edad || '').toLowerCase())
  return i >= 0 ? i : 99
}

function generoRank(g) {
  const gU = String(g || '').toUpperCase()
  if (gU === 'M') return 0
  if (gU === 'F') return 1
  return 2
}

/** Orden de categorías: forma (menor→mayor) → edad → género. */
export function compareCategoriasPorPoomsae(a, b) {
  const pa = parseNombrePoomsae(a?.nombre)
  const pb = parseNombrePoomsae(b?.nombre)
  const fa = formaRank(pa.forma) - formaRank(pb.forma)
  if (fa !== 0) return fa
  const ea = edadRank(pa.edad) - edadRank(pb.edad)
  if (ea !== 0) return ea
  return generoRank(pa.genero || a?.genero) - generoRank(pb.genero || b?.genero)
}

/**
 * Agrupa categorías (edad/sexo) en colas por forma para llamado.
 * @param {Array} categorias salida de fetchOrdenPoomsaeCampeonato
 */
export function agruparPoomsaePorForma(categorias) {
  const map = new Map()

  for (const cat of categorias || []) {
    if (!cat?.inscritos) continue
    const { forma, edad, genero, esRanking } = parseNombrePoomsae(cat.nombre)
    const key = forma
    if (!map.has(key)) {
      map.set(key, {
        forma: key,
        esRanking,
        categorias: [],
        participantes: [],
      })
    }
    const g = map.get(key)
    g.categorias.push({
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      division: cat.division,
      genero: cat.genero || genero,
      edad,
      inscritos: cat.inscritos,
      calificados: cat.calificados,
      cerrada: cat.cerrada,
    })

    for (const p of cat.participantes || []) {
      g.participantes.push({
        ...p,
        id_categoria: cat.id_categoria,
        categoria_nombre: cat.nombre,
        forma: key,
        edad,
        genero: cat.genero || genero,
        orden_cat: p.orden,
      })
    }
  }

  const formas = [...map.values()].map((g) => {
    g.participantes.sort((a, b) => {
      const ea = edadRank(a.edad) - edadRank(b.edad)
      if (ea !== 0) return ea
      const ga = generoRank(a.genero) - generoRank(b.genero)
      if (ga !== 0) return ga
      return (a.orden_cat ?? 0) - (b.orden_cat ?? 0)
    })
    // orden global de llamado dentro de la forma
    g.participantes = g.participantes.map((p, i) => ({ ...p, orden: i + 1 }))
    const inscritos = g.participantes.length
    const calificados = g.participantes.filter((p) => p.calificado).length
    return {
      ...g,
      inscritos,
      calificados,
      pendientes: inscritos - calificados,
      cerrada: inscritos > 0 && calificados === inscritos,
    }
  })

  formas.sort((a, b) => {
    if (a.esRanking !== b.esRanking) return a.esRanking ? 1 : -1
    return formaRank(a.forma) - formaRank(b.forma)
  })

  return formas
}

/**
 * Pantalla llamados poomsae: 3 áreas (como kyorugi).
 * Prioridad: liveState (PSS Unity) → columnas en_curso/poomsae_cancha.
 * @param {object} [liveState] { areas: {1: slot|null, ...} }
 */
export function organizarPantallaPoomsaePorAreas(categorias, { numAreas = 3, liveState = null } = {}) {
  const formas = agruparPoomsaePorForma(categorias)
  const abiertas = formas.filter((f) => !f.cerrada && f.pendientes > 0)

  const areaDeParticipante = (p) => {
    const c = Number(p.poomsae_cancha || p.cancha || 0)
    return c >= 1 && c <= numAreas ? c : null
  }

  const formaPorArea = {}
  const actualForzado = {}
  for (let a = 1; a <= numAreas; a++) {
    formaPorArea[a] = null
    actualForzado[a] = null
  }

  // 1) Overlay en vivo desde PSS (funciona sin migración DB)
  for (let a = 1; a <= numAreas; a++) {
    const slot = liveState?.areas?.[a] || liveState?.areas?.[String(a)]
    if (!slot?.id_linea) continue
    const forma =
      formas.find((f) => f.forma === slot.forma) ||
      formas.find((f) => f.participantes.some((p) => p.id_linea === slot.id_linea))
    if (!forma) continue
    formaPorArea[a] = forma
    const fromQueue = forma.participantes.find((p) => p.id_linea === slot.id_linea)
    actualForzado[a] = {
      ...(fromQueue || {}),
      id_linea: slot.id_linea,
      dorsal: slot.dorsal || fromQueue?.dorsal,
      nombres: slot.nombres || fromQueue?.nombres,
      academia: slot.academia || fromQueue?.academia,
      academia_logo: slot.academia_logo || fromQueue?.academia_logo,
      orden: slot.orden ?? fromQueue?.orden,
      categoria_nombre: slot.categoria_nombre || fromQueue?.categoria_nombre,
      forma: forma.forma,
      estado: 'en_curso',
      en_curso: true,
      calificado: false,
    }
  }

  // 2) Columnas DB (si la migración ya está aplicada)
  for (const forma of formas) {
    const enCurso = forma.participantes.find(
      (p) => (p.estado === 'en_curso' || p.en_curso) && areaDeParticipante(p)
    )
    if (enCurso) {
      const area = areaDeParticipante(enCurso)
      if (!formaPorArea[area]) formaPorArea[area] = forma
    }
  }

  for (const forma of formas) {
    const enCurso = forma.participantes.find((p) => p.estado === 'en_curso' || p.en_curso)
    if (enCurso && !areaDeParticipante(enCurso) && !formaPorArea[1]) {
      formaPorArea[1] = forma
    }
  }

  for (const forma of formas) {
    if (forma.cerrada) continue
    for (const p of forma.participantes) {
      const area = areaDeParticipante(p)
      if (area && !formaPorArea[area]) {
        formaPorArea[area] = forma
        break
      }
    }
  }

  const areas = []
  for (let cancha = 1; cancha <= numAreas; cancha++) {
    const forma = formaPorArea[cancha]
    if (!forma) {
      areas.push({
        cancha,
        forma: null,
        actual: null,
        proximos: [],
        recientes: [],
        stats: { total: 0, terminados: 0, pendientes: 0 },
      })
      continue
    }

    const parts = forma.participantes
    const actual =
      actualForzado[cancha] ||
      parts.find(
        (p) =>
          (p.estado === 'en_curso' || p.en_curso) &&
          (areaDeParticipante(p) === cancha || !areaDeParticipante(p))
      ) ||
      parts.find((p) => !p.calificado) ||
      null

    const proximos = parts.filter((p) => !p.calificado && p.id_linea !== actual?.id_linea).slice(0, 4)
    const recientes = parts.filter((p) => p.calificado).slice(-2).reverse()

    areas.push({
      cancha,
      forma: {
        nombre: forma.forma,
        esRanking: forma.esRanking,
        inscritos: forma.inscritos,
        calificados: forma.calificados,
        pendientes: forma.pendientes,
        categorias: forma.categorias.length,
      },
      actual,
      proximos,
      recientes,
      stats: {
        total: forma.inscritos,
        terminados: forma.calificados,
        pendientes: forma.pendientes,
      },
    })
  }

  const formasEnAreas = new Set(areas.map((a) => a.forma?.nombre).filter(Boolean))
  const formasPendientes = abiertas
    .filter((f) => !formasEnAreas.has(f.forma))
    .map((f) => ({
      forma: f.forma,
      pendientes: f.pendientes,
      inscritos: f.inscritos,
      calificados: f.calificados,
      esRanking: f.esRanking,
    }))

  return {
    areas,
    formas,
    formasPendientes,
    stats: {
      totalFormas: formas.length,
      abiertas: abiertas.length,
      pendientes: formas.reduce((s, f) => s + f.pendientes, 0),
      calificados: formas.reduce((s, f) => s + f.calificados, 0),
    },
  }
}
