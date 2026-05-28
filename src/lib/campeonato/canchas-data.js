import { parseCompetidor } from '@/lib/campeonato/llaves-kyorugi'

export const RONDA_LABEL = {
  1: 'Final',
  2: 'Semifinal',
  3: 'Cuartos de final',
  4: 'Octavos de final',
  5: 'Dieciseisavos de final',
}

function enrichCombate(l, lineaMap, catMap) {
  const c1 = l.id_linea1 ? lineaMap[l.id_linea1] : null
  const c2 = l.id_linea2 ? lineaMap[l.id_linea2] : null
  const cat = catMap[l.id_categoria]
  const competidor1 = parseCompetidor(c1)
  const competidor2 = parseCompetidor(c2)
  return {
    id_llave: l.id_llave,
    id_categoria: l.id_categoria,
    ronda: l.ronda,
    rondaLabel: RONDA_LABEL[l.ronda] || `Ronda ${l.ronda}`,
    match_numero: l.match_numero,
    estado: l.estado,
    cancha: l.cancha,
    orden_pista: l.orden_pista,
    color1: l.color1,
    color2: l.color2,
    ganador_id_linea: l.ganador_id_linea,
    id_linea1: l.id_linea1,
    id_linea2: l.id_linea2,
    categoria_nombre: cat?.nombre || '',
    competidor1,
    competidor2,
  }
}

export async function fetchCombatesCampeonato(sb, idCampeonato, { incluirSaltados = false } = {}) {
  let q = sb
    .from('llave_kyorugi')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'vacío')
    .neq('estado', 'bye')
  if (!incluirSaltados) q = q.neq('estado', 'saltado')
  const { data: llaves, error } = await q.order('orden_pista', { ascending: true, nullsFirst: false })
  if (error) throw error

  const lineaIds = new Set()
  const catIds = new Set()
  for (const l of llaves || []) {
    if (l.id_linea1) lineaIds.add(l.id_linea1)
    if (l.id_linea2) lineaIds.add(l.id_linea2)
    if (l.id_categoria) catIds.add(l.id_categoria)
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
        { ...l, academia_nombre: l.academia_campeonato?.academia?.nombre || '' },
      ])
    )
  }

  let catMap = {}
  if (catIds.size) {
    const { data: cats } = await sb
      .from('categoria_campeonato')
      .select('id_categoria, nombre')
      .in('id_categoria', [...catIds])
    catMap = Object.fromEntries((cats || []).map((c) => [c.id_categoria, c]))
  }

  const enriched = (llaves || []).map((l) => enrichCombate(l, lineaMap, catMap))
  const porCancha = { 1: [], 2: [], 3: [] }
  for (const c of enriched) {
    if (c.cancha && porCancha[c.cancha]) porCancha[c.cancha].push(c)
  }
  for (const k of [1, 2, 3]) {
    porCancha[k].sort((a, b) => (a.orden_pista || 9999) - (b.orden_pista || 9999))
  }

  return { combates: enriched, porCancha, total: enriched.length }
}

function combateListo(c) {
  return c.estado === 'pendiente' && c.id_linea1 && c.id_linea2 && c.competidor1 && c.competidor2
}

/** Organiza datos para pantalla pública de una cancha */
export function organizarPantallaCancha(combates) {
  const lista = [...(combates || [])].sort((a, b) => (a.orden_pista || 9999) - (b.orden_pista || 9999))
  const pendientes = lista.filter(combateListo)
  const finalizados = lista.filter((c) => c.estado === 'finalizado' && c.ganador_id_linea)

  const actual = pendientes[0] || null
  const proximos = pendientes.slice(1, 8)
  const recientes = finalizados.slice(-4).reverse()

  const terminados = finalizados.length
  const total = lista.filter((c) => c.estado !== 'vacío').length

  return {
    actual,
    proximos,
    recientes,
    stats: {
      terminados,
      total,
      pendientes: pendientes.length,
    },
  }
}

export function ganadorCombate(c) {
  if (!c?.ganador_id_linea) return null
  if (c.ganador_id_linea === c.id_linea1) return c.competidor1
  if (c.ganador_id_linea === c.id_linea2) return c.competidor2
  return null
}
