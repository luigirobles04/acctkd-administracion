'use client'

import { useEffect, useState } from 'react'
import { getProductionAppUrl, isProtectedPreviewHost } from '@/lib/public-app-url'

export default function PreviewDeploymentRedirect() {
  const [showBanner, setShowBanner] = useState(false)
  const productionUrl = getProductionAppUrl()

  useEffect(() => {
    const host = window.location.hostname
    if (!isProtectedPreviewHost(host)) return

    const target = `${productionUrl}${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(target)
  }, [productionUrl])

  useEffect(() => {
    if (isProtectedPreviewHost(window.location.hostname)) setShowBanner(true)
  }, [])

  if (!showBanner) return null

  return (
    <div
      role="alert"
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,59,48,0.12)',
        border: '1px solid rgba(255,59,48,0.35)',
        color: '#C0000A',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>Redirigiendo a producción…</p>
      <p style={{ margin: 0 }}>
        Los previews de Vercel bloquean las APIs. Si no redirige automáticamente, abre{' '}
        <a href={productionUrl} style={{ color: '#C0000A', fontWeight: 700 }}>
          {productionUrl}
        </a>
      </p>
    </div>
  )
}
