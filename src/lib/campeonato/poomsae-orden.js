/** Orden de salida Poomsae — listado por categoría (no bracket eliminatorio) */

import { MODALIDADES } from '@/lib/campeonato/constants'
import {
  compareGruposPoomsae,
  labelModalidadPoomsae,
  parsePoomsaeGrupoKey,
  poomsaeGrupoKey,
} from '@/lib/campeonato/poomsae-grupo'
import { lineaFaltaPago, lineaVisibleEnPoomsae } from '@/lib/campeonato/poomsae-lineas'
import { sincronizarAprobacionDorsalesAcademia } from '@/lib/campeonato/inscripcion-server'
import {
  miembrosNombresCompletos,
  nombresPoomsaeInline,
  nombresPoomsaeParaLlamado,
} from '@/lib/campeonato/poomsae-nombres'

const MODALIDADES_POOMSAE = Object.keys(MODALIDADES).filter((k) => k.startsWith('poomsae_'))

function nombreCompetidor(linea) {
  return nombresPoomsaeInline(linea)
}

function academiaNombre(linea) {
  return linea.academia_campeonato?.academia?.nombre || linea.academia_nombre || ''
}

function filtrarLineasPoomsaeActivas(lineas) {
  return (lineas || []).filter(lineaVisibleEnPoomsae)
}

async function normalizarDorsalesCampeonato(sb, idCampeonato) {
  const { data: academias } = await sb
    .from('academia_campeonato')
    .select('id')
    .eq('id_campeonato', idCampeonato)
  for (const ac of academias || []) {
    await sincronizarAprobacionDorsalesAcademia(sb, ac.id)
  }
}

export async function fetchOrdenPoomsaeCampeonato(sb, idCampeonato) {
  await normalizarDorsalesCampeonato(sb, idCampeonato)

  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, division, genero, orden')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'poomsae')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const baseCols = `
      id_linea, id_categoria, modalidad, dorsal_display, dorsal_numero, estado,
      precio_aplicado, es_cobro,
      pagos:asignacion_pago(monto),
      academia_campeonato(academia(nombre, logo_url)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(id_perfil, nombres, apellidos, sexo, fecha_nacimiento, grado))
    `
  const queryLineas = () =>
    sb
      .from('linea_inscripcion')
      .select(`orden_poomsae, poomsae_puntaje, poomsae_estado, poomsae_cancha, ${baseCols}`)
      .eq('id_campeonato', idCampeonato)
      .in('modalidad', MODALIDADES_POOMSAE)
      .neq('estado', 'anulado')
      .neq('estado', 'borrador')
      .not('dorsal_numero', 'is', null)
      .order('dorsal_numero', { ascending: true, nullsFirst: false })

  let soporteSorteo = true
  let soporteCalificacion = true
  let { data: lineas, error: errL } = await queryLineas()

  if (errL && /poomsae_cancha/.test(errL.message || '')) {
    const retry = await sb
      .from('linea_inscripcion')
      .select(`orden_poomsae, poomsae_puntaje, poomsae_estado, ${baseCols}`)
      .eq('id_campeonato', idCampeonato)
      .in('modalidad', MODALIDADES_POOMSAE)
      .neq('estado', 'anulado')
      .neq('estado', 'borrador')
      .not('dorsal_numero', 'is', null)
      .order('dorsal_numero', { ascending: true, nullsFirst: false })
    lineas = retry.data
    errL = retry.error
  }

  if (errL && /poomsae_puntaje|poomsae_estado/.test(errL.message || '')) {
    soporteCalificacion = false
    const retry = await sb
      .from('linea_inscripcion')
      .select(`orden_poomsae, ${baseCols}`)
      .eq('id_campeonato', idCampeonato)
      .in('modalidad', MODALIDADES_POOMSAE)
      .neq('estado', 'anulado')
      .neq('estado', 'borrador')
      .not('dorsal_numero', 'is', null)
      .order('dorsal_numero', { ascending: true, nullsFirst: false })
    lineas = retry.data
    errL = retry.error
  }

  if (errL && /orden_poomsae/.test(errL.message || '')) {
    soporteSorteo = false
    soporteCalificacion = false
    const retry = await sb
      .from('linea_inscripcion')
      .select(baseCols)
      .eq('id_campeonato', idCampeonato)
      .in('modalidad', MODALIDADES_POOMSAE)
      .neq('estado', 'anulado')
      .neq('estado', 'borrador')
      .not('dorsal_numero', 'is', null)
      .order('dorsal_numero', { ascending: true, nullsFirst: false })
    lineas = retry.data
    errL = retry.error
  }
  if (errL) throw errL

  lineas = filtrarLineasPoomsaeActivas(lineas)

  const catMeta = new Map((categorias || []).map((c) => [c.id_categoria, c]))

  const porGrupo = (lineas || []).reduce((acc, l) => {
    if (!l.id_categoria || !l.modalidad) return acc
    const key = poomsaeGrupoKey(l.id_categoria, l.modalidad)
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  const categoriasOut = Object.entries(porGrupo).map(([grupoKey, items]) => {
    const parsed = parsePoomsaeGrupoKey(grupoKey)
    const cat = catMeta.get(parsed?.idCategoria) || {
      nombre: 'Poomsae',
      division: '',
      genero: '',
      orden: 9999,
    }
    const modalidadKey = parsed?.modalidad || items[0]?.modalidad
    const sorteada = items.some((l) => l.orden_poomsae != null)
    const ordenados = [...items].sort((a, b) => {
      const oa = a.orden_poomsae
      const ob = b.orden_poomsae
      if (oa != null && ob != null) return oa - ob
      if (oa != null) return -1
      if (ob != null) return 1
      return (a.dorsal_numero ?? 1e9) - (b.dorsal_numero ?? 1e9)
    })
    const inscritos = ordenados.map((l, i) => {
      const faltaPago = lineaFaltaPago(l)
      const perfil = l.miembros?.[0]?.perfil
      return {
        orden: i + 1,
        id_linea: l.id_linea,
        id_categoria: l.id_categoria,
        dorsal: l.dorsal_display || '',
        modalidad: MODALIDADES[l.modalidad]?.label || l.modalidad,
        modalidad_key: l.modalidad,
        nombres: nombreCompetidor(l),
        nombres_llamado: nombresPoomsaeParaLlamado(l),
        miembros_nombres: miembrosNombresCompletos(l),
        academia: academiaNombre(l),
        academia_logo: l.academia_campeonato?.academia?.logo_url || '',
        puntaje: l.poomsae_puntaje ?? null,
        calificado: l.poomsae_estado === 'calificado' || l.poomsae_estado === 'ausente',
        en_curso: l.poomsae_estado === 'en_curso',
        ausente: l.poomsae_estado === 'ausente',
        estado: l.poomsae_estado || 'pendiente',
        linea_estado: l.estado,
        faltaPago,
        perfil,
        poomsae_cancha: l.poomsae_cancha ?? null,
      }
    })
    const calificados = inscritos.filter((p) => p.calificado).length
    return {
      grupo_key: grupoKey,
      id_categoria: parsed?.idCategoria ?? cat.id_categoria,
      modalidad_key: modalidadKey,
      nombre: cat.nombre,
      nombre_display: `${cat.nombre} — ${labelModalidadPoomsae(modalidadKey)}`,
      division: cat.division,
      genero: cat.genero,
      orden: cat.orden ?? 9999,
      inscritos: inscritos.length,
      sorteada,
      calificados,
      cerrada: inscritos.length > 0 && calificados === inscritos.length,
      participantes: inscritos,
    }
  })

  categoriasOut.sort(compareGruposPoomsae)

  const conInscritos = categoriasOut.filter((c) => c.inscritos > 0)
  const todosParticipantes = conInscritos.flatMap((c) => c.participantes)
  const pendientesPago = todosParticipantes.filter((p) => p.faltaPago)

  const { data: sinDorsal } = await sb
    .from('linea_inscripcion')
    .select(
      `id_linea, modalidad, estado, dorsal_display,
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))`,
    )
    .eq('id_campeonato', idCampeonato)
    .in('modalidad', MODALIDADES_POOMSAE)
    .neq('estado', 'anulado')
    .is('dorsal_numero', null)

  const sinLista = (sinDorsal || []).map((l) => ({
    id_linea: l.id_linea,
    dorsal: l.dorsal_display || '—',
    estado: l.estado,
    nombres: nombreCompetidor(l),
  }))

  const resumen = {
    totalCategorias: categoriasOut.length,
    conInscritos: conInscritos.length,
    totalParticipantes: conInscritos.reduce((s, c) => s + c.inscritos, 0),
    pendientesPago: pendientesPago.length,
    pendientesPagoLista: pendientesPago.map((p) => ({
      id_linea: p.id_linea,
      dorsal: p.dorsal,
      nombres: p.nombres,
    })),
    sinDorsal: sinLista.length,
    sinDorsalLista: sinLista,
    excluidosPago: pendientesPago.length,
    excluidos: pendientesPago.map((p) => ({
      id_linea: p.id_linea,
      dorsal: p.dorsal,
      estado: 'pendiente pago',
      nombres: p.nombres,
    })),
    soporteSorteo,
    soporteCalificacion,
  }

  return { categorias: categoriasOut, resumen, soporteSorteo, soporteCalificacion }
}

export { MODALIDADES_POOMSAE }
