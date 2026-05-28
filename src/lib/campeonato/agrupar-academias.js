/** Agrupa líneas por academia_campeonato */
export function agruparLineasPorAcademia(lineas, academias = []) {
  const map = new Map()

  for (const ac of academias) {
    map.set(ac.id, {
      id: ac.id,
      nombre: ac.academia?.nombre || ac.nombre || `Academia #${ac.id}`,
      monto_total: Number(ac.monto_total || 0),
      monto_asignado: Number(ac.monto_asignado || 0),
      lineas: [],
    })
  }

  for (const l of lineas || []) {
    const id = l.id_academia_campeonato
    if (!map.has(id)) {
      map.set(id, {
        id,
        nombre: l.academia_campeonato?.academia?.nombre || `Academia #${id}`,
        monto_total: 0,
        monto_asignado: 0,
        lineas: [],
      })
    }
    map.get(id).lineas.push(l)
  }

  return [...map.values()]
    .filter((g) => g.lineas.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Filtra líneas dentro de un grupo expandido */
export function filtrarLineasGrupo(lineas, { buscar = '', modalidad = 'todas' } = {}) {
  const q = buscar.trim().toLowerCase()
  return (lineas || []).filter((l) => {
    if (modalidad && modalidad !== 'todas' && l.modalidad !== modalidad) return false
    if (!q) return true
    const nombre = nombreParticipanteLinea(l).toLowerCase()
    const dorsal = (l.dorsal_display || '').toLowerCase()
    const cat = (l.categoria?.nombre || '').toLowerCase()
    const mod = (l.modalidad || '').replace(/_/g, ' ').toLowerCase()
    return nombre.includes(q) || dorsal.includes(q) || cat.includes(q) || mod.includes(q)
  })
}

export function modalidadesEnLineas(lineas) {
  return [...new Set((lineas || []).map((l) => l.modalidad).filter(Boolean))]
}

export function nombreParticipanteLinea(l) {
  return (l.miembros || [])
    .map((m) => [m.perfil?.nombres, m.perfil?.apellidos].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' · ') || '—'
}
