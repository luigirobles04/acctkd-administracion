export const LABELS_APROBACION = {
  pendiente: { label: 'Pendiente de aprobación', tone: 'yellow' },
  aprobada: { label: 'Academia aprobada', tone: 'green' },
  rechazada: { label: 'Rechazada', tone: 'red' },
}

export const LABELS_LISTA = {
  en_edicion: { label: 'En edición', tone: 'gray' },
  notificada: { label: 'Lista notificada', tone: 'blue' },
  enviada: { label: 'Lista enviada', tone: 'blue' },
}

export const LABELS_PAGO = {
  pendiente: { label: 'Pago pendiente', tone: 'yellow' },
  parcial: { label: 'Pago parcial', tone: 'yellow' },
  validado: { label: 'Pago validado', tone: 'green' },
}

export function labelEstadoAprobacion(value) {
  return LABELS_APROBACION[value] || LABELS_APROBACION.pendiente
}

export function labelEstadoLista(value) {
  return LABELS_LISTA[value] || { label: 'Sin estado', tone: 'gray' }
}

export function labelEstadoPago(value) {
  return LABELS_PAGO[value] || { label: 'Pago pendiente', tone: 'yellow' }
}

export function portalChipClass(tone) {
  return `portal-chip portal-chip--${tone}`
}
