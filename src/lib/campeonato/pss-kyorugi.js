import { fetchCombatesCampeonato, organizarPantallaCancha } from '@/lib/campeonato/canchas-data'
import { registrarGanadorCombate } from '@/lib/campeonato/llaves-kyorugi'

const COLOR_CHUNG = 'azul'
const COLOR_HONG = 'rojo'

/** Snapshot completo para PSS FESTCUP (cola + llaves de un área, modo offline). */
export async function buildPssAreaSnapshot(sb, idCampeonato, cancha) {
  const area = Number(cancha)
  if (!area || area < 1 || area > 3) throw new Error('Área inválida (1-3)')

  const { data: camp, error: campErr } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, lugar, ciudad, fecha_inicio, fecha_fin')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (campErr) throw campErr
  if (!camp) throw new Error('Campeonato no encontrado')

  const { combates, porCancha } = await fetchCombatesCampeonato(sb, idCampeonato, { incluirSaltados: true })
  const listaArea = porCancha[area] || []
  const pantalla = organizarPantallaCancha(listaArea)

  const combatesPss = listaArea.map((c) => ({
    id_llave: c.id_llave,
    id_categoria: c.id_categoria,
    categoria_nombre: c.categoria_nombre,
    ronda: c.ronda,
    rondaLabel: c.rondaLabel,
    match_numero: c.match_numero,
    estado: c.estado,
    es_bye: c.es_bye,
    cancha: c.cancha,
    orden_pista: c.orden_pista,
    color1: c.color1,
    color2: c.color2,
    id_linea1: c.id_linea1,
    id_linea2: c.id_linea2,
    ganador_id_linea: c.ganador_id_linea,
    puntaje1: c.puntaje1 ?? 0,
    puntaje2: c.puntaje2 ?? 0,
    round1_ganador: c.round1_ganador ?? null,
    round2_ganador: c.round2_ganador ?? null,
    round3_ganador: c.round3_ganador ?? null,
    siguiente_llave: c.siguiente_llave ?? null,
    competidor1: c.competidor1,
    competidor2: c.competidor2,
  }))

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    campeonato: camp,
    area,
    cola: pantalla,
    combates: combatesPss,
    total: combatesPss.length,
  }
}

export async function iniciarCombatePss(sb, idCampeonato, idLlave) {
  const id = Number(idLlave)
  if (!id) throw new Error('ID de combate inválido')

  const { data: match, error } = await sb
    .from('llave_kyorugi')
    .select('*')
    .eq('id_llave', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  if (!match) throw new Error('Combate no encontrado')
  if (match.estado === 'finalizado') throw new Error('Combate ya finalizado')
  if (match.estado === 'vacío' || match.estado === 'saltado') throw new Error('Combate no disponible')
  if (!match.id_linea1 || !match.id_linea2) throw new Error('Faltan competidores en el combate')

  if (match.cancha) {
    await sb
      .from('llave_kyorugi')
      .update({ estado: 'pendiente', puntaje1: 0, puntaje2: 0, round1_ganador: null, round2_ganador: null, round3_ganador: null })
      .eq('id_campeonato', idCampeonato)
      .eq('cancha', match.cancha)
      .eq('estado', 'en_curso')
      .neq('id_llave', id)
  }

  const { error: upErr } = await sb
    .from('llave_kyorugi')
    .update({
      estado: 'en_curso',
      puntaje1: 0,
      puntaje2: 0,
      round1_ganador: null,
      round2_ganador: null,
      round3_ganador: null,
    })
    .eq('id_llave', id)
  if (upErr) throw upErr

  return { ok: true, id_llave: id, estado: 'en_curso' }
}

export async function actualizarMarcadorPss(sb, idCampeonato, idLlave, { puntaje1, puntaje2, round1Ganador, round2Ganador, round3Ganador } = {}) {
  const id = Number(idLlave)
  if (!id) throw new Error('ID de combate inválido')

  const { data: match, error } = await sb
    .from('llave_kyorugi')
    .select('id_llave, id_campeonato, estado, round1_ganador, round2_ganador, round3_ganador')
    .eq('id_llave', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  if (!match) throw new Error('Combate no encontrado')
  if (match.estado === 'finalizado') throw new Error('Combate ya finalizado')
  if (match.estado !== 'en_curso' && match.estado !== 'pendiente') {
    throw new Error('Combate no está en curso')
  }

  const p1 = Math.max(0, Number(puntaje1) || 0)
  const p2 = Math.max(0, Number(puntaje2) || 0)

  const patch = { puntaje1: p1, puntaje2: p2 }
  if (match.estado === 'pendiente') patch.estado = 'en_curso'

  const r1 = parseRoundGanador(round1Ganador)
  const r2 = parseRoundGanador(round2Ganador)
  const r3 = parseRoundGanador(round3Ganador)
  if (r1 != null) patch.round1_ganador = r1
  if (r2 != null) patch.round2_ganador = r2
  if (r3 != null) patch.round3_ganador = r3

  const { error: upErr } = await sb.from('llave_kyorugi').update(patch).eq('id_llave', id)
  if (upErr) throw upErr

  return {
    ok: true,
    id_llave: id,
    puntaje1: p1,
    puntaje2: p2,
    round1_ganador: r1 ?? match.round1_ganador ?? null,
    round2_ganador: r2 ?? match.round2_ganador ?? null,
    round3_ganador: r3 ?? match.round3_ganador ?? null,
    estado: patch.estado || match.estado,
  }
}

function parseRoundGanador(value) {
  const n = Number(value)
  if (n === 1 || n === 2) return n
  return null
}

export async function finalizarCombatePss(sb, idCampeonato, idLlave, { ganadorIdLinea, puntaje1, puntaje2 } = {}) {
  const id = Number(idLlave)
  const g = Number(ganadorIdLinea)
  if (!id || !g) throw new Error('idLlave y ganadorIdLinea requeridos')

  const { data: combate } = await sb
    .from('llave_kyorugi')
    .select('id_llave, id_campeonato')
    .eq('id_llave', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (!combate) throw new Error('Combate no encontrado')

  return registrarGanadorCombate(sb, id, g, { puntaje1, puntaje2 })
}

/** Avance local (misma lógica que registrarGanadorCombate) para snapshot offline en Unity. */
export function avanzarGanadorLocal(combates, idLlave, ganadorIdLinea, { puntaje1 = 0, puntaje2 = 0 } = {}) {
  const lista = combates.map((c) => ({ ...c }))
  const idx = lista.findIndex((c) => c.id_llave === idLlave)
  if (idx < 0) throw new Error('Combate no encontrado en snapshot')

  const match = lista[idx]
  const g = Number(ganadorIdLinea)
  if (g !== match.id_linea1 && g !== match.id_linea2) throw new Error('Ganador inválido')
  if (!match.id_linea1 || !match.id_linea2) throw new Error('Competidores incompletos')

  lista[idx] = {
    ...match,
    ganador_id_linea: g,
    estado: 'finalizado',
    puntaje1: Number(puntaje1) || 0,
    puntaje2: Number(puntaje2) || 0,
  }

  if (match.siguiente_llave) {
    const si = lista.findIndex((c) => c.id_llave === match.siguiente_llave)
    if (si >= 0) {
      const sig = { ...lista[si] }
      const colorGanador = g === match.id_linea1 ? match.color1 : match.color2
      if (!sig.id_linea1) {
        sig.id_linea1 = g
        sig.color1 = colorGanador || COLOR_CHUNG
        if (match.competidor1?.id_linea === g) sig.competidor1 = match.competidor1
        else if (match.competidor2?.id_linea === g) sig.competidor1 = match.competidor2
      } else if (!sig.id_linea2 && sig.id_linea1 !== g) {
        sig.id_linea2 = g
        sig.color2 = colorGanador || COLOR_HONG
        if (match.competidor1?.id_linea === g) sig.competidor2 = match.competidor1
        else if (match.competidor2?.id_linea === g) sig.competidor2 = match.competidor2
      }
      if (sig.id_linea1 && sig.id_linea2 && sig.estado !== 'finalizado') sig.estado = 'pendiente'
      lista[si] = sig
    }
  }

  if (match.ronda === 2 && match.siguiente_llave) {
    const finIdx = lista.findIndex((c) => c.id_llave === match.siguiente_llave)
    const byeSf = lista.find(
      (s) => s.id_categoria === match.id_categoria && s.ronda === 2 && s.id_llave !== idLlave && s.es_bye && (s.id_linea1 || s.id_linea2)
    )
    if (finIdx >= 0 && byeSf) {
      const fin = { ...lista[finIdx] }
      const byeId = byeSf.id_linea1 || byeSf.id_linea2
      const byeColor = byeSf.id_linea1 === byeId ? byeSf.color1 : byeSf.color2
      const byeComp = byeSf.competidor1 || byeSf.competidor2
      if (fin.id_linea1 && !fin.id_linea2 && fin.id_linea1 !== byeId) {
        fin.id_linea2 = byeId
        fin.color2 = byeColor || COLOR_HONG
        fin.competidor2 = byeComp
      } else if (fin.id_linea2 && !fin.id_linea1 && fin.id_linea2 !== byeId) {
        fin.id_linea1 = byeId
        fin.color1 = byeColor || COLOR_CHUNG
        fin.competidor1 = byeComp
      }
      if (fin.id_linea1 && fin.id_linea2) fin.estado = 'pendiente'
      lista[finIdx] = fin
    }
  }

  return lista
}

export { COLOR_CHUNG, COLOR_HONG }
