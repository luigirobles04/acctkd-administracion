// Utilidades de formato para el sistema ACCTKD

export function iniciales(nombres = '', apellidos = '') {
  const n = (nombres || '').trim()
  const a = (apellidos || '').trim()
  return ((n[0] || '') + (a[0] || '')).toUpperCase() || '?'
}

export function edadDesde(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const f = new Date(fechaNacimiento)
  let e = hoy.getFullYear() - f.getFullYear()
  const m = hoy.getMonth() - f.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) e--
  return e
}

export function formatFecha(fecha, opts = {}) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('es-PE', {
    year: opts.year ?? 'numeric',
    month: opts.month ?? 'short',
    day: opts.day ?? '2-digit',
  })
}

export function formatMoney(valor, moneda = 'S/') {
  if (valor === null || valor === undefined) return '—'
  const n = Number(valor)
  if (isNaN(n)) return '—'
  return `${moneda} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatTelefono(tel) {
  if (!tel) return '—'
  const n = String(tel).replace(/\D/g, '')
  if (n.length === 9) return `${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6)}`
  return tel
}

export function waLink(tel, mensaje = '') {
  if (!tel) return null
  const n = String(tel).replace(/\D/g, '')
  const num = n.startsWith('51') ? n : `51${n}`
  const msg = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${num}${msg}`
}

export function formatFechaLarga(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d)) return '—'
  const s = d.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function hoyISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes',     corto: 'Lun' },
  { id: 2, nombre: 'Martes',    corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves',    corto: 'Jue' },
  { id: 5, nombre: 'Viernes',   corto: 'Vie' },
  { id: 6, nombre: 'Sábado',    corto: 'Sáb' },
  { id: 7, nombre: 'Domingo',   corto: 'Dom' },
]

/** Etiquetas de pago: evita colisión entre columnas texto y embeds de catálogo en PostgREST */
export function labelConceptoPago(p) {
  if (!p) return 'Pago'
  return (
    p.concepto_pago?.nombre ||
    (typeof p.concepto === 'string' ? p.concepto : p.concepto?.nombre) ||
    'Pago'
  )
}

export function labelMetodoPago(p) {
  if (!p) return '—'
  return p.metodo_cat?.nombre || (typeof p.metodo === 'object' && p.metodo?.nombre) || p.metodo_pago || '—'
}

/** Grado en historial: embed puede venir como grado, grado_marcial o id_grado resuelto */
export function gradoHistorialLabel(h) {
  const g = h?.grado_marcial || h?.grado
  return g?.nombre || 'Grado'
}

export function gradoHistorialColor(h) {
  const g = h?.grado_marcial || h?.grado
  return g?.color_cinturon || '#999'
}
