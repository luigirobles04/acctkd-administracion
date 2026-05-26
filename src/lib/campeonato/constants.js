/** Constantes campeonatos F1 · ACCTKD */

export const MODALIDADES = {
  kyorugi_individual: { label: 'Kyorugi individual', cobra: true, miembros: 1 },
  poomsae_individual: { label: 'Poomsae individual', cobra: true, miembros: 1 },
  poomsae_pareja_reconocida: { label: 'Pareja reconocida', cobra: true, miembros: 2 },
  poomsae_pareja_freestyle: { label: 'Pareja freestyle (mixta)', cobra: true, miembros: 2, soloMixta: true },
  poomsae_equipo: { label: 'Equipo WT (3)', cobra: true, miembros: 3 },
}

export const TARIFAS_FDPTKD_DEFAULT = [
  { modalidad: 'kyorugi_individual', precio_regular: 90, precio_tardia: 120 },
  { modalidad: 'poomsae_individual', precio_regular: 90, precio_tardia: 120 },
  { modalidad: 'poomsae_pareja_reconocida', precio_regular: 140, precio_tardia: 160 },
  { modalidad: 'poomsae_pareja_freestyle', precio_regular: 140, precio_tardia: 160 },
  { modalidad: 'poomsae_equipo', precio_regular: 150, precio_tardia: 180 },
]

export const ROLES_OFICIAL = [
  { value: 'coach', label: 'Coach' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'medico', label: 'Médico' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'jefe_equipo', label: 'Jefe de equipo' },
  { value: 'presidente', label: 'Presidente' },
]

export const MAX_OFICIALES = 3

export const GRADOS_KUP_DAN = [
  '10º kup', '9º kup', '8º kup', '7º kup', '6º kup', '5º kup', '4º kup', '3º kup', '2º kup', '1º kup',
  '1º poom', '2º poom', '3º poom',
  '1º dan', '2º dan', '3º dan', '4º dan', '5º dan',
]

export const DOCUMENTO_TIPOS = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carnet extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
]

export const ESTADOS_LINEA = {
  borrador: { label: 'Borrador', cls: 'badge-gray' },
  pendiente_pago: { label: 'Pendiente pago', cls: 'badge-yellow' },
  pagado: { label: 'Pagado', cls: 'badge-blue' },
  aprobado: { label: 'Aprobado', cls: 'badge-green' },
  anulado: { label: 'Anulado', cls: 'badge-red' },
}

export const TEXTO_LEGAL_BASES = `Al inscribirse, la academia y sus representantes declaran conocer y aceptar las bases, reglamentos técnicos y decisiones del comité organizador del campeonato, incluyendo categorías, pesaje, horarios y sanciones establecidas conforme a la normativa WT y FDPTKD aplicable.`

/** Edad WT: años cumplidos al 31 de diciembre del año del campeonato */
export function edadWT(fechaNacimiento, anioCampeonato) {
  if (!fechaNacimiento) return null
  const fn = new Date(fechaNacimiento)
  const anioNac = fn.getFullYear()
  return anioCampeonato - anioNac
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

export function generarToken(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function whatsappUrl(telefono, mensaje) {
  const tel = String(telefono).replace(/\D/g, '')
  const num = tel.startsWith('51') ? tel : `51${tel}`
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}
