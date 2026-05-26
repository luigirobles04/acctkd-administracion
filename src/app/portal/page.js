'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, isRepresentante, logout } from '@/lib/services/auth.service'
import { portalFetch } from '@/lib/portal-client'
import { formatFecha } from '@/lib/utils/format'

const ESTADO_APRO = {
  pendiente: { label: 'Pendiente aprobación', cls: 'badge-yellow' },
  aprobada: { label: 'Aprobada', cls: 'badge-green' },
  rechazada: { label: 'Rechazada', cls: 'badge-red' },
}

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
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="ios-card" style={{ padding: 32 }}>Cargando…</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, var(--red) 0%, var(--red-dark) 100%)',
          color: '#fff',
          padding: '20px 20px 32px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>ACCTKD Portal</div>
              <div style={{ fontSize: 15, marginTop: 6, opacity: 0.95 }}>{data?.academia?.nombre}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.75 }}>
                {data?.representante?.nombre} · DNI {data?.representante?.dni}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { logout(); router.push('/login') }}
              style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '-16px auto 0', padding: '0 16px 40px' }}>
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, paddingLeft: 4 }}>Mis campeonatos</h2>
          {(data?.misCampeonatos || []).length === 0 ? (
            <div className="ios-card" style={{ padding: 24, textAlign: 'center', color: 'var(--label3)' }}>
              Aún no te has inscrito a ningún campeonato.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.misCampeonatos.map((item) => {
                const c = item.campeonato
                const est = ESTADO_APRO[item.estado_aprobacion] || ESTADO_APRO.pendiente
                return (
                  <Link
                    key={item.id}
                    href={`/portal/${c?.slug}`}
                    className="ios-card"
                    style={{ padding: 16, textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{c?.nombre}</div>
                        <div style={{ fontSize: 13, color: 'var(--label3)', marginTop: 4 }}>
                          {c?.ciudad} · {formatFecha(c?.fecha_inicio)}
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span className={`badge ${est.cls}`}>{est.label}</span>
                          <span className="badge badge-gray">{item.estado_lista}</span>
                          {item.monto_total > 0 && (
                            <span className="badge badge-blue">S/ {Number(item.monto_total).toFixed(0)}</span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: 'var(--red)', fontSize: 22 }}>›</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {(data?.disponibles || []).length > 0 && (
          <section>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, paddingLeft: 4 }}>Inscribirme en otro evento</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.disponibles.map((c) => (
                <div key={c.slug} className="ios-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                    <div style={{ fontSize: 13, color: 'var(--label3)', marginTop: 4 }}>{c.ciudad} · {formatFecha(c.fecha_inicio)}</div>
                  </div>
                  <button
                    type="button"
                    className="ios-btn ios-btn-primary"
                    disabled={uniendo === c.slug}
                    onClick={() => unirse(c.slug)}
                    style={{ flexShrink: 0, fontSize: 13 }}
                  >
                    {uniendo === c.slug ? '…' : 'Unirme'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
