import { NextResponse } from 'next/server'
import { getSiteHostname } from '@/lib/site-config'

export function middleware(request) {
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml)$).*)',
  ],
}
