'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PantallaCancha from '@/components/campeonatos/PantallaCancha'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/pantalla-cancha.css'

const POLL_MS = 5000

export default function CanchaPublicaPage() {
  const { slug, num } = useParams()
  const cancha = Number(num)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/campeonato/${slug}/cancha/${cancha}`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [slug, cancha])

  useEffect(() => {
    cargar()
    const t = setInterval(() => cargar(true), POLL_MS)
    return () => clearInterval(t)
  }, [cargar])

  if (error && !data) {
    return (
      <div className="pantalla-cancha" style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <p style={{ color: '#f87171', fontSize: 18 }}>{error}</p>
      </div>
    )
  }

  return <PantallaCancha data={data} loading={loading} />
}
