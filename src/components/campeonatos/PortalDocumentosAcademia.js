'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  descargarFichaNominalExcel,
  descargarFichaNominalPdf,
  fetchExportFichaNominalPortal,
} from '@/lib/campeonato/export-ficha-nominal-client'

export default function PortalDocumentosAcademia({ slug, nombreAcademia }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  async function conDatos(kind, fn) {
    setError(null)
    setLoading(kind)
    try {
      const data = await fetchExportFichaNominalPortal(slug)
      const idAc = data.academias?.[0]?.id
      await fn(data, idAc ? { idAcademia: idAc } : {})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="portal-card" style={{ padding: 18 }}>
      <h3 className="portal-section-title" style={{ marginTop: 0 }}>Ficha nominal y credenciales</h3>
      <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 14, lineHeight: 1.45 }}>
        Descarga la ficha de <strong>{nombreAcademia || 'tu academia'}</strong> e imprime credenciales con dorsal (misma data que el organizador).
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className="ios-btn ios-btn-primary"
          disabled={Boolean(loading)}
          onClick={() => conDatos('pdf', async (data, opts) => descargarFichaNominalPdf(data, opts))}
        >
          {loading === 'pdf' ? 'Generando…' : 'Descargar ficha PDF'}
        </button>
        <button
          type="button"
          className="ios-btn ios-btn-secondary"
          disabled={Boolean(loading)}
          onClick={() => conDatos('xlsx', async (data, opts) => descargarFichaNominalExcel(data, opts))}
        >
          {loading === 'xlsx' ? 'Generando…' : 'Descargar ficha Excel'}
        </button>
        <Link href={`/portal/${slug}/credenciales`} className="ios-btn ios-btn-secondary">
          Ver e imprimir credenciales
        </Link>
      </div>

      {error && (
        <p className="ios-caption" style={{ color: '#C0000A' }}>{error}</p>
      )}
    </div>
  )
}
