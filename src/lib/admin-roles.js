/** Roles con acceso al panel admin de campeonatos */
export const ROLES_PANEL = new Set(['admin', 'admin_campeonato', 'organizador'])

/** Roles que pueden registrar resultados en pista (web /arbitro) */
export const ROLES_ARBITRO = new Set(['admin', 'admin_campeonato', 'organizador', 'arbitro_mesa'])

export function rolPermitido(rol, scope) {
  if (!rol) return false
  if (scope === 'full') return rol === 'admin'
  if (scope === 'panel') return ROLES_PANEL.has(rol)
  if (scope === 'arbitro') return ROLES_ARBITRO.has(rol)
  return false
}
