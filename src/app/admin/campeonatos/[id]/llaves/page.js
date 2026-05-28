'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }

function CeldaCompetidor({ nombre, idLinea, esGanador, puedeMarcar, onMarcar, alineacion }) {
  const esPlaceholder = !idLinea || nombre === 'Por definir' || nombre === '—'
  const clickable = puedeMarcar && idLinea && !esPlaceholder

  return (
    <span
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onMarcar(idLinea) : undefined}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && onMarcar(idLinea) : undefined}
      style={{
        textAlign: alineacion,
        fontWeight: esGanador ? 700 : 400,
        color: esGanador ? 'var(--red)' : esPlaceholder ? 'var(--label3)' : 'inherit',
        cursor: clickable ? 'pointer' : 'default',
        textDecoration: clickable ? 'underline dotted' : 'none',
        padding: '2px 4px',
        borderRadius: 6,
        background: esGanador ? 'rgba(192,0,10,0.08)' : 'transparent',
      }}
      title={clickable ? 'Marcar ganador' : undefined}
    >
      {nombre || '—'}
    </span>
  )
}

function FilaCombate({ combate, marcando, onMarcarGanador }) {
  const puedeMarcar = combate.estado === 'pendiente' && combate.id_linea1 && combate.id_linea2
  const esBye = combate.estado === 'bye'

  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'var(--fill2, rgba(0,0,0,0.04))', fontSize: 13 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 32px minmax(0, 1fr)',
          alignItems: 'center',
          columnGap: 8,
        }}
      >
        <CeldaCompetidor
          nombre={combate.nombre1}
          idLinea={combate.id_linea1}
          esGanador={combate.ganador_id_linea === combate.id_linea1}
          puedeMarcar={puedeMarcar && !marcando}
          onMarcar={onMarcarGanador}
          alineacion="right"
        />
        <span style={{ color: 'var(--label3)', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>vs</span>
        <CeldaCompetidor
          nombre={combate.nombre2}
          idLinea={combate.id_linea2}
          esGanador={combate.ganador_id_linea === combate.id_linea2}
          puedeMarcar={puedeMarcar && !marcando}
          onMarcar={onMarcarGanador}
          alineacion="left"
        />
      </div>
      {esBye && combate.id_linea1 && !combate.id_linea2 && (
        <span className="badge badge-blue" style={{ marginTop: 8, fontSize: 10, display: 'inline-block' }}>Pase directo</span>
      )}
      {combate.estado === 'finalizado' && combate.ganador_id_linea && (
        <span className="ios-caption" style={{ marginTop: 8, display: 'block', color: 'var(--label3)' }}>
          Ganador registrado · {combate.puntaje1 ?? 0}–{combate.puntaje2 ?? 0}
        </span>
      )}
      {puedeMarcar && (
        <span className="ios-caption" style={{ marginTop: 8, display: 'block', color: 'var(--label3)' }}>
          Toca el nombre del ganador para avanzarlo
        </span>
      )}
    </div>
  )
}

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
  const [marcando, setMarcando] = useState(null)

  const cargarCats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCategorias(json.categorias || [])
      return json.categorias || []
    } catch (e) {
      if (!silent) alert(e.message)
      throw e
    } finally {
      if (!silent) setLoading(false)
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

    const catPrev = selCat
    setGenerandoTodas(true)
    setSelCat(null)
    setLlaves(null)
    setPorRonda({})

    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todas: true }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)

      const cats = await cargarCats({ silent: true })
      const msg = `${json.generadas} llaves generadas` + (json.errores?.length ? `\n${json.errores.length} con error` : '')
      alert(msg)

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
      await cargarCats({ silent: true })
      await verLlave({ ...cat, tiene_llave: true })
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerando(null)
    }
  }

  async function marcarGanador(idLlave, ganadorIdLinea) {
    if (!confirm('¿Registrar este competidor como ganador y avanzarlo a la siguiente ronda?')) return
    setMarcando(idLlave)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/combate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLlave, ganadorIdLinea }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      if (selCat) await verLlave(selCat)
    } catch (e) {
      alert(e.message)
    } finally {
      setMarcando(null)
    }
  }

  const catsConInscritos = categorias.filter((c) => c.inscritos >= 2)
  const bloqueado = generandoTodas || Boolean(generando)

  return (
    <AdminLayout title="Llaves Kyorugi" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px', position: 'relative' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <p className="ios-caption" style={{ margin: '16px 0', color: 'var(--label2)', lineHeight: 1.5 }}>
          Fase 2: llaves aleatorias con seeding WT. Toca el nombre del ganador para avanzarlo automáticamente.
        </p>

        {!loading && catsConInscritos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="ios-btn ios-btn-primary"
              disabled={bloqueado}
              onClick={generarTodas}
            >
              {generandoTodas ? `Generando ${catsConInscritos.length} llaves…` : `Generar todas las llaves (${catsConInscritos.length})`}
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
              maxWidth: 360,
              height: 'fit-content',
              padding: 24,
              textAlign: 'center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            }}
          >
            <p className="ios-headline" style={{ marginBottom: 8 }}>Generando llaves…</p>
            <p className="ios-caption" style={{ color: 'var(--label3)' }}>
              {catsConInscritos.length} categorías · la lista se actualizará al terminar
            </p>
          </div>
        )}

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <>
            <div className="ios-card" style={{ padding: 16, marginBottom: 20, opacity: generandoTodas ? 0.45 : 1, pointerEvents: generandoTodas ? 'none' : 'auto' }}>
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
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} disabled={bloqueado} onClick={() => verLlave(c)}>
                          Ver llave
                        </button>
                      )}
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 12 }}
                        disabled={bloqueado || generando === c.id_categoria}
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

            {selCat && llaves && !generandoTodas && (
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
                            <FilaCombate
                              key={m.id_llave}
                              combate={m}
                              marcando={marcando === m.id_llave}
                              onMarcarGanador={(idLinea) => marcarGanador(m.id_llave, idLinea)}
                            />
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
