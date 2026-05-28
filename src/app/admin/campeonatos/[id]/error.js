'use client'

import { useEffect } from 'react'

export default function CampeonatoError({ error, reset }) {
  useEffect(() => {
    console.error('[campeonato]', error)
  }, [error])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--label)' }}>No se pudo cargar el campeonato</p>
        <p style={{ fontSize: 14, color: 'var(--label2)', marginBottom: 20, lineHeight: 1.5 }}>
          {error?.message || 'Ocurrió un error inesperado al mostrar esta página.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="ios-btn ios-btn-primary" onClick={() => reset()}>
            Reintentar
          </button>
          <a href="/admin/campeonatos" className="ios-btn ios-btn-secondary">
            Volver
          </a>
        </div>
      </div>
    </div>
  )
}
