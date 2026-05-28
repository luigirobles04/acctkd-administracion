'use client'

import { modalidadRequiereCategoriaPoomsae, grupoPoomsae } from '@/lib/campeonato/validar-categoria'

export { modalidadRequiereCategoriaPoomsae }

export function PortalField({ label, hint, children, className = '' }) {
  return (
    <div className={`portal-field ${className}`.trim()}>
      {label && <label className="portal-field-label">{label}</label>}
      {children}
      {hint && <p className="portal-field-hint">{hint}</p>}
    </div>
  )
}

function CategoriaRadioGrid({ categorias, value, onChange, name }) {
  return (
    <div className="portal-cat-grid" role="radiogroup">
      {categorias.map((c) => {
        const selected = String(value) === String(c.id_categoria)
        return (
          <label
            key={c.id_categoria}
            className={`portal-cat-option ${selected ? 'portal-cat-option--selected' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={c.id_categoria}
              checked={selected}
              onChange={() => onChange(String(c.id_categoria))}
            />
            <span className="portal-cat-option-text">{c.nombre}</span>
          </label>
        )
      })}
    </div>
  )
}

export function PortalCategoriaPicker({ categorias, value, onChange, emptyMessage, hintDan, grouped = false }) {
  if (!categorias?.length) {
    return <p className="portal-alert portal-alert--warn">{emptyMessage}</p>
  }

  if (grouped) {
    const groups = new Map()
    for (const cat of categorias) {
      const label = grupoPoomsae(cat)
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(cat)
    }
    return (
      <>
        {hintDan && <p className="portal-field-hint portal-field-hint--info">{hintDan}</p>}
        {[...groups.entries()].map(([label, items]) => (
          <div key={label} className="portal-cat-group">
            <p className="portal-cat-group-label">{label}</p>
            <CategoriaRadioGrid categorias={items} value={value} onChange={onChange} name={`categoria-${label}`} />
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {hintDan && <p className="portal-field-hint portal-field-hint--info">{hintDan}</p>}
      <CategoriaRadioGrid categorias={categorias} value={value} onChange={onChange} name="categoria" />
    </>
  )
}

export function PortalModalityCard({ active, icon, title, desc, onToggle, children, disabled = false }) {
  return (
    <div className={`portal-mod-card ${active ? 'portal-mod-card--active' : ''} ${disabled ? 'portal-mod-card--disabled' : ''}`}>
      <button
        type="button"
        className="portal-mod-card-head"
        onClick={disabled ? undefined : onToggle}
        aria-pressed={active}
        disabled={disabled}
      >
        <span className="portal-mod-card-icon material-symbols-rounded">{icon}</span>
        <span className="portal-mod-card-text">
          <span className="portal-mod-card-title">{title}</span>
          {desc && <span className="portal-mod-card-desc">{desc}</span>}
        </span>
        <span className={`portal-mod-card-check ${active ? 'portal-mod-card-check--on' : ''}`}>
          {active ? '✓' : disabled ? '—' : ''}
        </span>
      </button>
      {active && children && <div className="portal-mod-card-body">{children}</div>}
    </div>
  )
}

export const MODALIDADES_PORTAL = [
  { key: 'kyorugi_individual', label: 'Kyorugi', desc: 'Combate individual por peso y edad', icon: 'sports_mma' },
  { key: 'poomsae_individual', label: 'Poomsae individual', desc: 'Formas — elige tu división', icon: 'accessibility_new' },
  { key: 'oficial', label: 'Oficial', desc: 'Coach, delegado, médico… (gratis, máx. 3)', icon: 'badge' },
]
