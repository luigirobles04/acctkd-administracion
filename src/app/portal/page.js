'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isRepresentante, logout } from '@/lib/services/auth.service'
import { portalFetch } from '@/lib/portal-client'
import PortalShell from '@/components/campeonatos/PortalShell'
import { PortalEventCardLink, PortalEventCardJoin } from '@/components/campeonatos/PortalEventCard'

export default function PortalHomePage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uniendo, setUniendo] = useState(null)

  const cargar = useCallback(async () => {
    const user = getCurrentUser()
    if (!user || !isRepresentante(user)) {
      router.replace('/login')
      return
    }
    try {
      const res = await portalFetch('/api/portal/campeonatos')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch {
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function unirse(slug) {
    setUniendo(slug)
    try {
      const res = await portalFetch('/api/portal/campeonatos', {
        method: 'POST',
        body: JSON.stringify({ slug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/portal/${slug}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setUniendo(null)
    }
  }

  if (loading) {
    return (
      <PortalShell title="Mis campeonatos">
        <div className="portal-card portal-empty portal-card--loading">
          <span className="portal-spinner" aria-hidden />
          Cargando tus eventos…
        </div>
      </PortalShell>
    )
  }

  const mis = data?.misCampeonatos || []
  const disponibles = data?.disponibles || []

  return (
    <PortalShell
      title="Mis campeonatos"
      subtitle={data?.academia?.nombre}
      representante={data?.representante}
      onLogout={() => { logout(); router.push('/login') }}
    >
      <section className="portal-section">
        <h2 className="portal-section-head">Mis eventos</h2>
        {mis.length === 0 ? (
          <div className="portal-card portal-empty">
            <span className="material-symbols-rounded portal-empty-icon">event_busy</span>
            <p>Aún no te has inscrito a ningún campeonato.</p>
            {disponibles.length > 0 && (
              <p className="portal-empty-hint">Puedes unirte a uno disponible abajo.</p>
            )}
          </div>
        ) : (
          <div className="portal-event-list">
            {mis.map((item) => {
              const c = item.campeonato
              return (
                <PortalEventCardLink
                  key={item.id}
                  href={`/portal/${c?.slug}`}
                  nombre={c?.nombre}
                  ciudad={c?.ciudad}
                  fecha={c?.fecha_inicio}
                  item={item}
                />
              )
            })}
          </div>
        )}
      </section>

      {disponibles.length > 0 && (
        <section className="portal-section">
          <h2 className="portal-section-head">Inscribirme en otro evento</h2>
          <div className="portal-event-list">
            {disponibles.map((c) => (
              <PortalEventCardJoin
                key={c.slug}
                nombre={c.nombre}
                ciudad={c.ciudad}
                fecha={c.fecha_inicio}
                joining={uniendo === c.slug}
                onJoin={() => unirse(c.slug)}
              />
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  )
}
