'use client'

/** Spinner iOS-style reutilizable (usa .camp-spinner de globals.css). */
export function LoadingSpinner({ size = 36, light = false }) {
  return (
    <span
      className="camp-spinner"
      aria-hidden
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(3, Math.round(size / 11)),
        ...(light ? { borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#f8fafc' } : {}),
      }}
    />
  )
}

/** Estado de carga centrado con spinner + mensaje. */
export default function LoadingState({ mensaje = 'Cargando…', light = false, padding = 48 }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14, padding, textAlign: 'center',
      }}
    >
      <LoadingSpinner light={light} />
      <span style={{ color: light ? '#94a3b8' : 'var(--label3, #8e8e93)', fontSize: 14, fontWeight: 500 }}>
        {mensaje}
      </span>
    </div>
  )
}

/** Estado de error con botón reintentar. */
export function ErrorState({ mensaje = 'Algo salió mal', onRetry, light = false }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: 40, textAlign: 'center',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#dc2626' }} aria-hidden>
        error
      </span>
      <span style={{ color: light ? '#e2e8f0' : 'var(--label, #1c1c1e)', fontSize: 14, maxWidth: 420 }}>
        {mensaje}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
