/** Layout por defecto calibrado para plantilla FESTCUP 54×86 mm */
export const DEFAULT_CREDENCIAL_LAYOUT = {
  foto: { type: 'circle', left: 50, top: 43.8, width: 33.5 },
  datos: { left: 4, top: 56, width: 92, height: 22 },
}

/** FestCup 2026 · plantilla base en blanco + rol/nombre en HTML (como diseño oficial) */
export const FESTCUP_2026_CREDENCIAL_LAYOUT = {
  foto: { type: 'rect', left: 50, top: 47.8, width: 38.5, height: 27.2 },
  rol: { left: 50, top: 62.6, width: 100 },
  datos: { left: 50, top: 69.2, width: 94, height: 11 },
  variant: 'festcup2026',
}

export const FESTCUP_2026_TEMPLATE_BASE = '/credenciales/festcup-2026-base.jpg'

export function credencialRolFestcup2026(modalidad) {
  return modalidad === 'oficial' ? 'ENTRENADOR' : 'DEPORTISTA'
}

export function credencialTemplateForLinea(modalidad, { deportistaUrl, entrenadorUrl } = {}) {
  void modalidad
  const url = `${deportistaUrl || entrenadorUrl || ''}`
  if (!url || url.includes('festcup-2026')) return FESTCUP_2026_TEMPLATE_BASE
  return credencialTemplateSrc(deportistaUrl || entrenadorUrl)
}

export function normalizeCredencialLayout(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CREDENCIAL_LAYOUT }
  const base = raw.variant === 'festcup2026' ? FESTCUP_2026_CREDENCIAL_LAYOUT : DEFAULT_CREDENCIAL_LAYOUT
  return {
    variant: raw.variant || base.variant,
    foto: { ...base.foto, ...(raw.foto || {}) },
    rol: { ...(base.rol || {}), ...(raw.rol || {}) },
    datos: { ...base.datos, ...(raw.datos || {}) },
  }
}

export function credencialTemplateSrc(templateUrl) {
  if (!templateUrl?.trim()) return '/credenciales/plantilla-frente.png'
  const v = templateUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v
  return `/api/fotos/competidor?path=${encodeURIComponent(v)}`
}
