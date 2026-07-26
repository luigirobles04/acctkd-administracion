import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { agruparPoomsaePorForma, organizarPantallaPoomsaePorAreas, parseNombrePoomsae } from '@/lib/campeonato/poomsae-formas'
import { clearPoomsaeLiveByLinea, getPoomsaeLiveState, setPoomsaeLiveArea } from '@/lib/campeonato/poomsae-live'

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
  const area = Math.min(3, Math.max(1, Number(cancha) || 1))
  if (!id) throw new Error('ID de línea inválido')

  const { data: linea, error } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, id_campeonato, id_categoria, poomsae_estado, dorsal_display, orden_poomsae,
      academia_campeonato(academia(nombre, logo_url)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos)),
      categoria:categoria_campeonato(nombre)
    `)
    .eq('id_linea', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  if (!linea) throw new Error('Competidor no encontrado')
  if (linea.poomsae_estado === 'calificado' || linea.poomsae_estado === 'ausente') {
    throw new Error('Competidor ya calificado')
  }

  // Liberar otros en_curso de la misma área (si la columna/estado existen).
  try {
    let liberar = sb
      .from('linea_inscripcion')
      .update({ poomsae_estado: 'pendiente', updated_at: new Date().toISOString() })
      .eq('id_campeonato', idCampeonato)
      .eq('poomsae_estado', 'en_curso')
      .neq('id_linea', id)
    liberar = liberar.eq('poomsae_cancha', area)
    await liberar
  } catch {
    /* ignore */
  }

  const patch = {
    poomsae_estado: 'en_curso',
    poomsae_cancha: area,
    updated_at: new Date().toISOString(),
  }

  let data = null
  let soft = false
  const { data: updated, error: upErr } = await sb
    .from('linea_inscripcion')
    .update(patch)
    .eq('id_linea', id)
    .select('id_linea, id_categoria, poomsae_estado, poomsae_cancha')
    .single()
  if (upErr) {
    if (/poomsae_estado|poomsae_cancha|check constraint|PGRST204|schema cache/i.test(upErr.message || '')) {
      soft = true
      data = linea
    } else {
      throw upErr
    }
  } else {
    data = updated
  }

  // Siempre escribir overlay en vivo (llamados se actualiza aunque falle el check constraint).
  const catNombre = linea.categoria?.nombre || ''
  const { forma } = parseNombrePoomsae(catNombre)
  const nombres = (linea.miembros || [])
    .map((m) => `${m.perfil?.nombres || ''} ${m.perfil?.apellidos || ''}`.trim())
    .filter(Boolean)
    .join(' · ')
  await setPoomsaeLiveArea(sb, idCampeonato, area, {
    id_linea: id,
    id_categoria: linea.id_categoria,
    forma,
    categoria_nombre: catNombre,
    dorsal: linea.dorsal_display || '',
    nombres,
    academia: linea.academia_campeonato?.academia?.nombre || '',
    academia_logo: linea.academia_campeonato?.academia?.logo_url || '',
    orden: linea.orden_poomsae,
  })

  return { ok: true, linea: data, cancha: area, soft }
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

  try {
    await clearPoomsaeLiveByLinea(sb, idCampeonato, id)
  } catch {
    /* overlay opcional */
  }

  return { ok: true, linea: data, ausente: Boolean(ausente) }
}

/** @deprecated usar organizarPantallaPoomsaePorAreas */
export function organizarPantallaPoomsae(categorias, opts) {
  return organizarPantallaPoomsaePorAreas(categorias, opts)
}

export { getPoomsaeLiveState }

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
