import { edadWT } from '@/lib/campeonato/constants'
import { FESTIVAL_GRUPOS, divisionFestivalPorEdad, compararParticipantesFestival } from '@/lib/campeonato/festival-grupos'

function nombreCompleto(perfil) {
  if (!perfil) return '—'
  return `${perfil.nombres || ''} ${perfil.apellidos || ''}`.trim().toUpperCase() || '—'
}

function academiaNombre(linea) {
  return linea.academia_campeonato?.academia?.nombre || '—'
}

/** Agrupa inscripciones festival aprobadas por división de edad. */
export async function fetchPlanillaFestival(sb, idCampeonato) {
  const { data: campeonato, error: errCamp } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, fecha_inicio, lugar, ciudad')
    .eq('id_campeonato', idCampeonato)
    .single()
  if (errCamp) throw errCamp

  const anio = campeonato.fecha_inicio
    ? new Date(campeonato.fecha_inicio).getFullYear()
    : new Date().getFullYear()

  const { data: lineas, error: errL } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, modalidad, dorsal_display, estado,
      academia_campeonato(academia(nombre)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos, sexo, fecha_nacimiento))
    `)
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'festival')
    .eq('estado', 'aprobado')

  if (errL) throw errL

  const porGrupo = Object.fromEntries(FESTIVAL_GRUPOS.map((g) => [g.key, []]))

  for (const linea of lineas || []) {
    const perfil = linea.miembros?.[0]?.perfil
    const edad = perfil?.fecha_nacimiento ? edadWT(perfil.fecha_nacimiento, anio) : null
    const grupo = divisionFestivalPorEdad(edad)
    if (!grupo) continue

    porGrupo[grupo.key].push({
      id_linea: linea.id_linea,
      dorsal: linea.dorsal_display || '',
      nombre: nombreCompleto(perfil),
      academia: academiaNombre(linea).toUpperCase(),
      sexo: perfil?.sexo === 'M' ? 'M' : perfil?.sexo === 'F' ? 'F' : '—',
      edad,
      division: grupo.division,
    })
  }

  const grupos = FESTIVAL_GRUPOS.map((g) => {
    const participantes = (porGrupo[g.key] || []).sort(compararParticipantesFestival)
    return {
      ...g,
      participantes,
      total: participantes.length,
    }
  })

  const totalParticipantes = grupos.reduce((s, g) => s + g.total, 0)
  const gruposConInscritos = grupos.filter((g) => g.total > 0)

  return {
    campeonato,
    grupos,
    resumen: {
      totalParticipantes,
      gruposConInscritos: gruposConInscritos.length,
    },
  }
}
