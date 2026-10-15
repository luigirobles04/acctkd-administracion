'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-client'
import FestcupAdminLayout from '@/components/layout/FestcupAdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import {
  FESTCUP_EVENT_ID,
  festcupEventBasePath,
  festcupHubSections,
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
  const sections = festcupHubSections()

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
        <LoadingState mensaje="Cargando evento…" />
      ) : error ? (
        <div className="festcup-hub-hero anim-fade-up">
          <p style={{ color: '#fca5a5' }}>{error}</p>
          <button type="button" className="ios-btn ios-btn-primary" onClick={cargar}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section className="festcup-hub-hero anim-fade-up">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {camp?.ciudad || 'Trujillo'} · {camp?.estado?.replace(/_/g, ' ')}
                </p>
                <h2 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em' }}>
                  {camp?.nombre}
                </h2>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  {camp?.lugar || 'Sede del evento'}
                </p>
              </div>
              <Link href={festcupEventBasePath()} className="ios-btn ios-btn-secondary" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                Ver detalle completo
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
                  <strong style={{ color: '#fbbf24' }}>{stats.pendientes_pago ?? 0}</strong>
                  <span>Pend. pago</span>
                </div>
              </div>
            ) : null}
          </section>

          {sections.map((sec, i) => (
            <section key={sec.title} className="anim-fade-up" style={{ animationDelay: `${i * 0.04}s`, marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: sec.accent, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {sec.title}
              </h3>
              <div className="festcup-card-grid">
                {sec.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    className={`festcup-action-card ${item.highlight ? 'is-highlight' : ''}`}
                  >
                    <div className="festcup-action-card-head">
                      <div className="festcup-action-card-icon" style={{ color: sec.accent }}>
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
          ))}
        </>
      )}
    </FestcupAdminLayout>
  )
}
