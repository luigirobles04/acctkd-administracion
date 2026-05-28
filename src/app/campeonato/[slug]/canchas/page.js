'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import '@/components/campeonatos/pantalla-cancha.css'

export default function CanchasSelectorPage() {
  const { slug } = useParams()
  const [camp, setCamp] = useState(null)

  useEffect(() => {
    fetch(`/api/inscripcion/campeonato/${slug}`)
      .then((r) => r.json())
      .then((j) => setCamp(j.campeonato))
      .catch(() => {})
  }, [slug])

  return (
    <div className="pantalla-selector">
      <h1>{camp?.nombre || 'Pantallas por área'}</h1>
      <p>Abre la pantalla en un TV o monitor de cada área de combate. Se actualiza sola cada 5 segundos.</p>
      <div className="pantalla-selector-grid">
        {[1, 2, 3].map((n) => (
          <Link key={n} href={`/campeonato/${slug}/cancha/${n}`} className="pantalla-selector-card" target="_blank">
            <span>ÁREA DE COMBATE</span>
            <strong>{n}</strong>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: 32, fontSize: 13, color: '#64748b' }}>
        <Link href={`/campeonato/${slug}`} style={{ color: '#dc2626' }}>
          ← Volver al campeonato
        </Link>
      </p>
    </div>
  )
}
