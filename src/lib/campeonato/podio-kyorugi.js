/** Cálculo de podio kyorugi · eliminación simple (sin repechage) */

function perdedorCombate(c) {
  if (!c?.ganador_id_linea || c.estado !== 'finalizado') return null
  if (c.ganador_id_linea === c.id_linea1) return c.id_linea2 || null
  if (c.ganador_id_linea === c.id_linea2) return c.id_linea1 || null
  return null
}

function combateUtil(c) {
  return c && !['vacío', 'saltado', 'bye'].includes(c.estado)
}

/**
 * Oro: ganador final · Plata: perdedor final · Bronce: perdedores de semifinal
 * que no llegaron a la final (hasta 2 bronces, regla WT sin combate de bronce).
 */
export function calcularPodioCategoria(combates) {
  const list = (combates || []).filter(combateUtil)
  if (!list.length) return { estado: 'sin_llave', podio: null }

  const final = list.find((c) => c.ronda === 1 && c.id_linea1 && c.id_linea2)
  if (!final) {
    const soloBye = list.every((c) => c.estado === 'finalizado' || c.estado === 'pendiente')
    return { estado: soloBye ? 'en_curso' : 'sin_final', podio: null }
  }

  if (final.estado !== 'finalizado' || !final.ganador_id_linea) {
    return { estado: 'en_curso', podio: null }
  }

  const oroId = final.ganador_id_linea
  const plataId = perdedorCombate(final)

  const bronceIds = []
  const semis = list.filter((c) => c.ronda === 2 && c.estado === 'finalizado' && c.ganador_id_linea)
  for (const sf of semis) {
    const perdedor = perdedorCombate(sf)
    if (perdedor && perdedor !== plataId && !bronceIds.includes(perdedor)) {
      bronceIds.push(perdedor)
    }
  }

  return {
    estado: 'completo',
    podio: {
      oro: oroId,
      plata: plataId,
      bronce: bronceIds,
    },
  }
}

function competidorDesdeLinea(l) {
  if (!l) return null
  const p = l.miembros?.[0]?.perfil
  return {
    id_linea: l.id_linea,
    dorsal: l.dorsal_display || '',
    nombres: p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '',
    academia: l.academia_nombre || l.academia_campeonato?.academia?.nombre || '',
  }
}

export async function fetchPodiosCampeonato(sb, idCampeonato) {
  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, division, genero, orden')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const { data: llaves, error: errL } = await sb
    .from('llave_kyorugi')
    .select('id_llave, id_categoria, ronda, estado, id_linea1, id_linea2, ganador_id_linea')
    .eq('id_campeonato', idCampeonato)
  if (errL) throw errL

  const lineaIds = new Set()
  for (const l of llaves || []) {
    if (l.id_linea1) lineaIds.add(l.id_linea1)
    if (l.id_linea2) lineaIds.add(l.id_linea2)
  }

  let lineaMap = {}
  if (lineaIds.size) {
    const { data: lineas } = await sb
      .from('linea_inscripcion')
      .select(`
        id_linea, dorsal_display,
        academia_campeonato(academia(nombre)),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
      `)
      .in('id_linea', [...lineaIds])
    lineaMap = Object.fromEntries(
      (lineas || []).map((l) => [
        l.id_linea,
        {
          ...l,
          academia_nombre: l.academia_campeonato?.academia?.nombre || '',
        },
      ])
    )
  }

  const porCat = (llaves || []).reduce((acc, l) => {
    if (!acc[l.id_categoria]) acc[l.id_categoria] = []
    acc[l.id_categoria].push(l)
    return acc
  }, {})

  function resolver(idLinea) {
    if (!idLinea) return null
    return competidorDesdeLinea(lineaMap[idLinea])
  }

  const podios = (categorias || []).map((cat) => {
    const combates = porCat[cat.id_categoria] || []
    const { estado, podio } = calcularPodioCategoria(combates)
    const tieneLlave = combates.some(combateUtil)

    return {
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      division: cat.division,
      genero: cat.genero,
      estado,
      tiene_llave: tieneLlave,
      podio: podio
        ? {
            oro: resolver(podio.oro),
            plata: resolver(podio.plata),
            bronce: (podio.bronce || []).map(resolver).filter(Boolean),
          }
        : null,
    }
  })

  const resumen = {
    total: podios.length,
    completos: podios.filter((p) => p.estado === 'completo').length,
    enCurso: podios.filter((p) => p.estado === 'en_curso').length,
    sinLlave: podios.filter((p) => !p.tiene_llave).length,
  }

  return { podios, resumen }
}

export const MEDALLA_LABEL = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' }
export const MEDALLA_EMOJI = { oro: '🥇', plata: '🥈', bronce: '🥉' }
