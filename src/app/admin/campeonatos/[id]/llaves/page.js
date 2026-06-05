'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import CombateCard from '@/components/campeonatos/CombateCard'
import BracketVisual, { combateVisible } from '@/components/campeonatos/BracketVisual'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'
import {
  descargarLlavesExcel,
  descargarLlavesPdf,
  descargarCategoriaBracketPdf,
  fetchExportLlaves,
  apiError,
} from '@/lib/campeonato/export-llaves-client'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }
const VISTAS = [
  { id: 'lista', label: 'Lista' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'canchas', label: 'Canchas' },
]

export default function CampeonatoLlavesPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [selCat, setSelCat] = useState(null)
  const [llaves, setLlaves] = useState(null)
  const [porRonda, setPorRonda] = useState({})
  const [porCancha, setPorCancha] = useState(null)
  const [vista, setVista] = useState('lista')
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(null)
  const [generandoTodas, setGenerandoTodas] = useState(false)
  const [marcando, setMarcando] = useState(null)
  const [exportando, setExportando] = useState(null)

  const cargarCats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al cargar categorías'))
      setCategorias(json.categorias || [])
      return json.categorias || []
    } catch (e) {
      if (!silent) alert(e.message)
      throw e
    } finally {
      if (!silent) setLoading(false)
    }
  }, [idCampeonato])

  const cargarCanchas = useCallback(async () => {
    const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/canchas`, { cache: 'no-store' })
    const json = await readJsonResponse(res)
    if (!res.ok) throw new Error(apiError(json, 'Error al cargar canchas'))
    setPorCancha(json.porCancha || { 1: [], 2: [], 3: [] })
  }, [idCampeonato])

  useEffect(() => {
    cargarCats()
  }, [cargarCats])

  useEffect(() => {
    if (vista === 'canchas' && !porCancha && !generandoTodas) {
      cargarCanchas().catch((e) => alert(e.message))
    }
  }, [vista, porCancha, generandoTodas, cargarCanchas])

  async function verLlave(cat) {
    setSelCat(cat)
    setLlaves(null)
    setVista('lista')
    const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/${cat.id_categoria}`, { cache: 'no-store' })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      alert(apiError(json, 'Error al cargar llave'))
      return
    }
    setLlaves(json.llaves || [])
    setPorRonda(json.porRonda || {})
  }

  async function generarTodas() {
    const sinLlave = catsConInscritos.filter((c) => !c.tiene_llave)
    const n = sinLlave.length
    if (!n) { alert('Todas las categorías ya tienen llave generada.'); return }
    if (!confirm(`¿Generar llaves para ${n} categoría(s) sin llave?\nSe asignarán canchas 1–3 y colores de peto.`)) return

    const catPrev = selCat
    setGenerandoTodas(true)
    setSelCat(null)
    setLlaves(null)
    setPorRonda({})
    setPorCancha(null)

    let totalGeneradas = 0
    let totalErrores = 0
    const BATCH = 10

    try {
      for (let i = 0; i < sinLlave.length; i += BATCH) {
        const lote = sinLlave.slice(i, i + BATCH).map((c) => c.id_categoria)
        const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idsCategorias: lote }),
        })
        const json = await readJsonResponse(res)
        if (!res.ok) throw new Error(apiError(json, 'Error al generar llaves'))
        totalGeneradas += json.generadas ?? 0
        totalErrores += json.errores?.length ?? 0
      }

      const cats = await cargarCats({ silent: true })
      await cargarCanchas()
      alert(`${totalGeneradas} llave(s) generadas${totalErrores ? ` · ${totalErrores} con error` : ''} · canchas asignadas`)

      if (catPrev) {
        const actualizada = cats.find((c) => c.id_categoria === catPrev.id_categoria)
        if (actualizada) await verLlave(actualizada)
      }
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerandoTodas(false)
    }
  }

  async function generarLlave(cat) {
    if (!confirm(`¿Generar llave para "${cat.nombre}"?`)) return
    setGenerando(cat.id_categoria)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCategoria: cat.id_categoria }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al generar llave'))
      await cargarCats({ silent: true })
      setPorCancha(null)
      await verLlave({ ...cat, tiene_llave: true })
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerando(null)
    }
  }

  async function marcarGanador(idLlave, ganadorIdLinea) {
    if (!idLlave || !ganadorIdLinea) {
      alert('Combate no válido — recarga la página')
      return
    }
    if (!confirm('¿Registrar ganador y avanzarlo?')) return
    setMarcando(idLlave)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/combate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLlave: Number(idLlave), ganadorIdLinea: Number(ganadorIdLinea) }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al registrar ganador'))
      if (porCancha) await cargarCanchas()
    } catch (e) {
      alert(e.message)
    } finally {
      setMarcando(null)
    }
  }

  const catsConInscritos = categorias.filter((c) => c.inscritos >= 2)
  async function exportar(formato) {
    setExportando(formato)
    try {
      if (formato === 'xlsx') await descargarLlavesExcel(idCampeonato, campeonato?.nombre)
      else await descargarLlavesPdf(idCampeonato, campeonato?.nombre)
    } catch (e) {
      alert(e.message)
    } finally {
      setExportando(null)
    }
  }

  async function exportarCategoriaPdf() {
    if (!selCat) return
    setExportando('pdf-cat')
    try {
      await descargarCategoriaBracketPdf(idCampeonato, selCat.id_categoria, selCat.nombre)
    } catch (e) {
      alert(e.message)
    } finally {
      setExportando(null)
    }
  }

  function abrirBracketPdf({ todas = false } = {}) {
    if (todas) {
      window.open(`/admin/campeonatos/${id}/llaves/imprimir?todas=1`, '_blank')
      return
    }
    if (!selCat) {
      alert('Selecciona una categoría y abre la vista Bracket')
      return
    }
    window.open(`/admin/campeonatos/${id}/llaves/imprimir?categoria=${selCat.id_categoria}`, '_blank')
  }

  const bloqueado = generandoTodas || Boolean(generando)

  const combatesFiltrados = selCat && porRonda
    ? Object.keys(porRonda)
        .sort((a, b) => Number(b) - Number(a))
        .flatMap((ronda) =>
          (porRonda[ronda] || [])
            .filter(combateVisible)
            .map((m) => ({ ...m, rondaLabel: RONDA_LABEL[ronda] || `Ronda ${ronda}` }))
        )
    : []

  return (
    <AdminLayout title="Llaves Kyorugi" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px 24px', position: 'relative' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <p className="ios-caption" style={{ margin: '16px 0', color: 'var(--label2)', lineHeight: 1.5 }}>
          Llaves aleatorias · 3 canchas · peto azul (Chung) / rojo (Hong) · toca el ganador para avanzar.
        </p>

        {!loading && catsConInscritos.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ios-btn ios-btn-primary" disabled={bloqueado} onClick={generarTodas}>
              {generandoTodas ? `Generando ${catsConInscritos.length} llaves…` : `Generar todas (${catsConInscritos.length})`}
            </button>
            <button
              type="button"
              className={vista === 'canchas' ? 'ios-btn ios-btn-primary' : 'ios-btn ios-btn-secondary'}
              disabled={bloqueado}
              onClick={() => { setVista('canchas'); setSelCat(null) }}
            >
              Ver por canchas
            </button>
            <Link href={`/admin/campeonatos/${id}/podios`} className="ios-btn ios-btn-secondary">
              Podios
            </Link>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              disabled={bloqueado || exportando}
              onClick={() => exportar('xlsx')}
            >
              {exportando === 'xlsx' ? 'Exportando…' : 'Excel (Área 1·2·3)'}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              disabled={bloqueado || exportando}
              onClick={() => exportar('pdf')}
            >
              {exportando === 'pdf' ? 'Exportando…' : 'PDF gráficas (todas)'}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              disabled={bloqueado}
              onClick={() => abrirBracketPdf({ todas: true })}
            >
              Vista previa / imprimir
            </button>
          </div>
        )}

        {generandoTodas && (
          <div
            className="ios-card"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              margin: 'auto',
              maxWidth: 380,
              height: 'fit-content',
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <p className="ios-headline" style={{ marginBottom: 8 }}>Generando llaves…</p>
            <p className="ios-caption" style={{ color: 'var(--label3)' }}>
              {catsConInscritos.length} categorías · canchas y colores · se actualiza al terminar
            </p>
          </div>
        )}

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <>
            <div className="ios-card" style={{ padding: 16, marginBottom: 20, opacity: generandoTodas ? 0.45 : 1, pointerEvents: generandoTodas ? 'none' : 'auto' }}>
              <h3 style={{ marginBottom: 12 }}>Categorías ({catsConInscritos.length})</h3>
              <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflow: 'auto' }}>
                {catsConInscritos.map((c) => (
                  <div key={c.id_categoria} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--separator)', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{c.nombre}</strong>
                      <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                        {c.inscritos} inscritos · {c.tiene_llave ? 'Llave OK' : 'Sin llave'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {c.tiene_llave && (
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} disabled={bloqueado} onClick={() => verLlave(c)}>
                          Ver
                        </button>
                      )}
                      <button type="button" className="ios-btn ios-btn-primary" style={{ fontSize: 12 }} disabled={bloqueado || generando === c.id_categoria} onClick={() => generarLlave(c)}>
                        {generando === c.id_categoria ? '…' : c.tiene_llave ? 'Regenerar' : 'Generar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {vista === 'canchas' && porCancha && !generandoTodas && (
              <div className="ios-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Programación por cancha</h3>
                  {campeonato?.slug && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a href={`/campeonato/${campeonato.slug}/canchas`} target="_blank" rel="noreferrer" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }}>
                        Pantallas TV
                      </a>
                      {[1, 2, 3].map((n) => (
                        <a key={n} href={`/campeonato/${campeonato.slug}/cancha/${n}`} target="_blank" rel="noreferrer" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }}>
                          Área {n}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n}>
                      <div style={{ padding: '10px 14px', background: '#1a1a1a', color: '#fff', borderRadius: 10, marginBottom: 12, fontWeight: 800, fontSize: 14 }}>
                        CANCHA {n}
                        <span style={{ float: 'right', fontWeight: 400, fontSize: 12, opacity: 0.8 }}>
                          {(porCancha[n] || []).length} combates
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: 14 }}>
                        {(porCancha[n] || []).length === 0 && (
                          <p style={{ color: 'var(--label3)', fontSize: 13 }}>Sin combates asignados</p>
                        )}
                        {(() => {
                          const groups = []
                          let cur = null
                          for (const m of porCancha[n] || []) {
                            if (!cur || cur.nombre !== m.categoria_nombre) {
                              cur = { nombre: m.categoria_nombre, items: [] }
                              groups.push(cur)
                            }
                            cur.items.push(m)
                          }
                          return groups.map((g) => (
                            <div key={g.nombre}>
                              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid var(--separator)' }}>
                                {g.nombre} · Cancha {n}
                              </p>
                              {g.items.map((m) => (
                                <div key={m.id_llave} style={{ marginBottom: 8 }}>
                                  <CombateCard
                                    combate={m}
                                    compact
                                    marcando={marcando === m.id_llave}
                                    onMarcarGanador={(idLinea) => marcarGanador(m.id_llave, idLinea)}
                                  />
                                </div>
                              ))}
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selCat && llaves && !generandoTodas && (
              <div className="ios-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>{selCat.nombre}</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="ios-segment" style={{ display: 'flex', gap: 4 }}>
                      {VISTAS.filter((v) => v.id !== 'canchas').map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className={`ios-segment-item ${vista === v.id ? 'active' : ''}`}
                          onClick={() => setVista(v.id)}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    {vista === 'bracket' && (
                      <>
                        <button
                          type="button"
                          className="ios-btn ios-btn-secondary"
                          style={{ fontSize: 12 }}
                          disabled={exportando === 'pdf-cat'}
                          onClick={exportarCategoriaPdf}
                        >
                          {exportando === 'pdf-cat' ? '…' : 'PDF gráfica'}
                        </button>
                        <button
                          type="button"
                          className="ios-btn ios-btn-secondary"
                          style={{ fontSize: 12 }}
                          onClick={() => abrirBracketPdf()}
                        >
                          Imprimir
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {vista === 'bracket' ? (
                  <BracketVisual
                    porRonda={porRonda}
                    marcando={marcando}
                    onMarcarGanador={marcarGanador}
                  />
                ) : (
                  combatesFiltrados.map((m) => (
                    <div key={m.id_llave} style={{ marginBottom: 4 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--label3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {m.rondaLabel}
                      </p>
                      <CombateCard
                        combate={m}
                        marcando={marcando === m.id_llave}
                        onMarcarGanador={(idLinea) => marcarGanador(m.id_llave, idLinea)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
