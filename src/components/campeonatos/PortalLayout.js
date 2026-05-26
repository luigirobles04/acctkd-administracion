'use client'

import Link from 'next/link'

export default function PortalLayout({ children, titulo, subtitulo, academiaNombre }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, var(--red) 0%, var(--red-dark) 100%)',
          color: '#fff',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-red)',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>ACCTKD</div>
          {titulo && <div style={{ fontSize: 15, marginTop: 4, opacity: 0.95 }}>{titulo}</div>}
          {subtitulo && <div style={{ fontSize: 13, marginTop: 2, opacity: 0.85 }}>{subtitulo}</div>}
          {academiaNombre && (
            <div style={{ fontSize: 14, marginTop: 8, fontWeight: 600, background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '6px 10px', display: 'inline-block' }}>
              {academiaNombre}
            </div>
          )}
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '16px 16px 100px' }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: 12, fontSize: 11, color: 'var(--label3)' }}>
        Christopher Cabrera Taekwondo · ACCTKD
      </footer>
    </div>
  )
}

export function PortalBarraTotales({ total, pagado, pendiente }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--separator)',
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        justifyContent: 'space-around',
        zIndex: 50,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="ios-caption" style={{ color: 'var(--label3)' }}>Total</div>
        <div style={{ fontWeight: 700 }}>S/ {Number(total).toFixed(0)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="ios-caption" style={{ color: 'var(--label3)' }}>Pagado</div>
        <div style={{ fontWeight: 700, color: 'var(--red)' }}>S/ {Number(pagado).toFixed(0)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="ios-caption" style={{ color: 'var(--label3)' }}>Pendiente</div>
        <div style={{ fontWeight: 700 }}>S/ {Number(pendiente).toFixed(0)}</div>
      </div>
    </div>
  )
}

export function PortalTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={active === t.id ? 'ios-btn ios-btn-primary' : 'ios-btn ios-btn-secondary'}
          style={{ flexShrink: 0, fontSize: 13, padding: '8px 12px' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
