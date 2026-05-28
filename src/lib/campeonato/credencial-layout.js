/** Layout por defecto calibrado para plantilla FESTCUP 54×86 mm */
export const DEFAULT_CREDENCIAL_LAYOUT = {
  foto: { type: 'circle', left: 50, top: 43.8, width: 33.5 },
  datos: { left: 4, top: 56, width: 92, height: 22 },
}

export function normalizeCredencialLayout(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CREDENCIAL_LAYOUT }
  return {
    foto: { ...DEFAULT_CREDENCIAL_LAYOUT.foto, ...(raw.foto || {}) },
    datos: { ...DEFAULT_CREDENCIAL_LAYOUT.datos, ...(raw.datos || {}) },
  }
}

export function credencialTemplateSrc(templateUrl) {
  if (!templateUrl?.trim()) return '/credenciales/plantilla-frente.png'
  const v = templateUrl.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v
  return `/api/fotos/competidor?path=${encodeURIComponent(v)}`
}
