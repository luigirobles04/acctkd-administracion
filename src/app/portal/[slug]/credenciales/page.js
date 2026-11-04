'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import PortalLayout from '@/components/campeonatos/PortalLayout'
import LoadingState from '@/components/ui/LoadingState'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import { portalFetch } from '@/lib/portal-client'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/credenciales.css'

export default function PortalCredencialesPage() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [campeonato, setCampeonato] = useState(null)
  const [academia, setAcademia] = useState(null)
  const [templateUrl, setTemplateUrl] = useState('/credenciales/plantilla-frente.png')
  const [credencialLayout, setCredencialLayout] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await portalFetch(`/api/portal/campeonato/${slug}/credenciales`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setTemplateUrl(json.campeonato?.template_url || '/credenciales/plantilla-frente.png')
      setCredencialLayout(json.campeonato?.credencial_layout || null)
      setAcademia(json.academias?.[0] || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    cargar()
  }, [cargar])

  function imprimir() {
    window.print()
  }

  return (
    <PortalLayout titulo="Credenciales" subtitulo={campeonato?.nombre || 'FestCup'} backHref={`/portal/${slug}?tab=documentos`}>
      <div className="credenciales-root">
        <div className="no-print credenciales-toolbar" style={{ marginBottom: 16 }}>
          <Link href={`/portal/${slug}?tab=documentos`} className="credenciales-back">
            ← Volver al portal
          </Link>
          <div className="credenciales-actions">
            <button type="button" className="ios-btn ios-btn-secondary" onClick={cargar} disabled={loading}>
              Actualizar
            </button>
            <button type="button" className="ios-btn ios-btn-primary" onClick={imprimir} disabled={!academia?.competidores?.length}>
              Imprimir ({academia?.competidores?.length || 0})
            </button>
          </div>
          <p className="credenciales-hint">
            Solo aparecen inscripciones con <strong>dorsal asignado</strong>. En impresión: márgenes ninguno y fondos activados.
          </p>
        </div>

        {loading ? (
          <LoadingState mensaje="Cargando credenciales…" />
        ) : error ? (
          <p style={{ color: '#C0000A' }}>{error}</p>
        ) : !academia?.competidores?.length ? (
          <p>Aún no hay credenciales listas (falta dorsal o aprobación).</p>
        ) : (
          <section className="credenciales-academia is-open">
            <header className="no-print credenciales-academia-head">
              <div className="credenciales-academia-titles">
                <h2>{academia.nombre}</h2>
                <p>{academia.competidores.length} credencial(es)</p>
              </div>
            </header>
            <div className="credenciales-stack">
              {academia.competidores.map((c) => (
                <CredencialCard
                  key={c.id_linea}
                  competidor={c}
                  templateUrl={c.template_url || templateUrl}
                  layout={credencialLayout}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  )
}
