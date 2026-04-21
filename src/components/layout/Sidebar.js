'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { logout, getCurrentUser } from '@/lib/services/auth.service'

const MENU = [
  {
    label: 'Principal',
    items: [
      { href: '/admin/dashboard',   icon: 'grid_view',    label: 'Dashboard'    },
    ],
  },
  {
    label: 'Academia',
    items: [
      { href: '/admin/alumnos',     icon: 'school',       label: 'Alumnos'      },
      { href: '/admin/maestros',    icon: 'person_pin',   label: 'Maestros'     },
      { href: '/admin/sedes',       icon: 'location_on',  label: 'Sedes'        },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/admin/asistencia',  icon: 'fact_check',   label: 'Asistencia'   },
      { href: '/admin/pagos',       icon: 'payments',     label: 'Pagos'        },
    ],
  },
  {
    label: 'Campeonatos',
    items: [
      { href: '/admin/campeonatos', icon: 'emoji_events', label: 'Campeonatos'  },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/usuarios',    icon: 'manage_accounts', label: 'Usuarios'  },
    ],
  },
]

// Tabs para el bottom tab bar móvil (solo los más importantes)
export const TABS = [
  { href: '/admin/dashboard',  icon: 'grid_view',    label: 'Inicio'     },
  { href: '/admin/alumnos',    icon: 'school',       label: 'Alumnos'    },
  { href: '/admin/asistencia', icon: 'fact_check',   label: 'Asistencia' },
  { href: '/admin/pagos',      icon: 'payments',     label: 'Pagos'      },
  { href: '/admin/campeonatos',icon: 'emoji_events', label: 'Campeonatos'},
]

export default function Sidebar({ open, onClose }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const raw = getCurrentUser()
    if (!raw) return
    setUser({
      ...raw,
      nombre: raw.nombre || raw.nombre_completo || raw.username || 'Admin',
      rol: typeof raw.rol === 'string' ? raw.rol : raw.rol?.nombre || 'Administrador',
    })
  }, [])

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      <aside className={`ios-sidebar ${open ? 'open' : ''}`}>
        {/* Header */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image
              src="/logo-dark.png"
              alt="Logo"
              width={38}
              height={38}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: -0.4, lineHeight: 1.1 }}>
                ACCTK<span style={{ color: '#E53935' }}>D</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', letterSpacing: 0.4, marginTop: 2, fontWeight: 600, textTransform: 'uppercase' }}>
                Administración
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 0', scrollbarWidth: 'none' }}>
          {MENU.map(section => (
            <div key={section.label}>
              <p className="ios-sidebar-label">{section.label}</p>
              {section.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); onClose?.() }}
                    className={`ios-sidebar-item ${active ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: active ? undefined : 'transparent', textAlign: 'left', marginBottom: 2 }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer / usuario */}
        <div style={{ padding: '12px 8px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E53935, #B71C1C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.nombre?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} suppressHydrationWarning>
                {user?.nombre || '\u00A0'}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }} suppressHydrationWarning>
                {user?.rol || '\u00A0'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="ios-sidebar-item"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', color: 'rgba(255,59,48,0.8)' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>logout</span>
            <span style={{ fontSize: 13 }}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
