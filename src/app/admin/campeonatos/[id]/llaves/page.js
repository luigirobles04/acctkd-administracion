'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }

export default function CampeonatoLlavesPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [selCat, setSelCat] = useState(null)
  const [llaves, setLlaves] = useState(null)
  const [porRonda, setPorRonda] = useState({})
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(null)
  const [generandoTodas, setGenerandoTodas] = useState(false)

  const cargarCats = useCallback(async () => {
    setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCategorias(json.categorias || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargarCats()
  }, [cargarCats])

  async function verLlave(cat) {
    setSelCat(cat)
    setLlaves(null)
    const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/${cat.id_categoria}`, { cache: 'no-store' })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      alert(json.error)
      return
    }
    setLlaves(json.llaves || [])
    setPorRonda(json.porRonda || {})
  }

  async function generarTodas() {
    const n = catsConInscritos.length
    if (!confirm(`¿Generar llaves aleatorias para las ${n} categorías con 2+ inscritos?\nSe regenerarán las existentes.`)) return
    setGenerandoTodas(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todas: true }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      const msg = `${json.generadas} llaves generadas` + (json.errores?.length ? `\n${json.errores.length} errores` : '')
      alert(msg)
      await cargarCats()
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerandoTodas(false)
    }
  }

  async function generarLlave(cat) {
    if (!confirm(`¿Generar llave de eliminación simple para "${cat.nombre}"?\n${cat.inscritos} inscritos con dorsal.`)) return
    setGenerando(cat.id_categoria)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCategoria: cat.id_categoria }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      alert(`Llave generada: ${json.combates} combates, ${json.rondas} rondas`)
      await cargarCats()
      await verLlave({ ...cat, tiene_llave: true })
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerando(null)
    }
  }

  const catsConInscritos = categorias.filter((c) => c.inscritos >= 2)

  return (
    <AdminLayout title="Llaves Kyorugi" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <p className="ios-caption" style={{ margin: '16px 0', color: 'var(--label2)', lineHeight: 1.5 }}>
          Fase 2: llaves kyorugi aleatorias con seeding WT. Si una academia tiene más de 3 inscritos, se evita que se enfrenten en la primera ronda.
        </p>

        {!loading && catsConInscritos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="ios-btn ios-btn-primary"
              disabled={generandoTodas}
              onClick={generarTodas}
            >
              {generandoTodas ? 'Generando todas…' : `Generar todas las llaves (${catsConInscritos.length})`}
            </button>
          </div>
        )}

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <>
            <div className="ios-card" style={{ padding: 16, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 12 }}>Categorías kyorugi ({catsConInscritos.length} con 2+ inscritos)</h3>
              <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
                {catsConInscritos.map((c) => (
                  <div key={c.id_categoria} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--separator)', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{c.nombre}</strong>
                      <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                        {c.inscritos} inscritos · {c.tiene_llave ? 'Llave generada' : 'Sin llave'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {c.tiene_llave && (
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={() => verLlave(c)}>
                          Ver llave
                        </button>
                      )}
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 12 }}
                        disabled={generando === c.id_categoria}
                        onClick={() => generarLlave(c)}
                      >
                        {generando === c.id_categoria ? 'Generando…' : c.tiene_llave ? 'Regenerar' : 'Generar llave'}
                      </button>
                    </div>
                  </div>
                ))}
                {catsConInscritos.length === 0 && (
                  <p style={{ color: 'var(--label3)' }}>No hay categorías con al menos 2 competidores con dorsal.</p>
                )}
              </div>
            </div>

            {selCat && llaves && (
              <div className="ios-card" style={{ padding: 16 }}>
                <h3 style={{ marginBottom: 16 }}>{selCat.nombre}</h3>
                {Object.keys(porRonda)
                  .sort((a, b) => Number(b) - Number(a))
                  .map((ronda) => {
                    const combates = (porRonda[ronda] || []).filter((m) => m.estado !== 'vacío')
                    if (!combates.length) return null
                    return (
                    <div key={ronda} style={{ marginBottom: 20 }}>
                      <p className="ios-caption" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--label2)' }}>
                        {RONDA_LABEL[ronda] || `Ronda ${ronda}`}
                      </p>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {combates.map((m) => (
                          <div key={m.id_llave} style={{ padding: 12, borderRadius: 10, background: 'var(--fill2, rgba(0,0,0,0.04))', fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <span>{m.nombre1 || '—'}</span>
                              <span style={{ color: 'var(--label3)' }}>vs</span>
                              <span>{m.nombre2 || '—'}</span>
                            </div>
                            {m.estado === 'bye' && m.id_linea1 && !m.id_linea2 && (
                              <span className="badge badge-blue" style={{ marginTop: 6, fontSize: 10 }}>Pase directo</span>
                            )}
                            {m.estado === 'vacío' && (
                              <span className="ios-caption" style={{ marginTop: 6, display: 'block', color: 'var(--label3)' }}>Sin combate</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
