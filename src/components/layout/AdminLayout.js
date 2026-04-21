'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar, { TABS } from './Sidebar'
import { getCurrentUser, isAdmin } from '@/lib/services/auth.service'

export default function AdminLayout({ children, title, subtitle, actions }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user || !isAdmin(user)) router.replace('/login')
  }, [router])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ios-main">
        {/* Navbar */}
        <header className="ios-navbar">
          {/* Botón hamburguesa — solo móvil/tablet */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(60,60,67,0.10)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--label)' }}>menu</span>
          </button>

          {/* Título */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p style={{ fontSize: 11, color: 'var(--label3)', marginTop: 0 }}>{subtitle}</p>
            )}
          </div>

          {/* Acciones */}
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
        </header>

        {/* Contenido */}
        <main style={{ padding: '20px 16px' }}>
          {children}
        </main>
      </div>

      {/* Bottom Tab Bar — solo móvil */}
      <nav className="ios-tabbar">
        {TABS.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="ios-tabbar-item"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <span
                className="material-symbols-rounded"
                style={{
                  fontSize: 24,
                  color: active ? 'var(--red)' : 'rgba(60,60,67,0.45)',
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tab.icon}
              </span>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                color: active ? 'var(--red)' : 'rgba(60,60,67,0.55)',
                letterSpacing: 0.1,
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
