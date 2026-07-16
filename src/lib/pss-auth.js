/**
 * Autenticación para dispositivos PSS (Unity en pista).
 * Token: header `X-PSS-Token` o `Authorization: Bearer <token>`.
 * Secreto global: PSS_API_SECRET en env. Opcional por campeonato: campeonato.pss_token.
 */
export function readPssToken(request) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim()
  return request.headers.get('x-pss-token')?.trim() || null
}

export function getGlobalPssSecret() {
  return process.env.PSS_API_SECRET || 'acctkd-pss-dev-2026'
}

export async function verifyPssAccess(sb, request, idCampeonato) {
  const token = readPssToken(request)
  if (!token) return { ok: false, status: 401, error: 'Token PSS requerido (X-PSS-Token)' }

  const global = getGlobalPssSecret()
  if (token === global) return { ok: true }

  const { data: camp } = await sb
    .from('campeonato')
    .select('id_campeonato, pss_token')
    .eq('id_campeonato', idCampeonato)
    .maybeSingle()

  if (!camp) return { ok: false, status: 404, error: 'Campeonato no encontrado' }
  if (camp.pss_token && token === camp.pss_token) return { ok: true }

  return { ok: false, status: 403, error: 'Token PSS inválido' }
}
