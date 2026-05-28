'use client'

export default function AcademiaExpansible({
  nombre,
  resumen,
  expandido,
  onToggle,
  acciones,
  children,
}) {
  return (
    <div className="ios-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: expandido ? '1px solid var(--separator)' : 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="ios-headline" style={{ marginBottom: 4 }}>{nombre}</p>
          <p className="ios-caption" style={{ color: 'var(--label3)' }}>{resumen}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {acciones}
          <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={onToggle}>
            {expandido ? 'Ver menos' : 'Ver más'}
          </button>
        </div>
      </div>
      {expandido && <div style={{ padding: '12px 16px 16px' }}>{children}</div>}
    </div>
  )
}
