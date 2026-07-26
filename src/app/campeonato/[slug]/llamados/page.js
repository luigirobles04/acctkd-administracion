'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import PantallaLlamados from '@/components/campeonatos/PantallaLlamados'
import LoadingState from '@/components/ui/LoadingState'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/pantalla-llamados.css'

const POLL_MS = 3000

export default function LlamadosPublicaPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const firstLoad = useRef(true)

  const cargar = useCallback(async () => {
    try {
      if (!firstLoad.current) setSyncing(true)
      const res = await fetch(`/api/campeonato/${slug}/llamados?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al cargar llamados')
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSyncing(false)
      firstLoad.current = false
    }
  }, [slug])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- poll async
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

  return <PantallaLlamados data={data} loading={loading || syncing} />
}
