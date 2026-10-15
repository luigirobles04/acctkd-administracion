'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-client'
import FestcupAdminLayout from '@/components/layout/FestcupAdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import {
  FESTCUP_EVENT_ID,
  festcupEventBasePath,
  festcupHubQuickLinks,
} from '@/lib/festcup-event-admin'
import { readJsonResponse } from '@/lib/public-app-url'
import { whatsappUrl } from '@/lib/campeonato/constants'

export default function FestcupHubPage() {
  const [loading, setLoading] = useState(true)
  const [camp, setCamp] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${FESTCUP_EVENT_ID}/detalle`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCamp(json.campeonato)
      setStats({
        academias: json.academiasCamp?.length ?? 0,
        lineas: json.lineasCount ?? 0,
        categorias: json.categoriasCount ?? 0,
        pendientes_pago: (json.academiasCamp || []).filter((a) => (a.monto_asignado || 0) < (a.monto_total || 0)).length,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const waPhone = camp?.whatsapp_staff_telefonos?.[0] || camp?.telefono_organizador || ''
  const quick = festcupHubQuickLinks()

  return (
    <FestcupAdminLayout
      title="Centro de control"
      subtitle={camp?.nombre || 'Taekwondo FestCup 2026'}
      waPhone={waPhone}
      actions={
        waPhone ? (
          <a
            className="festcup-wa-btn"
            href={whatsappUrl(waPhone, 'Hola, consulta FestCup 2026')}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>chat</span>
            WhatsApp
          </a>
        ) : null
      }
    >
      {loading ? (
        <LoadingState mensaje="Cargando evento…" light />
      ) : error ? (
        <div className="festcup-hub-hero">
          <p style={{ color: '#fca5a5' }}>{error}</p>
          <button type="button" className="ios-btn ios-btn-primary" onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section className="festcup-hub-hero">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p className="festcup-muted-label">
                  {camp?.ciudad || 'Trujillo'} · {camp?.estado?.replace(/_/g, ' ')}
                </p>
                <h2 className="festcup-hub-title">{camp?.nombre}</h2>
                <p className="festcup-muted-body">{camp?.lugar || 'Sede del evento'}</p>
              </div>
              <Link href={festcupEventBasePath()} className="festcup-btn-ghost">
                Resumen del evento
              </Link>
            </div>
            {stats ? (
              <div className="festcup-stat-grid">
                <div className="festcup-stat">
                  <strong>{stats.academias ?? 0}</strong>
                  <span>Academias</span>
                </div>
                <div className="festcup-stat">
                  <strong>{stats.lineas ?? 0}</strong>
                  <span>Inscripciones</span>
                </div>
                <div className="festcup-stat">
                  <strong>{stats.categorias ?? 0}</strong>
                  <span>Categorías</span>
                </div>
                <div className="festcup-stat">
                  <strong className="festcup-stat-warn">{stats.pendientes_pago ?? 0}</strong>
                  <span>Pend. pago</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="festcup-quick-section">
            <p className="festcup-quick-hint">
              <span className="material-symbols-rounded">menu_open</span>
              Usa el menú lateral para todas las herramientas. Aquí van los accesos más usados:
            </p>
            <div className="festcup-card-grid festcup-quick-grid">
              {quick.map((item) => (
                <Link key={item.href} href={item.href} className="festcup-action-card festcup-action-card--compact">
                  <div className="festcup-action-card-head">
                    <div className="festcup-action-card-icon" style={{ color: item.accent }}>
                      <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {item.icon}
                      </span>
                    </div>
                    <h3>{item.label}</h3>
                  </div>
                  <p>{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </FestcupAdminLayout>
  )
}
