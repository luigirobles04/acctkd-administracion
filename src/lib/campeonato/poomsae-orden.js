/** Orden de salida Poomsae — listado por categoría (no bracket eliminatorio) */

import { MODALIDADES } from '@/lib/campeonato/constants'

const MODALIDADES_POOMSAE = Object.keys(MODALIDADES).filter((k) => k.startsWith('poomsae_'))

function nombreCompetidor(linea) {
  const miembros = linea.miembros || []
  if (!miembros.length) return linea.dorsal_display || '—'
  return miembros
    .map((m) => {
      const p = m.perfil
      if (!p) return ''
      return `${p.nombres || ''} ${p.apellidos || ''}`.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

function academiaNombre(linea) {
  return linea.academia_campeonato?.academia?.nombre || linea.academia_nombre || ''
}

export async function fetchOrdenPoomsaeCampeonato(sb, idCampeonato) {
  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, division, genero, orden')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'poomsae')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const { data: lineas, error: errL } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, id_categoria, modalidad, dorsal_display, dorsal_numero, estado,
      academia_campeonato(academia(nombre)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
    `)
    .eq('id_campeonato', idCampeonato)
    .in('modalidad', MODALIDADES_POOMSAE)
    .eq('estado', 'aprobado')
    .order('dorsal_numero', { ascending: true, nullsFirst: false })
  if (errL) throw errL

  const porCat = (lineas || []).reduce((acc, l) => {
    if (!l.id_categoria) return acc
    if (!acc[l.id_categoria]) acc[l.id_categoria] = []
    acc[l.id_categoria].push(l)
    return acc
  }, {})

  const categoriasOut = (categorias || []).map((cat, idx) => {
    const inscritos = (porCat[cat.id_categoria] || []).map((l, i) => ({
      orden: i + 1,
      id_linea: l.id_linea,
      dorsal: l.dorsal_display || '',
      modalidad: MODALIDADES[l.modalidad]?.label || l.modalidad,
      nombres: nombreCompetidor(l),
      academia: academiaNombre(l),
    }))
    return {
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      division: cat.division,
      genero: cat.genero,
      inscritos: inscritos.length,
      participantes: inscritos,
    }
  })

  const conInscritos = categoriasOut.filter((c) => c.inscritos > 0)
  const resumen = {
    totalCategorias: categoriasOut.length,
    conInscritos: conInscritos.length,
    totalParticipantes: conInscritos.reduce((s, c) => s + c.inscritos, 0),
  }

  return { categorias: categoriasOut, resumen }
}

export { MODALIDADES_POOMSAE }
