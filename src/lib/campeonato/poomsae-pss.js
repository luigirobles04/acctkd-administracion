import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'

export async function buildPssPoomsaeSnapshot(sb, idCampeonato) {
  const { data: camp, error: campErr } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, lugar, ciudad, fecha_inicio, fecha_fin')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (campErr) throw campErr
  if (!camp) throw new Error('Campeonato no encontrado')

  const { categorias, resumen } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)

  const categoriasPss = (categorias || []).map((c) => ({
    id_categoria: c.id_categoria,
    nombre: c.nombre,
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
    })),
  }))

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    campeonato: camp,
    categorias: categoriasPss,
    total: resumen.totalParticipantes,
    resumen,
  }
}

/** Marca atleta en pista para zona de llamados (un solo en_curso por campeonato). */
export async function iniciarParticipantePoomsaePss(sb, idCampeonato, idLinea) {
  const id = Number(idLinea)
  if (!id) throw new Error('ID de línea inválido')

  const { data: linea, error } = await sb
    .from('linea_inscripcion')
    .select('id_linea, id_campeonato, id_categoria, poomsae_estado')
    .eq('id_linea', id)
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()
  if (error) throw error
  if (!linea) throw new Error('Competidor no encontrado')
  if (linea.poomsae_estado === 'calificado') throw new Error('Competidor ya calificado')

  // Liberar otros en_curso del mismo campeonato (ignorar si el check aún no admite en_curso).
  await sb
    .from('linea_inscripcion')
    .update({ poomsae_estado: 'pendiente', updated_at: new Date().toISOString() })
    .eq('id_campeonato', idCampeonato)
    .eq('poomsae_estado', 'en_curso')
    .neq('id_linea', id)

  const { data, error: upErr } = await sb
    .from('linea_inscripcion')
    .update({ poomsae_estado: 'en_curso', updated_at: new Date().toISOString() })
    .eq('id_linea', id)
    .select('id_linea, id_categoria, poomsae_estado')
    .single()
  if (upErr) {
    // Sin migración en_curso: no bloquear PSS; llamados usa el primer pendiente.
    if (/poomsae_estado|check constraint/i.test(upErr.message || '')) {
      return { ok: true, linea, soft: true }
    }
    throw upErr
  }

  return { ok: true, linea: data }
}

export async function guardarPuntajePoomsaePss(sb, idCampeonato, idLinea, puntaje) {
  const id = Number(idLinea)
  const p = Number(puntaje)
  if (!id) throw new Error('ID de línea inválido')
  if (Number.isNaN(p) || p < 0 || p > 10) throw new Error('Puntaje inválido (0 a 10)')

  const { data, error } = await sb
    .from('linea_inscripcion')
    .update({
      poomsae_puntaje: Math.round(p * 1000) / 1000,
      poomsae_estado: 'calificado',
      updated_at: new Date().toISOString(),
    })
    .eq('id_linea', id)
    .eq('id_campeonato', idCampeonato)
    .select('id_linea, id_categoria, poomsae_puntaje, poomsae_estado')
    .single()
  if (error) throw error
  if (!data) throw new Error('Competidor no encontrado')

  return { ok: true, linea: data }
}

/** Vista compacta para zona de llamados poomsae. */
export function organizarPantallaPoomsae(categorias) {
  const abiertas = (categorias || []).filter((c) => c.inscritos > 0 && !c.cerrada)
  const enCurso = abiertas.find((c) =>
    (c.participantes || []).some((p) => p.estado === 'en_curso' || (!p.calificado && p.en_curso))
  ) || abiertas.find((c) => (c.participantes || []).some((p) => !p.calificado))

  if (!enCurso) {
    return {
      categoriaActual: null,
      actual: null,
      proximos: [],
      categoriasPendientes: [],
      recientes: (categorias || [])
        .flatMap((c) => (c.participantes || []).filter((p) => p.calificado).map((p) => ({ ...p, categoria_nombre: c.nombre })))
        .slice(-3)
        .reverse(),
      stats: {
        totalCategorias: (categorias || []).filter((c) => c.inscritos > 0).length,
        cerradas: (categorias || []).filter((c) => c.cerrada).length,
        pendientes: 0,
      },
    }
  }

  const parts = enCurso.participantes || []
  const actual =
    parts.find((p) => p.estado === 'en_curso' || p.en_curso) ||
    parts.find((p) => !p.calificado) ||
    null
  const proximos = parts.filter((p) => !p.calificado && p.id_linea !== actual?.id_linea).slice(0, 5)
  const categoriasPendientes = abiertas
    .filter((c) => c.id_categoria !== enCurso.id_categoria)
    .map((c) => ({
      id_categoria: c.id_categoria,
      nombre: c.nombre,
      division: c.division,
      pendientes: (c.participantes || []).filter((p) => !p.calificado).length,
      inscritos: c.inscritos,
      calificados: c.calificados,
    }))

  const recientes = parts
    .filter((p) => p.calificado)
    .slice(-3)
    .reverse()
    .map((p) => ({ ...p, categoria_nombre: enCurso.nombre }))

  return {
    categoriaActual: {
      id_categoria: enCurso.id_categoria,
      nombre: enCurso.nombre,
      division: enCurso.division,
      genero: enCurso.genero,
      inscritos: enCurso.inscritos,
      calificados: enCurso.calificados,
    },
    actual: actual
      ? {
          ...actual,
          categoria_nombre: enCurso.nombre,
        }
      : null,
    proximos: proximos.map((p) => ({ ...p, categoria_nombre: enCurso.nombre })),
    categoriasPendientes,
    recientes,
    stats: {
      totalCategorias: (categorias || []).filter((c) => c.inscritos > 0).length,
      cerradas: (categorias || []).filter((c) => c.cerrada).length,
      pendientes: abiertas.reduce(
        (s, c) => s + (c.participantes || []).filter((p) => !p.calificado).length,
        0
      ),
    },
  }
}

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
