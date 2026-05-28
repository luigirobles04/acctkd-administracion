'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PodioCard from '@/components/campeonatos/PodioCard'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/podios.css'

export default function PodiosPublicosPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/campeonato/${slug}/podios`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 15000)
    return () => clearInterval(t)
  }, [cargar])

  const camp = data?.campeonato

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: '#dc2626' }}>ACCTKD</span>
          <h1 style={{ margin: '8px 0 4px', fontSize: '1.5rem' }}>{camp?.nombre || 'Podios'}</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Resultados Kyorugi · Medallero</p>
        </header>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Cargando…</p>
        ) : !data?.podios?.length ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Aún no hay categorías con podio completo.</p>
        ) : (
          <div className="podios-grid">
            {data.podios.map((cat) => (
              <PodioCard key={cat.id_categoria} categoria={cat} />
            ))}
          </div>
        )}

        <p style={{ marginTop: 32, textAlign: 'center', fontSize: 13 }}>
          <Link href={`/campeonato/${slug}`} style={{ color: '#dc2626' }}>
            ← Campeonato
          </Link>
        </p>
      </div>
    </div>
  )
}
