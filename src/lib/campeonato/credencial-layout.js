/** Layout por defecto calibrado para plantilla FESTCUP 54×86 mm */
export const DEFAULT_CREDENCIAL_LAYOUT = {
  foto: { type: 'circle', left: 50, top: 43.8, width: 33.5 },
  datos: { left: 4, top: 56, width: 92, height: 22 },
}

/** FestCup 2026 · plantilla base en blanco + rol/nombre en HTML (como diseño oficial) */
export const FESTCUP_2026_CREDENCIAL_LAYOUT = {
  foto: { type: 'rect', left: 50, top: 47.8, width: 38.5, height: 27.2 },
  rol: { left: 50, top: 62.6, width: 100 },
  datos: { left: 50, top: 61.5, width: 94, height: 18 },
  academiaLogo: { left: 78, top: 36, width: 11, opacity: 0.32 },
  variant: 'festcup2026',
}

export const FESTCUP_2026_TEMPLATE_BASE = '/credenciales/festcup-2026-base.jpg'

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
  void modalidad
  const url = `${deportistaUrl || entrenadorUrl || ''}`
  if (!url || url.includes('festcup-2026')) return FESTCUP_2026_TEMPLATE_BASE
  return credencialTemplateSrc(deportistaUrl || entrenadorUrl)
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
    academiaLogo: { ...(base.academiaLogo || {}), ...(raw.academiaLogo || {}) },
  }
}

export function credencialTemplateSrc(templateUrl) {
  if (!templateUrl?.trim()) return '/credenciales/plantilla-frente.png'
  const v = templateUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v
  return `/api/fotos/competidor?path=${encodeURIComponent(v)}`
}
