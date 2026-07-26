/**
 * Llamado poomsae = por FORMA (Kibom, Il Jang…), toda la edad/sexo junta.
 * Podios siguen por categoría (edad + sexo).
 */

const EDAD_ORDER = [
  'Infantil A',
  'Infantil B',
  'Pre-cadete',
  'Cadete',
  'Juvenil',
  'Senior I',
  'Senior II',
  'Master I',
  'Master II',
  'Master III',
  'Master IV',
]

/** @param {string} nombre ej. "Poomsae Kibom · Infantil A · M" */
export function parseNombrePoomsae(nombre) {
  const n = String(nombre || '').trim()
  const ranking = n.match(/^Poomsae Ranking · (.+?) · ([MFX])$/i)
  if (ranking) {
    return { forma: 'Ranking', edad: ranking[1].trim(), genero: ranking[2].toUpperCase(), esRanking: true }
  }
  const m = n.match(/^Poomsae (.+?) · (.+?) · ([MFX])$/i)
  if (m) {
    return { forma: m[1].trim(), edad: m[2].trim(), genero: m[3].toUpperCase(), esRanking: false }
  }
  return { forma: n || 'Poomsae', edad: '', genero: '', esRanking: false }
}

function edadRank(edad) {
  const i = EDAD_ORDER.findIndex((e) => e.toLowerCase() === String(edad || '').toLowerCase())
  return i >= 0 ? i : 99
}

function generoRank(g) {
  if (g === 'M') return 0
  if (g === 'F') return 1
  return 2
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
    return a.forma.localeCompare(b.forma, 'es')
  })

  return formas
}

/**
 * Pantalla llamados poomsae: 3 áreas (como kyorugi).
 * Cada área muestra la forma que PSS está puntuando ahí (poomsae_cancha / en_curso).
 */
export function organizarPantallaPoomsaePorAreas(categorias, { numAreas = 3 } = {}) {
  const formas = agruparPoomsaePorForma(categorias)
  const abiertas = formas.filter((f) => !f.cerrada && f.pendientes > 0)

  const areaDeParticipante = (p) => {
    const c = Number(p.poomsae_cancha || p.cancha || 0)
    return c >= 1 && c <= numAreas ? c : null
  }

  // Forma activa por área: prioriza en_curso en esa cancha
  const formaPorArea = {}
  for (let a = 1; a <= numAreas; a++) formaPorArea[a] = null

  for (const forma of formas) {
    const enCurso = forma.participantes.find(
      (p) => (p.estado === 'en_curso' || p.en_curso) && areaDeParticipante(p)
    )
    if (enCurso) {
      const area = areaDeParticipante(enCurso)
      if (!formaPorArea[area]) formaPorArea[area] = forma
    }
  }

  // en_curso sin cancha → área 1 (compat sin migración poomsae_cancha)
  for (const forma of formas) {
    const enCurso = forma.participantes.find((p) => p.estado === 'en_curso' || p.en_curso)
    if (enCurso && !areaDeParticipante(enCurso) && !formaPorArea[1]) {
      formaPorArea[1] = forma
    }
  }

  // Forma con atletas ya asignados a cancha (aunque no en_curso) — mantiene cola en esa área
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
