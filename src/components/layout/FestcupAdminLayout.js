'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  festcupAllowedPath,
  festcupEventBasePath,
  festcupHubSections,
  FESTCUP_EVENT_ID,
  isFestcupEventAdmin,
} from '@/lib/festcup-event-admin'
import { getCurrentUser, logout } from '@/lib/services/auth.service'
import { whatsappUrl } from '@/lib/campeonato/constants'
import './festcup-admin.css'

const MOBILE_TABS = [
  { href: '/admin/festcup', icon: 'home', label: 'Inicio' },
  { href: `${festcupEventBasePath()}/academias`, icon: 'school', label: 'Academias' },
  { href: `${festcupEventBasePath()}/pagos`, icon: 'payments', label: 'Pagos' },
  { href: `${festcupEventBasePath()}/credenciales`, icon: 'badge', label: 'Cred.' },
  { href: `${festcupEventBasePath()}/arbitros`, icon: 'gavel', label: 'Árbitros' },
]

export default function FestcupAdminLayout({ children, title, subtitle, actions, waPhone }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null
    const u = getCurrentUser()
    return u && isFestcupEventAdmin(u) ? u : null
  })
  const [routePulse, setRoutePulse] = useState(false)
  const prevPath = useRef(pathname)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || !isFestcupEventAdmin(u)) {
      router.replace('/login')
      return
    }
    if (!festcupAllowedPath(pathname)) {
      router.replace('/admin/festcup')
      return
    }
    setUser(u)
  }, [router, pathname])

  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    setRoutePulse(true)
    const t = window.setTimeout(() => setRoutePulse(false), 400)
    return () => window.clearTimeout(t)
  }, [pathname])

  function closeMenuAndNav() {
    setMenuOpen(false)
  }

  const sections = useMemo(() => festcupHubSections(), [])
  const waHref = waPhone
    ? whatsappUrl(waPhone, 'Hola, soporte Taekwondo FestCup 2026')
    : null

  function isActive(href) {
    if (href === '/admin/festcup') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`)
  }

  if (!user) {
    return (
      <div className="festcup-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="festcup-shell-bg" aria-hidden />
        <p className="anim-fade-in" style={{ color: 'var(--label3)' }}>Cargando FestCup…</p>
      </div>
    )
  }

  return (
    <div className="festcup-shell">
      <div className="festcup-shell-bg" aria-hidden />

      <aside className={`festcup-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="festcup-sidebar-brand">
          <h2>Taekwondo FestCup 26</h2>
          <p>Panel del evento · acceso total</p>
        </div>
        <nav className="festcup-nav">
          <Link
            href="/admin/festcup"
            className={`festcup-nav-link ${pathname === '/admin/festcup' ? 'is-active' : ''}`}
            onClick={closeMenuAndNav}
          >
            <span className="material-symbols-rounded">home</span>
            Centro de control
          </Link>
          {sections.map((sec) => (
            <div key={sec.title} className="festcup-nav-section">
              <div className="festcup-nav-section-title" style={{ color: sec.accent }}>
                {sec.title}
              </div>
              {sec.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                  className={`festcup-nav-link ${isActive(item.href) ? 'is-active' : ''} ${item.highlight && !isActive(item.href) ? 'is-highlight' : ''}`}
                  onClick={closeMenuAndNav}
                >
                  <span className="material-symbols-rounded">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {waHref ? (
            <a className="festcup-wa-btn" href={waHref} target="_blank" rel="noreferrer" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>chat</span>
              WhatsApp staff
            </a>
          ) : null}
          <button
            type="button"
            className="festcup-nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onClick={() => {
              logout()
              router.push('/login')
            }}
          >
            <span className="material-symbols-rounded">logout</span>
            Salir ({user.username})
          </button>
        </div>
      </aside>

      <div className="festcup-main">
        <div className={`festcup-route-bar ${routePulse ? 'is-active' : ''}`} aria-hidden />
        <header className="festcup-topbar">
          <button
            type="button"
            className="festcup-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(13,13,15,0.12)',
              background: '#fff',
              color: 'var(--label)',
              cursor: 'pointer',
            }}
            aria-label="Menú"
          >
            <span className="material-symbols-rounded">menu</span>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>{title || 'FestCup 2026'}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions}
        </header>
        <main className="festcup-content">
          <div key={pathname} className="festcup-page">
            {children}
          </div>
        </main>
      </div>

      <nav className="festcup-mobile-nav" aria-label="Accesos rápidos">
        {MOBILE_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive(tab.href) ? 'is-active' : ''}
            onClick={closeMenuAndNav}
          >
            <span className="material-symbols-rounded">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 15,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
          }}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  )
}

export { FESTCUP_EVENT_ID }
