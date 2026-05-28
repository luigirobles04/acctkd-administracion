'use client'

import PortalShell from './PortalShell'

export default function PortalLayout({ children, titulo, subtitulo, academiaNombre, backHref = '/portal' }) {
  return (
    <PortalShell
      variant="detail"
      title={titulo}
      subtitle={subtitulo}
      academiaNombre={academiaNombre}
      backHref={backHref}
    >
      {children}
    </PortalShell>
  )
}

export function PortalBarraTotales({ total, pagado, pendiente }) {
  return (
    <div className="portal-bar-totales">
      <div className="portal-bar-item">
        <span className="portal-bar-label">Total</span>
        <span className="portal-bar-value">S/ {Number(total || 0).toFixed(0)}</span>
      </div>
      <div className="portal-bar-item portal-bar-item--accent">
        <span className="portal-bar-label">Pagado</span>
        <span className="portal-bar-value">S/ {Number(pagado || 0).toFixed(0)}</span>
      </div>
      <div className="portal-bar-item">
        <span className="portal-bar-label">Pendiente</span>
        <span className="portal-bar-value">S/ {Number(pendiente || 0).toFixed(0)}</span>
      </div>
    </div>
  )
}

export function PortalTabs({ tabs, active, onChange }) {
  return (
    <div className="portal-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`portal-tab ${active === t.id ? 'portal-tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function PortalWizardSteps({ steps, current }) {
  return (
    <div className="portal-wizard">
      {steps.map((label, i) => (
        <div
          key={label}
          className={`portal-wizard-step ${i < current ? 'portal-wizard-step--done' : ''} ${i === current ? 'portal-wizard-step--current' : ''}`}
        >
          <div className="portal-wizard-track">
            {i > 0 && <span className="portal-wizard-line" />}
            <div className="portal-wizard-dot">{i < current ? '✓' : i + 1}</div>
          </div>
          <span className="portal-wizard-label">{label}</span>
        </div>
      ))}
    </div>
  )
}
