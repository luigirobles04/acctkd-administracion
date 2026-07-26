'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PantallaLlamados from '@/components/campeonatos/PantallaLlamados'
import LoadingState from '@/components/ui/LoadingState'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/pantalla-llamados.css'

const POLL_MS = 6000

export default function LlamadosPublicaPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/campeonato/${slug}/llamados`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState ocurre tras await (poll async), no síncrono
    cargar()
    const t = setInterval(cargar, POLL_MS)
    return () => clearInterval(t)
  }, [cargar])

  if (error && !data) {
    return (
      <div className="pantalla-llamados" style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <p style={{ color: '#f87171', fontSize: 18 }}>{error}</p>
        <button
          type="button"
          onClick={() => cargar()}
          style={{
            marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15,
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="pantalla-llamados" style={{ justifyContent: 'center' }}>
        <LoadingState mensaje="Cargando zona de llamados…" light padding={64} />
      </div>
    )
  }

  return <PantallaLlamados data={data} loading={loading} />
}
