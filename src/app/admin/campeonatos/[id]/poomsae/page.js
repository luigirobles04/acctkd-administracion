'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { readJsonResponse } from '@/lib/public-app-url'

export default function CampeonatoPoomsaePage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selCat, setSelCat] = useState(null)
  const [buscar, setBuscar] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/poomsae`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al cargar poomsae')
      setCampeonato(json.campeonato)
      setCategorias(json.categorias || [])
      setResumen(json.resumen || null)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const catsFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    let items = categorias.filter((c) => c.inscritos > 0)
    if (q) {
      items = items.filter((c) => {
        const text = [c.nombre, c.division, c.genero, ...c.participantes.map((p) => `${p.nombres} ${p.academia}`)].join(' ').toLowerCase()
        return text.includes(q)
      })
    }
    return items
  }, [categorias, buscar])

  const catActiva = selCat || catsFiltradas[0] || null

  return (
    <AdminLayout title="Orden Poomsae" subtitle={campeonato?.nombre}>
      <div className="podios-root">
        <div className="no-print podios-toolbar">
          <Link href={`/admin/campeonatos/${id}`} className="podios-back">
            ← Campeonato
          </Link>
          <div className="podios-stats">
            {resumen && (
              <>
                <span>{resumen.conInscritos} categorías</span>
                <span>{resumen.totalParticipantes} participantes</span>
              </>
            )}
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Buscar categoría o competidor…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="ios-input"
            style={{ flex: '1 1 240px', maxWidth: 360 }}
          />
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : !catsFiltradas.length ? (
          <p style={{ color: '#64748b' }}>No hay inscripciones poomsae aprobadas en este campeonato.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 20, alignItems: 'start' }}>
            <aside className="ios-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13 }}>
                Categorías
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
                {catsFiltradas.map((c) => (
                  <li key={c.id_categoria}>
                    <button
                      type="button"
                      onClick={() => setSelCat(c)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        background: catActiva?.id_categoria === c.id_categoria ? '#eff6ff' : 'transparent',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {c.inscritos} inscrito(s) · {c.division} {c.genero}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="ios-card" style={{ padding: 16 }}>
              {catActiva ? (
                <>
                  <header style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #fbbf24' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{catActiva.nombre}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      {catActiva.division} · {catActiva.genero} · {catActiva.inscritos} participantes
                    </p>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fef9c3', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: 48 }}>#</th>
                        <th style={{ padding: '8px 10px', width: 72 }}>Dorsal</th>
                        <th style={{ padding: '8px 10px' }}>Competidor</th>
                        <th style={{ padding: '8px 10px' }}>Academia</th>
                        <th style={{ padding: '8px 10px' }}>Modalidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catActiva.participantes.map((p, i) => (
                        <tr key={p.id_linea} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#64748b' }}>{p.orden}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{p.dorsal || '—'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 500 }}>{p.nombres}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{p.academia}</td>
                          <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b' }}>{p.modalidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>Selecciona una categoría.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
