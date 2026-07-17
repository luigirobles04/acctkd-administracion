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
