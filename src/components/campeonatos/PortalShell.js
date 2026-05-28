'use client'

import Link from 'next/link'
import Image from 'next/image'

function initialsFromName(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function PortalShell({
  variant = 'home',
  title,
  subtitle,
  academiaNombre,
  representante,
  onLogout,
  backHref,
  children,
  footer = 'Christopher Cabrera Taekwondo · ACCTKD',
}) {
  const firstName = representante?.nombre?.split(/\s+/)[0]

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <Link href="/portal" className="portal-topbar-brand">
            <Image src="/logo-dark.png" alt="" width={28} height={28} className="portal-topbar-logo" />
            <span>ACCTKD</span>
          </Link>
          {onLogout && (
            <button type="button" className="portal-topbar-logout" onClick={onLogout}>
              Salir
            </button>
          )}
        </div>
      </header>

      <div className="portal-page-head">
        <div className="portal-page-head-inner">
          {variant === 'home' && firstName && (
            <p className="portal-page-eyebrow">Portal de inscripción</p>
          )}
          {title && <h1 className="portal-page-title">{title}</h1>}
          {subtitle && <p className="portal-page-sub">{subtitle}</p>}
          {academiaNombre && variant === 'detail' && (
            <p className="portal-page-meta">{academiaNombre}</p>
          )}
          {representante && variant === 'home' && (
            <div className="portal-user-strip">
              <span className="portal-user-avatar">{initialsFromName(representante.nombre)}</span>
              <div className="portal-user-copy">
                <span className="portal-user-name">{representante.nombre}</span>
                <span className="portal-user-dni">DNI {representante.dni}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="portal-main">
        {backHref && variant === 'detail' && (
          <Link href={backHref} className="portal-back">
            ← Mis campeonatos
          </Link>
        )}
        {children}
      </main>

      <footer className="portal-footer">{footer}</footer>
    </div>
  )
}
