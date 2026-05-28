'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'

function qrUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

export default function CredencialesPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [competidores, setCompetidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/credenciales`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCompetidores(json.competidores || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const lista = competidores.filter((c) => {
    const q = filtro.trim().toLowerCase()
    if (!q) return true
    return [c.dorsal, c.nombres, c.categoria, c.academia].join(' ').toLowerCase().includes(q)
  })

  return (
    <AdminLayout title="Credenciales" subtitle={campeonato?.nombre}>
      <div className="credenciales-root" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px 32px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <div style={{ display: 'flex', gap: 10, margin: '16px 0', flexWrap: 'wrap', alignItems: 'center' }} className="no-print">
          <input
            className="ios-input"
            placeholder="Buscar dorsal, nombre, categoría…"
            style={{ flex: '1 1 200px', maxWidth: 360 }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <button type="button" className="ios-btn ios-btn-primary" onClick={() => window.print()}>
            Imprimir credenciales
          </button>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {lista.map((c) => (
              <div
                key={c.id_linea}
                className="credencial-card"
                style={{
                  border: '2px solid #111',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#fff',
                  breakInside: 'avoid',
                }}
              >
                <div style={{ background: '#C0000A', color: '#fff', padding: '8px 12px', fontWeight: 800, fontSize: 13 }}>
                  ACCTKD · {campeonato?.nombre}
                </div>
                <div style={{ display: 'flex', gap: 12, padding: 12 }}>
                  <div style={{ flexShrink: 0 }}>
                    {c.foto_url ? (
                      <img src={c.foto_url} alt="" style={{ width: 72, height: 88, objectFit: 'cover', borderRadius: 6, border: '2px solid #eee' }} />
                    ) : (
                      <div style={{ width: 72, height: 88, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>
                        Sin foto
                      </div>
                    )}
                    <img src={qrUrl(c.qr_data)} alt="QR" width={72} height={72} style={{ marginTop: 6, borderRadius: 4 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#C0000A', lineHeight: 1 }}>{c.dorsal}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>{c.nombres}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{c.academia}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8, padding: '4px 8px', background: '#f3f4f6', borderRadius: 6 }}>
                      {c.categoria}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <style jsx global>{`
          @media print {
            .no-print, nav, aside, header { display: none !important; }
            .credenciales-root { max-width: none !important; padding: 0 !important; }
            .credencial-card { page-break-inside: avoid; }
          }
        `}</style>
      </div>
    </AdminLayout>
  )
}
