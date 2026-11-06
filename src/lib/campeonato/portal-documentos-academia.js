/**
 * Portal: ficha nominal y credenciales.
 * FestCup 2026 — academias aprobadas (no rechazadas).
 */

export function portalPuedeVerFichaYCredenciales(slug, academiaCampeonato) {
  if (!slug || !academiaCampeonato?.id) return false
  if (slug !== 'festcup-2026') return false
  if (academiaCampeonato.estado_aprobacion === 'rechazada') return false
  return true
}
