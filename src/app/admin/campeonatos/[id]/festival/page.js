'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { readJsonResponse } from '@/lib/public-app-url'
import { descargarFestivalExcel, descargarFestivalPdf } from '@/lib/campeonato/export-festival'

export default function CampeonatoFestivalPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [grupos, setGrupos] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selGrupo, setSelGrupo] = useState(null)
  const [buscar, setBuscar] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/festival`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al cargar festival')
      setCampeonato(json.campeonato)
      setGrupos(json.grupos || [])
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

  const gruposActivos = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    let items = grupos.filter((g) => g.total > 0)
    if (q) {
      items = items.filter((g) => {
        const text = [g.division, g.edadLabel, ...g.participantes.map((p) => `${p.nombre} ${p.academia}`)]
          .join(' ')
          .toLowerCase()
        return text.includes(q)
      })
    }
    return items
  }, [grupos, buscar])

  const grupoActivo = useMemo(() => {
    if (selGrupo) {
      const fresh = gruposActivos.find((g) => g.key === selGrupo.key)
      if (fresh) return fresh
    }
    return gruposActivos[0] || null
  }, [selGrupo, gruposActivos])

  function exportar(tipo) {
    const activos = grupos.filter((g) => g.total > 0)
    if (!activos.length) {
      alert('No hay participantes de festival para exportar.')
      return
    }
    if (tipo === 'excel') descargarFestivalExcel(campeonato, grupos)
    else descargarFestivalPdf(campeonato, grupos)
  }

  return (
    <AdminLayout title="Planilla Festival" subtitle={campeonato?.nombre}>
      <div className="podios-root">
        <div className="no-print podios-toolbar">
          <Link href={`/admin/campeonatos/${id}`} className="podios-back">
            ← Campeonato
          </Link>
          <div className="podios-stats">
            {resumen && (
              <>
                <span>{resumen.gruposConInscritos} grupos</span>
                <span>{resumen.totalParticipantes} participantes</span>
              </>
            )}
          </div>
        </div>

        <div className="no-print ios-card" style={{ padding: 14, marginBottom: 16, fontSize: 13, color: '#475569' }}>
          Los festivales no generan llaves. Esta planilla agrupa participantes por edad (formato oficial FestCup) para
          imprimir o entregar al área de festival.
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Buscar grupo o competidor…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="ios-input"
            style={{ flex: '1 1 240px', maxWidth: 360 }}
          />
          <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }} onClick={() => exportar('excel')}>
            ⬇ Excel planilla
          </button>
          <button type="button" className="ios-btn ios-btn-primary" style={{ fontSize: 13 }} onClick={() => exportar('pdf')}>
            ⬇ PDF planilla
          </button>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : !gruposActivos.length ? (
          <p style={{ color: '#64748b' }}>
            No hay inscripciones de festival aprobadas. Importa la hoja FESTIVAL del Excel de inscripción.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 20, alignItems: 'start' }}>
            <aside className="ios-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13 }}>
                Grupos por edad
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
                {gruposActivos.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => setSelGrupo(g)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        background: grupoActivo?.key === g.key ? '#fef2f2' : 'transparent',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{g.division}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {g.edadLabel} · {g.total} participante(s)
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="ios-card" style={{ padding: 16 }}>
              {grupoActivo ? (
                <>
                  <header style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #C0000A' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{grupoActivo.division}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      {grupoActivo.edadLabel} · {grupoActivo.total} participantes · orden F → M → nombre
                    </p>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fee2e2', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Nombre y apellido</th>
                        <th style={{ padding: '8px 10px' }}>Institución</th>
                        <th style={{ padding: '8px 10px', width: 120 }}>Categoría</th>
                        <th style={{ padding: '8px 10px', width: 64 }}>Género</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupoActivo.participantes.map((p, i) => (
                        <tr key={p.id_linea} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 500 }}>{p.nombre}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{p.academia}</td>
                          <td style={{ padding: '8px 10px', fontSize: 12 }}>{p.division}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{p.sexo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>Selecciona un grupo.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
