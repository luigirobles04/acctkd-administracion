'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STATS = [
  { key: 'alumnos',    label: 'Alumnos',      icon: 'school',        color: '#007AFF', bg: 'rgba(0,122,255,0.12)',  href: '/admin/alumnos'    },
  { key: 'maestros',   label: 'Maestros',     icon: 'person_pin',    color: '#34C759', bg: 'rgba(52,199,89,0.12)',  href: '/admin/maestros'   },
  { key: 'pagos',      label: 'Pagos (mes)',  icon: 'payments',      color: '#FF9500', bg: 'rgba(255,149,0,0.12)',  href: '/admin/pagos'      },
  { key: 'campeonatos',label: 'Campeonatos',  icon: 'emoji_events',  color: 'var(--red)', bg: 'rgba(192,0,0,0.12)',    href: '/admin/campeonatos'},
]

const ACCESOS = [
  { label: 'Registrar alumno',     icon: 'person_add',    href: '/admin/alumnos',     color: '#007AFF' },
  { label: 'Tomar asistencia',     icon: 'fact_check',    href: '/admin/asistencia',  color: '#34C759' },
  { label: 'Registrar pago',       icon: 'add_card',      href: '/admin/pagos',       color: '#FF9500' },
  { label: 'Nuevo campeonato',     icon: 'emoji_events',  href: '/admin/campeonatos', color: 'var(--red)' },
  { label: 'Gestionar maestros',   icon: 'manage_accounts',href: '/admin/maestros',   color: '#AF52DE' },
  { label: 'Sedes',                icon: 'location_on',   href: '/admin/sedes',       color: '#5AC8FA' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ alumnos: '—', maestros: '—', pagos: '—', campeonatos: '—' })
  const today = new Date()
  const dateStr = today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  useEffect(() => {
    if (!supabase) return
    async function load() {
      const [{ count: al }, { count: ma }, { count: pa }, { count: ca }] = await Promise.all([
        supabase.from('alumno').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('maestro').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('pago').select('*', { count: 'exact', head: true })
          .gte('fecha_pago', new Date(today.getFullYear(), today.getMonth(), 1).toISOString()),
        supabase.from('campeonato').select('*', { count: 'exact', head: true }),
      ])
      setStats({ alumnos: al ?? 0, maestros: ma ?? 0, pagos: pa ?? 0, campeonatos: ca ?? 0 })
    }
    load()
  }, [])

  return (
    <AdminLayout title="Panel de control" subtitle={dateCap}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Encabezado */}
        <div className="anim-fade-up" style={{ marginBottom: 28 }}>
          <p className="ios-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, color: 'var(--red)' }}>
            Resumen general
          </p>
          <h2 className="ios-title-lg" style={{ color: 'var(--label)', marginTop: 6 }}>Panel de control</h2>
          <p className="ios-body" style={{ color: 'var(--label3)', marginTop: 4 }}>
            Estado actual de la academia.
          </p>
        </div>

        {/* Stats grid */}
        <div
          className="anim-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: 12,
            marginBottom: 28,
            animationDelay: '0.04s',
          }}
        >
          {STATS.map(s => (
            <button
              key={s.key}
              onClick={() => router.push(s.href)}
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: '16px',
                border: '0.5px solid var(--separator)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 10,
                textAlign: 'left', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 22, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--label)', lineHeight: 1 }}>
                  {stats[s.key]}
                </p>
                <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Acceso rápido */}
        <div className="anim-fade-up" style={{ animationDelay: '0.08s' }}>
          <p className="ios-headline" style={{ marginBottom: 12, color: 'var(--label)' }}>Acceso rápido</p>
          <div className="ios-group">
            {ACCESOS.map((a, i) => (
              <button
                key={i}
                onClick={() => router.push(a.href)}
                className="ios-group-row"
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: a.color, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--label)' }}>{a.label}</span>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--label4)' }}>chevron_right</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
