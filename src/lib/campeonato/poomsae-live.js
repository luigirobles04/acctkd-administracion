/**
 * Estado en vivo poomsae por área (fallback sin migración en_curso/poomsae_cancha).
 * Se guarda en campeonato.whatsapp_plantillas.__pss_poomsae_live para no requerir DDL.
 */

const LIVE_KEY = '__pss_poomsae_live'

export function stripPoomsaeLiveFromPlantillas(plantillas) {
  if (!plantillas || typeof plantillas !== 'object' || Array.isArray(plantillas)) return plantillas || {}
  const { [LIVE_KEY]: _omit, ...rest } = plantillas
  return rest
}

export async function getPoomsaeLiveState(sb, idCampeonato) {
  const { data, error } = await sb
    .from('campeonato')
    .select('whatsapp_plantillas')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  const live = data?.whatsapp_plantillas?.[LIVE_KEY]
  if (!live || typeof live !== 'object') {
    return { areas: { 1: null, 2: null, 3: null }, updatedAt: null }
  }
  return {
    areas: {
      1: live.areas?.[1] || live.areas?.['1'] || null,
      2: live.areas?.[2] || live.areas?.['2'] || null,
      3: live.areas?.[3] || live.areas?.['3'] || null,
    },
    updatedAt: live.updatedAt || null,
  }
}

export async function setPoomsaeLiveArea(sb, idCampeonato, cancha, slot) {
  const area = Number(cancha) || 1
  if (area < 1 || area > 3) throw new Error('Área inválida (1-3)')

  const { data: camp, error } = await sb
    .from('campeonato')
    .select('whatsapp_plantillas')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error

  const plantillas =
    camp?.whatsapp_plantillas && typeof camp.whatsapp_plantillas === 'object' && !Array.isArray(camp.whatsapp_plantillas)
      ? { ...camp.whatsapp_plantillas }
      : {}

  const prev = plantillas[LIVE_KEY] && typeof plantillas[LIVE_KEY] === 'object' ? plantillas[LIVE_KEY] : {}
  const areas = {
    1: prev.areas?.[1] || prev.areas?.['1'] || null,
    2: prev.areas?.[2] || prev.areas?.['2'] || null,
    3: prev.areas?.[3] || prev.areas?.['3'] || null,
  }

  // Un atleta solo en un área
  if (slot?.id_linea) {
    for (const a of [1, 2, 3]) {
      if (areas[a]?.id_linea === slot.id_linea) areas[a] = null
    }
  }

  areas[area] = slot
    ? {
        id_linea: slot.id_linea,
        id_categoria: slot.id_categoria ?? null,
        forma: slot.forma || '',
        categoria_nombre: slot.categoria_nombre || '',
        dorsal: slot.dorsal || '',
        nombres: slot.nombres || '',
        academia: slot.academia || '',
        academia_logo: slot.academia_logo || '',
        orden: slot.orden ?? null,
        startedAt: new Date().toISOString(),
      }
    : null

  plantillas[LIVE_KEY] = {
    areas,
    updatedAt: new Date().toISOString(),
  }

  const { error: upErr } = await sb
    .from('campeonato')
    .update({ whatsapp_plantillas: plantillas })
    .eq('id_campeonato', idCampeonato)
  if (upErr) throw upErr

  return { areas, updatedAt: plantillas[LIVE_KEY].updatedAt }
}

export async function clearPoomsaeLiveByLinea(sb, idCampeonato, idLinea) {
  const live = await getPoomsaeLiveState(sb, idCampeonato)
  const id = Number(idLinea)
  for (const a of [1, 2, 3]) {
    if (live.areas[a]?.id_linea === id) {
      await setPoomsaeLiveArea(sb, idCampeonato, a, null)
    }
  }
}
