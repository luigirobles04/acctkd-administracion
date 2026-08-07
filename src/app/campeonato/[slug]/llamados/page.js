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
const FETCH_TIMEOUT_MS = 20000

export default function LlamadosPublicaPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [modo, setModo] = useState('kyorugi')
  const firstLoad = useRef(true)
  const dataRef = useRef(null)
  const modoRef = useRef(modo)
  const reqId = useRef(0)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    modoRef.current = modo
  }, [modo])

  const cargar = useCallback(async () => {
    const myReq = ++reqId.current
    const modoPedido = modoRef.current
    try {
      if (!firstLoad.current) setSyncing(true)
      const res = await fetchConTimeout(
        `/api/campeonato/${slug}/llamados?modo=${encodeURIComponent(modoPedido)}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        },
        FETCH_TIMEOUT_MS,
      )
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al cargar llamados')
      // Ignora respuestas viejas si cambió el modo o hay un fetch más nuevo
      if (myReq !== reqId.current || modoPedido !== modoRef.current) return
      setData(json)
      setError(null)
    } catch (e) {
      if (myReq !== reqId.current) return
      setError(e.message)
    } finally {
      if (myReq === reqId.current) {
        setLoading(false)
        setSyncing(false)
        firstLoad.current = false
      }
    }
  }, [slug])

  useEffect(() => {
    firstLoad.current = true
    setLoading(true)
    setError(null)
    cargar()
  }, [cargar, modo])

  useEffect(() => {
    let cancelled = false
    let timer

    const schedule = () => {
      if (cancelled) return
      const enVivo =
        modoRef.current === 'kyorugi' && hayKyorugiEnCurso(dataRef.current?.areas)
      timer = setTimeout(run, enVivo ? POLL_EN_VIVO_MS : POLL_IDLE_MS)
    }

    const run = async () => {
      if (cancelled) return
      await cargar()
      if (cancelled) return
      schedule()
    }

    schedule()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
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
    <>
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'rgba(127,29,29,0.92)',
            color: '#fecaca',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Sync: {error}
        </div>
      )}
      <PantallaLlamados
        data={data}
        loading={loading || syncing}
        modo={modo}
        onModoChange={setModo}
      />
    </>
  )
}
