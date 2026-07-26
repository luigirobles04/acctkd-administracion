import { NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth-session'
import { rolPermitido } from '@/lib/admin-roles'

export { ROLES_PANEL, ROLES_ARBITRO, rolPermitido } from '@/lib/admin-roles'

/**
 * Guard server-side para handlers admin (defensa en profundidad junto al middleware).
 * @returns {null | NextResponse} null si OK; NextResponse de error si denegado
 */
export function guardAdminSession(request, scope = 'panel') {
  const session = getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!rolPermitido(session.rol, scope)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  return null
}

export function readOpsKey(request, body) {
  const header = request.headers.get('x-acctkd-ops-key')?.trim()
  if (header) return header
  if (body && typeof body.clave === 'string') return body.clave.trim()
  return null
}

/** Ops key dedicada (NO reusar CRON_SECRET: si se filtra amplía el impacto). */
export function opsKeyValida(clave) {
  const esperada = process.env.ACCTKD_OPS_KEY || ''
  return Boolean(esperada && clave && clave === esperada)
}
