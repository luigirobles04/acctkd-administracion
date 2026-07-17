/** Podios Poomsae — ranking por puntaje (0–10) al cerrar categoría */

import { fetchOrdenPoomsaeCampeonato } from '@/lib/campeonato/poomsae-orden'
import { MEDALLA_EMOJI, MEDALLA_LABEL } from '@/lib/campeonato/podio-kyorugi'

export { MEDALLA_EMOJI, MEDALLA_LABEL }

/**
 * @param {{ participantes: Array<{ id_linea, dorsal, nombres, academia, puntaje, calificado }> }} cat
 */
export function calcularPodioPoomsaeCategoria(cat) {
  const lista = cat?.participantes || []
  if (!lista.length) return { estado: 'sin_inscritos', podio: null }

  const calificados = lista.filter((p) => p.calificado && p.puntaje != null)
  if (!calificados.length) return { estado: 'sin_calificar', podio: null }

  const todosListos = lista.every((p) => p.calificado && p.puntaje != null)
  if (!todosListos && !cat.cerrada) return { estado: 'en_curso', podio: null, progreso: { calificados: calificados.length, total: lista.length } }

  const ordenados = [...calificados].sort((a, b) => b.puntaje - a.puntaje)
  const oro = ordenados[0] || null
  const plata = ordenados[1] || null
  const bronce = ordenados[2] ? [ordenados[2]] : []

  return {
    estado: 'completo',
    podio: {
      oro: oro ? competidorPodio(oro) : null,
      plata: plata ? competidorPodio(plata) : null,
      bronce: bronce.map(competidorPodio).filter(Boolean),
    },
    progreso: { calificados: calificados.length, total: lista.length },
  }
}

function competidorPodio(p) {
  return {
    id_linea: p.id_linea,
    dorsal: p.dorsal || '',
    nombres: p.nombres || '',
    academia: p.academia || '',
    puntaje: p.puntaje,
  }
}

export async function fetchPodiosPoomsaeCampeonato(sb, idCampeonato) {
  const { categorias } = await fetchOrdenPoomsaeCampeonato(sb, idCampeonato)

  const podios = (categorias || []).map((cat) => {
    const { estado, podio, progreso } = calcularPodioPoomsaeCategoria({
      participantes: cat.participantes,
      cerrada: cat.cerrada,
    })
    return {
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      division: cat.division,
      genero: cat.genero,
      estado,
      inscritos: cat.inscritos,
      calificados: cat.calificados,
      progreso,
      podio,
    }
  })

  const resumen = {
    total: podios.length,
    completos: podios.filter((p) => p.estado === 'completo').length,
    enCurso: podios.filter((p) => p.estado === 'en_curso').length,
    sinCalificar: podios.filter((p) => p.estado === 'sin_calificar').length,
  }

  return { podios, resumen }
}
