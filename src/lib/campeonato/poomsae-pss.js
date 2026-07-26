import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { agruparPoomsaePorForma, organizarPantallaPoomsaePorAreas, parseNombrePoomsae } from '@/lib/campeonato/poomsae-formas'

export async function buildPssPoomsaeSnapshot(sb, idCampeonato) {
  const { data: camp, error: campErr } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, lugar, ciudad, fecha_inicio, fecha_fin')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (campErr) throw campErr
  if (!camp) throw new Error('Campeonato no encontrado')

  const { categorias, resumen } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)

  const categoriasPss = (categorias || []).map((c) => {
    const parsed = parseNombrePoomsae(c.nombre)
    return {
      id_categoria: c.id_categoria,
      nombre: c.nombre,
      forma: parsed.forma,
      division: c.division,
      genero: c.genero,
      inscritos: c.inscritos,
      calificados: c.calificados,
      cerrada: c.cerrada,
      sorteada: c.sorteada,
      participantes: (c.participantes || []).map((p) => ({
        id_linea: p.id_linea,
        orden: p.orden,
        dorsal: p.dorsal,
        nombres: p.nombres,
        academia: p.academia,
        academia_logo: p.academia_logo || '',
        puntaje: p.puntaje,
        calificado: p.calificado,
        ausente: Boolean(p.ausente),
        poomsae_cancha: p.poomsae_cancha ?? null,
      })),
    }
  })

  const formas = agruparPoomsaePorForma(categorias).map((f) => ({
    forma: f.forma,
    esRanking: f.esRanking,
    inscritos: f.inscritos,
    calificados: f.calificados,
    pendientes: f.pendientes,
    cerrada: f.cerrada,
    participantes: f.participantes.map((p) => ({
      id_linea: p.id_linea,
      id_categoria: p.id_categoria,
      orden: p.orden,
      dorsal: p.dorsal,
      nombres: p.nombres,
      academia: p.academia,
      academia_logo: p.academia_logo || '',
      categoria_nombre: p.categoria_nombre,
      puntaje: p.puntaje,
      calificado: p.calificado,
      ausente: Boolean(p.ausente),
    })),
  }))

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    campeonato: camp,
    categorias: categoriasPss,
    formas,
    total: resumen.totalParticipantes,
    resumen,
  }
}

/** Marca atleta en pista para zona de llamados (un en_curso por área). */
export async function iniciarParticipantePoomsaePss(sb, idCampeonato, idLinea, { cancha } = {}) {
  const id = Number(idLinea)
  const area = Number(cancha) || null
  if (!id) throw new Error('ID de línea inválido')
  if (area != null && (area < 1 || area > 3)) throw new Error('Área inválida (1-3)')

  const { data: linea, error } = await sb
    .from('linea_inscripcion')
    .select('id_linea, id_campeonato, id_categoria, poomsae_estado')
    .eq('id_linea', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  if (!linea) throw new Error('Competidor no encontrado')
  if (linea.poomsae_estado === 'calificado' || linea.poomsae_estado === 'ausente') {
    throw new Error('Competidor ya calificado')
  }

  // Liberar otros en_curso de la misma área (o de todo el campeonato si no hay área).
  let liberar = sb
    .from('linea_inscripcion')
    .update({ poomsae_estado: 'pendiente', updated_at: new Date().toISOString() })
    .eq('id_campeonato', idCampeonato)
    .eq('poomsae_estado', 'en_curso')
    .neq('id_linea', id)
  if (area) liberar = liberar.eq('poomsae_cancha', area)
  await liberar

  const patch = {
    poomsae_estado: 'en_curso',
    updated_at: new Date().toISOString(),
  }
  if (area) patch.poomsae_cancha = area

  const { data, error: upErr } = await sb
    .from('linea_inscripcion')
    .update(patch)
    .eq('id_linea', id)
    .select('id_linea, id_categoria, poomsae_estado, poomsae_cancha')
    .single()
  if (upErr) {
    if (/poomsae_estado|poomsae_cancha|check constraint/i.test(upErr.message || '')) {
      return { ok: true, linea, soft: true, cancha: area }
    }
    throw upErr
  }

  return { ok: true, linea: data, cancha: area }
}

export async function guardarPuntajePoomsaePss(sb, idCampeonato, idLinea, puntaje, { ausente = false } = {}) {
  const id = Number(idLinea)
  const p = ausente ? 0 : Number(puntaje)
  if (!id) throw new Error('ID de línea inválido')
  if (!ausente && (Number.isNaN(p) || p < 0 || p > 10)) throw new Error('Puntaje inválido (0 a 10)')

  const patch = {
    poomsae_puntaje: Math.round(p * 1000) / 1000,
    poomsae_estado: ausente ? 'ausente' : 'calificado',
    updated_at: new Date().toISOString(),
  }

  let { data, error } = await sb
    .from('linea_inscripcion')
    .update(patch)
    .eq('id_linea', id)
    .eq('id_campeonato', idCampeonato)
    .select('id_linea, id_categoria, poomsae_puntaje, poomsae_estado')
    .single()

  // Sin estado ausente en BD: guardar como calificado 0.
  if (error && ausente && /poomsae_estado|check constraint/i.test(error.message || '')) {
    const retry = await sb
      .from('linea_inscripcion')
      .update({
        poomsae_puntaje: 0,
        poomsae_estado: 'calificado',
        updated_at: new Date().toISOString(),
      })
      .eq('id_linea', id)
      .eq('id_campeonato', idCampeonato)
      .select('id_linea, id_categoria, poomsae_puntaje, poomsae_estado')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  if (!data) throw new Error('Competidor no encontrado')

  return { ok: true, linea: data, ausente: Boolean(ausente) }
}

/** @deprecated usar organizarPantallaPoomsaePorAreas */
export function organizarPantallaPoomsae(categorias) {
  return organizarPantallaPoomsaePorAreas(categorias)
}

export { organizarPantallaPoomsaePorAreas, agruparPoomsaePorForma, parseNombrePoomsae }

export async function fetchResultadosCampeonato(sb, idCampeonato, campMeta) {
  const { fetchPodiosCampeonato } = await import('@/lib/campeonato/podio-kyorugi')
  const { fetchPodiosPoomsaeCampeonato } = await import('@/lib/campeonato/podio-poomsae')
  const { buildMedallero } = await import('@/lib/campeonato/medallero')

  const [kyorugi, poomsae] = await Promise.all([
    fetchPodiosCampeonato(sb, idCampeonato),
    fetchPodiosPoomsaeCampeonato(sb, idCampeonato),
  ])

  const campeonato = campMeta || {}
  const medallero = buildMedallero({ kyorugi, poomsae, campeonato })

  return {
    campeonato: {
      nombre: campeonato.nombre,
      slug: campeonato.slug,
      ciudad: campeonato.ciudad,
      lugar: campeonato.lugar,
    },
    kyorugi: {
      podios: kyorugi.podios.filter((p) => p.estado === 'completo'),
      resumen: kyorugi.resumen,
    },
    poomsae: {
      podios: poomsae.podios.filter((p) => p.estado === 'completo'),
      resumen: poomsae.resumen,
      enCurso: poomsae.podios.filter((p) => p.estado === 'en_curso'),
    },
    medallero,
  }
}
