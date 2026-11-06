import { esModalidadGrupo } from '@/lib/campeonato/validar-grupo'

/** Nombres completos de cada integrante de la línea (pareja/equipo/individual). */
export function miembrosNombresCompletos(linea) {
  return (linea?.miembros || [])
    .map((m) => {
      const p = m.perfil
      if (!p) return ''
      return `${p.nombres || ''} ${p.apellidos || ''}`.trim()
    })
    .filter(Boolean)
}

export function nombresPoomsaeParaLlamado(linea) {
  const lista = miembrosNombresCompletos(linea)
  if (!lista.length) return linea?.dorsal_display || '—'
  const mod = linea?.modalidad_key ?? linea?.modalidad
  if (esModalidadGrupo(mod)) {
    return lista.join('\n')
  }
  return lista.join(' · ')
}

export function nombresPoomsaeInline(linea) {
  const lista = miembrosNombresCompletos(linea)
  if (!lista.length) return linea?.dorsal_display || '—'
  return lista.join(' · ')
}
