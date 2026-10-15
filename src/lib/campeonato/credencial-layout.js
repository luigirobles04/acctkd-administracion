/** Layout por defecto calibrado para plantilla FESTCUP 54×86 mm */
export const DEFAULT_CREDENCIAL_LAYOUT = {
  foto: { type: 'circle', left: 50, top: 43.8, width: 33.5 },
  datos: { left: 4, top: 56, width: 92, height: 22 },
}

/** FestCup 2026 · plantillas limpias (rol en JPG) + foto, nombre, categoría y logo academia */
export const FESTCUP_2026_CREDENCIAL_LAYOUT = {
  foto: { type: 'rect', left: 50, top: 50.55, width: 37.2, height: 24 },
  /** Debajo del rol impreso en la plantilla (DEPORTISTA / ENTRENADOR) */
  nombre: { left: 50, top: 79.6, width: 88 },
  categoria: { left: 50, top: 82.8, width: 88 },
  datos: { left: 50, top: 74.9, width: 90, height: 10 },
  academiaLogo: { left: 77, top: 35.5, width: 10.5, opacity: 0.28, borderRadius: '22%' },
  rolOnTemplate: true,
  variant: 'festcup2026',
}

export const FESTCUP_2026_TEMPLATE_DEPORTISTA = '/credenciales/festcup-2026-plantilla-deportista.jpg'
export const FESTCUP_2026_TEMPLATE_ENTRENADOR = '/credenciales/festcup-2026-plantilla-entrenador.jpg'
/** @deprecated usar plantilla deportista/entrenador */
export const FESTCUP_2026_TEMPLATE_BASE = FESTCUP_2026_TEMPLATE_DEPORTISTA

export function credencialRolFestcup2026(modalidad) {
  const m = `${modalidad || ''}`.toLowerCase()
  if (m === 'oficial' || m.includes('entrenador') || m.includes('coach')) return 'ENTRENADOR'
  return 'DEPORTISTA'
}

export function isFestcup2026Credencial({ layout, templateUrl } = {}) {
  if (layout?.variant === 'festcup2026') return true
  const tpl = `${templateUrl || ''}`
  return tpl.includes('festcup-2026')
}

export function credencialTemplateForLinea(modalidad, { deportistaUrl, entrenadorUrl } = {}) {
  const m = `${modalidad || ''}`.toLowerCase()
  const coach = m === 'oficial' || m.includes('entrenador') || m.includes('coach')
  const festcup =
    `${deportistaUrl || ''}`.includes('festcup-2026') || `${entrenadorUrl || ''}`.includes('festcup-2026')
  if (festcup || (!deportistaUrl && !entrenadorUrl)) {
    return coach ? FESTCUP_2026_TEMPLATE_ENTRENADOR : FESTCUP_2026_TEMPLATE_DEPORTISTA
  }
  return credencialTemplateSrc(coach ? entrenadorUrl || deportistaUrl : deportistaUrl || entrenadorUrl)
}

export function normalizeCredencialLayout(raw, opts = {}) {
  const templateUrl = opts.templateUrl || ''
  const festcupTpl = templateUrl.includes('festcup-2026')
  if (!raw || typeof raw !== 'object') {
    return festcupTpl ? { ...FESTCUP_2026_CREDENCIAL_LAYOUT } : { ...DEFAULT_CREDENCIAL_LAYOUT }
  }
  const isFestcup = raw.variant === 'festcup2026' || festcupTpl
  const base = isFestcup ? FESTCUP_2026_CREDENCIAL_LAYOUT : DEFAULT_CREDENCIAL_LAYOUT
  return {
    variant: isFestcup ? 'festcup2026' : raw.variant,
    foto: { ...base.foto, ...(raw.foto || {}) },
    rol: { ...(base.rol || {}), ...(raw.rol || {}) },
    datos: { ...base.datos, ...(raw.datos || {}) },
    nombre: { ...(base.nombre || base.datos || {}), ...(raw.nombre || {}) },
    categoria: { ...(base.categoria || {}), ...(raw.categoria || {}) },
    academiaLogo: { ...(base.academiaLogo || {}), ...(raw.academiaLogo || {}) },
    rolOnTemplate: raw.rolOnTemplate ?? base.rolOnTemplate ?? false,
  }
}

export function credencialTemplateSrc(templateUrl) {
  if (!templateUrl?.trim()) return '/credenciales/plantilla-frente.png'
  const v = templateUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v
  return `/api/fotos/competidor?path=${encodeURIComponent(v)}`
}
