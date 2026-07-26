import { NextResponse } from 'next/server'

/**
 * APIs legacy `/api/inscripcion/academia/[token]/*` — UI ya usa `/portal`.
 * En producción quedan desactivadas salvo ALLOW_LEGACY_INSCRIPCION_TOKEN=1.
 */
export function legacyInscripcionTokenEnabled() {
  if (process.env.ALLOW_LEGACY_INSCRIPCION_TOKEN === '1') return true
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') return false
  return true
}

/** @returns {NextResponse|null} */
export function rejectIfLegacyInscripcionDisabled() {
  if (legacyInscripcionTokenEnabled()) return null
  return NextResponse.json(
    {
      error: 'Inscripción por link/token desactivada. Usa el portal de academias (/portal).',
      code: 'LEGACY_INSCRIPCION_DISABLED',
    },
    { status: 410 },
  )
}
