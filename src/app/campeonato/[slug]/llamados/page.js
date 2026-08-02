'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import PantallaLlamados from '@/components/campeonatos/PantallaLlamados'
import LoadingState from '@/components/ui/LoadingState'
import { hayKyorugiEnCurso } from '@/lib/campeonato/canchas-data'
import { fetchConTimeout, readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/pantalla-llamados.css'

const POLL_EN_VIVO_MS = 2000
const POLL_IDLE_MS = 5000

export default function LlamadosPublicaPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [modo, setModo] = useState('kyorugi')
  const firstLoad = useRef(true)
  const enVuelo = useRef(false)
  const dataRef = useRef(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const cargar = useCallback(async () => {
    if (enVuelo.current) return
    enVuelo.current = true
    try {
      if (!firstLoad.current) setSyncing(true)
      const res = await fetchConTimeout(
        `/api/campeonato/${slug}/llamados?modo=${encodeURIComponent(modo)}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        }
      )
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
      enVuelo.current = false
    }
  }, [slug, modo])

  useEffect(() => {
    firstLoad.current = true
    setLoading(true)
    cargar()
  }, [cargar, modo])

  useEffect(() => {
    let timer
    const tick = () => {
      cargar()
      const enVivo =
        modo === 'kyorugi' && hayKyorugiEnCurso(dataRef.current?.areas)
      timer = setTimeout(tick, enVivo ? POLL_EN_VIVO_MS : POLL_IDLE_MS)
    }
    timer = setTimeout(tick, modo === 'kyorugi' && hayKyorugiEnCurso(dataRef.current?.areas) ? POLL_EN_VIVO_MS : POLL_IDLE_MS)
    return () => clearTimeout(timer)
  }, [cargar, modo])

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

  return (
    <PantallaLlamados
      data={data}
      loading={loading || syncing}
      modo={modo}
      onModoChange={setModo}
    />
  )
}
