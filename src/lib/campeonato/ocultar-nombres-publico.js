/** Quita el nombre del competidor en pantallas y marcadores. Deja dorsal y academia. */
export function ocultarNombresPublicos(value) {
  if (Array.isArray(value)) return value.map(ocultarNombresPublicos)
  if (!value || typeof value !== 'object') return value
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === 'nombres' || key === 'nombres_llamado') out[key] = ''
    else if (key === 'miembros_nombres') out[key] = []
    else out[key] = ocultarNombresPublicos(item)
  }
  return out
}
