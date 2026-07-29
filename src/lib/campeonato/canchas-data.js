import { parseCompetidor } from '@/lib/campeonato/llaves-kyorugi'

export const RONDA_LABEL = {
  0: 'Exhibición',
  1: 'Final',
  2: 'Semifinal',
  3: 'Cuartos de final',
  4: 'Octavos de final',
  5: 'Dieciseisavos de final',
}

function normalizarColoresCombate(row) {
  if (!row) return row
  let color1 = row.id_linea1 ? 'azul' : row.color1 || null
  let color2 = row.id_linea2 ? 'rojo' : row.color2 || null
  if (row.id_linea1) color1 = 'azul'
  if (row.id_linea2) color2 = 'rojo'
  if (row.id_linea1 && row.id_linea2 && color1 === color2) {
    color1 = 'azul'
    color2 = 'rojo'
  }
  return { ...row, color1, color2 }
}

function enrichCombate(l, lineaMap, catMap) {
  const c1 = l.id_linea1 ? lineaMap[l.id_linea1] : null
  const c2 = l.id_linea2 ? lineaMap[l.id_linea2] : null
  const cat = catMap[l.id_categoria]
  const competidor1 = parseCompetidor(c1)
  const competidor2 = parseCompetidor(c2)
  return normalizarColoresCombate({
    id_llave: l.id_llave,
    id_categoria: l.id_categoria,
    ronda: l.ronda,
    rondaLabel: RONDA_LABEL[l.ronda] || `Ronda ${l.ronda}`,
    match_numero: l.match_numero,
    estado: l.estado,
    es_bye: l.es_bye,
    cancha: l.cancha,
    orden_pista: l.orden_pista,
    color1: l.color1,
    color2: l.color2,
    ganador_id_linea: l.ganador_id_linea,
    id_linea1: l.id_linea1,
    id_linea2: l.id_linea2,
    puntaje1: l.puntaje1 ?? 0,
    puntaje2: l.puntaje2 ?? 0,
    round1_ganador: l.round1_ganador ?? null,
    round2_ganador: l.round2_ganador ?? null,
    round3_ganador: l.round3_ganador ?? null,
    siguiente_llave: l.siguiente_llave ?? null,
    motivo_resultado: l.motivo_resultado || 'normal',
    es_exhibicion: Boolean(l.es_exhibicion),
    categoria_nombre: cat?.nombre || '',
    competidor1,
    competidor2,
  })
}

export async function fetchCombatesCampeonato(sb, idCampeonato, { incluirSaltados = false } = {}) {
  const llaves = []
  const pageSize = 1000
  let from = 0
  while (true) {
    let q = sb
      .from('llave_kyorugi')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'vacío')
      .neq('estado', 'bye')
    if (!incluirSaltados) q = q.neq('estado', 'saltado')
    const { data, error } = await q
      .order('orden_pista', { ascending: true, nullsFirst: false })
      .order('id_llave', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    llaves.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

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
        academia_campeonato(academia(nombre, logo_url)),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos, foto_url))
      `)
      .in('id_linea', [...lineaIds])
    lineaMap = Object.fromEntries(
      (lineas || []).map((l) => [
        l.id_linea,
        { ...l, academia_nombre: l.academia_campeonato?.academia?.nombre || '', academia_logo_url: l.academia_campeonato?.academia?.logo_url || '' },
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

function sortOrdenPista(a, b) {
  const oa = a.orden_pista ?? 9999
  const ob = b.orden_pista ?? 9999
  if (oa !== ob) return oa - ob
  return (a.id_llave || 0) - (b.id_llave || 0)
}

/** Pendiente programado en pista (se muestra el Nº aunque falten rivales). */
export function combateProgramadoEnPista(c) {
  if (c.estado !== 'pendiente') return false
  if (c.es_bye) return false
  const orden = Number(c.orden_pista)
  return Number.isFinite(orden) && orden > 0
}

/** En curso o listo para entrar ya (ambos rivales). */
export function combateListoAmbosRivales(c) {
  return Boolean(c.id_linea1 && c.id_linea2)
}

/** @deprecated alias interno TV */
export function combateEnCola(c) {
  if (c.estado === 'en_curso') return combateListoAmbosRivales(c)
  return combateProgramadoEnPista(c) || (c.estado === 'pendiente' && (c.id_linea1 || c.id_linea2))
}

function esSiguienteDe(actual, c) {
  if (!actual) return true
  if (c.id_llave === actual.id_llave) return false
  const o = c.orden_pista ?? 9999
  const oa = actual.orden_pista ?? 9999
  if (actual.estado === 'en_curso') return o > oa
  return o > oa || (o === oa && (c.id_llave || 0) > (actual.id_llave || 0))
}

/** Organiza datos para pantalla pública de una cancha */
export function organizarPantallaCancha(combates) {
  const lista = [...(combates || [])].sort(sortOrdenPista)
  const enCurso = lista.filter((c) => c.estado === 'en_curso' && combateListoAmbosRivales(c))
  const pendientesPista = lista.filter((c) => combateProgramadoEnPista(c)).sort(sortOrdenPista)
  const finalizados = lista.filter((c) => c.estado === 'finalizado' && c.ganador_id_linea)

  const actual = enCurso[0] || pendientesPista[0] || null
  const proximos = pendientesPista.filter((c) => esSiguienteDe(actual, c)).slice(0, 8)
  const recientes = finalizados.slice(-4).reverse()

  const pendientesListos = pendientesPista.filter(combateListoAmbosRivales)
  const terminados = finalizados.length
  const total = lista.filter((c) => c.estado !== 'vacío').length

  return {
    actual,
    proximos,
    recientes,
    stats: {
      terminados,
      total,
      pendientes: pendientesListos.length,
    },
  }
}

export function ganadorCombate(c) {
  if (!c?.ganador_id_linea) return null
  if (c.ganador_id_linea === c.id_linea1) return c.competidor1
  if (c.ganador_id_linea === c.id_linea2) return c.competidor2
  return null
}
