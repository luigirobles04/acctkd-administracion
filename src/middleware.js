import { NextResponse } from 'next/server'
import { getSiteHostname } from '@/lib/site-config'
import { getSessionFromRequestEdge } from '@/lib/auth-session-edge'
import { ROLES_PANEL, rolPermitido } from '@/lib/admin-roles'

/** Ops key dedicada (NO reusar CRON_SECRET: si se filtra amplía el impacto). */
function opsKeyValida(clave) {
  const esperada = process.env.ACCTKD_OPS_KEY || ''
  return Boolean(esperada && clave && clave === esperada)
}

/** Scope requerido por ruta admin; null = sin auth de sesión */
function adminApiScope(pathname, method) {
  if (!pathname.startsWith('/api/admin/')) return null

  if (pathname === '/api/admin/inscripcion' && method === 'POST') return null

  // Seed/demo: sesión admin u ops key (scripts de producción usan X-Acctkd-Ops-Key)
  if (pathname.includes('/seed-prueba-llaves') || pathname.includes('/enriquecer-demo')) {
    return 'ops_or_full'
  }

  if (pathname.startsWith('/api/admin/usuarios')) return 'full'

  if (pathname.includes('/llaves') && method === 'PATCH' && pathname.endsWith('/llaves')) {
    return 'ops_or_panel'
  }

  const arbitroReadWrite =
    /\/llaves\/canchas$/.test(pathname) ||
    /\/llaves\/combate$/.test(pathname) ||
    /\/poomsae\/puntaje$/.test(pathname) ||
    (/\/poomsae$/.test(pathname) && method === 'GET')

  if (arbitroReadWrite) return 'arbitro'

  if (/\/poomsae$/.test(pathname) && method === 'POST') return 'panel'

  return 'panel'
}

function landingApiScope(pathname, method) {
  if (pathname === '/api/landing' && method === 'PATCH') return 'full'
  if (pathname === '/api/landing/imagen' && method === 'POST') return 'full'
  return null
}

function unauthorized(msg = 'No autorizado') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

function forbidden(msg = 'Sin permiso') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export async function middleware(request) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const canonical = getSiteHostname()

  if (host.startsWith('www.') && canonical && !host.endsWith('.vercel.app')) {
    const bare = host.replace(/^www\./, '')
    if (bare === canonical) {
      const url = request.nextUrl.clone()
      url.hostname = canonical
      url.protocol = 'https'
      return NextResponse.redirect(url, 308)
    }
  }

  const { pathname } = request.nextUrl
  const method = request.method.toUpperCase()

  const scope =
    adminApiScope(pathname, method) ??
    landingApiScope(pathname, method)

  if (scope) {
    const esScopeOps = scope === 'ops_or_panel' || scope === 'ops_or_full'
    if (esScopeOps) {
      const opsHeader = request.headers.get('x-acctkd-ops-key')?.trim()
      if (opsKeyValida(opsHeader)) return NextResponse.next()
    }

    const session = await getSessionFromRequestEdge(request)
    if (!session) return unauthorized()

    if (scope === 'ops_or_panel') {
      if (!ROLES_PANEL.has(session.rol)) return forbidden()
      return NextResponse.next()
    }

    const scopeSesion = scope === 'ops_or_full' ? 'full' : scope
    if (!rolPermitido(session.rol, scopeSesion)) return forbidden()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml)$).*)',
  ],
}
