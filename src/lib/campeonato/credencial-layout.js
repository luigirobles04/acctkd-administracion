/** Layout por defecto calibrado para plantilla FESTCUP 54×86 mm */
export const DEFAULT_CREDENCIAL_LAYOUT = {
  foto: { type: 'circle', left: 50, top: 43.8, width: 33.5 },
  datos: { left: 4, top: 56, width: 92, height: 22 },
}

/** FestCup 2026 · plantillas deportista / entrenador (foto rectangular) */
export const FESTCUP_2026_CREDENCIAL_LAYOUT = {
  foto: { type: 'rect', left: 50, top: 50.6, width: 44, height: 22.5 },
  datos: { left: 50, top: 70.2, width: 92, height: 7 },
  variant: 'festcup2026',
}

export const FESTCUP_2026_TEMPLATE_DEPORTISTA = '/credenciales/festcup-2026-deportista.jpg'
export const FESTCUP_2026_TEMPLATE_ENTRENADOR = '/credenciales/festcup-2026-entrenador.png'

export function credencialTemplateForLinea(modalidad, { deportistaUrl, entrenadorUrl } = {}) {
  const dep = credencialTemplateSrc(deportistaUrl || FESTCUP_2026_TEMPLATE_DEPORTISTA)
  const ent = credencialTemplateSrc(entrenadorUrl || FESTCUP_2026_TEMPLATE_ENTRENADOR)
  return modalidad === 'oficial' ? ent : dep
}

export function normalizeCredencialLayout(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CREDENCIAL_LAYOUT }
  const base = raw.variant === 'festcup2026' ? FESTCUP_2026_CREDENCIAL_LAYOUT : DEFAULT_CREDENCIAL_LAYOUT
  return {
    variant: raw.variant || base.variant,
    foto: { ...base.foto, ...(raw.foto || {}) },
    datos: { ...base.datos, ...(raw.datos || {}) },
  }
}

export function credencialTemplateSrc(templateUrl) {
  if (!templateUrl?.trim()) return '/credenciales/plantilla-frente.png'
  const v = templateUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v
  return `/api/fotos/competidor?path=${encodeURIComponent(v)}`
}
