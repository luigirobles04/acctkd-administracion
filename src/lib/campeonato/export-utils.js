/** Utilidades compartidas export (servidor + cliente) */

export function slugArchivo(nombre) {
  return (nombre || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)
}
