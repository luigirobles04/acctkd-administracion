/**
 * Academias autorizadas a descargar ficha nominal e imprimir credenciales desde el portal.
 * FestCup 2026: Fernando Yupanqui, Christopher Cabrera, UCV Trujillo.
 */

const FESTCUP_2026_ACADEMIA_CAMPEONATO_IDS = new Set([
  246, // asociacion christopher cabrera · ACC
  249, // TAEKWONDO FERNANDO YUPANQUI · FY
  243, // UCV TRUJILLO · UT
])

const FESTCUP_2026_PREFIJOS = new Set(['ACC', 'FY', 'UT'])

export function portalPuedeVerFichaYCredenciales(slug, academiaCampeonato) {
  if (!slug || !academiaCampeonato?.id) return false
  if (slug !== 'festcup-2026') return false
  if (FESTCUP_2026_ACADEMIA_CAMPEONATO_IDS.has(Number(academiaCampeonato.id))) return true
  const pref = academiaCampeonato.academia?.codigo_prefijo || academiaCampeonato.codigo_prefijo
  return pref ? FESTCUP_2026_PREFIJOS.has(String(pref).toUpperCase()) : false
}
