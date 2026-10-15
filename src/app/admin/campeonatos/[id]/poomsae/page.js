'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState, { LoadingSpinner } from '@/components/ui/LoadingState'
import { readJsonResponse } from '@/lib/public-app-url'
import { descargarPoomsaeExcel, descargarPoomsaePdf, descargarPoomsaeCategoriaPdf } from '@/lib/campeonato/export-poomsae'
import { categoriasPoomsaeValidas } from '@/lib/campeonato/validar-categoria'

export default function CampeonatoPoomsaePage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selCat, setSelCat] = useState(null)
  const [buscar, setBuscar] = useState('')
  const [sorteando, setSorteando] = useState(false)
  const [sorteoMsg, setSorteoMsg] = useState('')
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([])
  const [editParticipante, setEditParticipante] = useState(null)
  const [editCatId, setEditCatId] = useState('')
  const [accionBusy, setAccionBusy] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/poomsae`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al cargar poomsae')
      setCampeonato(json.campeonato)
      setCategorias(json.categorias || [])
      setCategoriasDisponibles(json.categoriasDisponibles || [])
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

  const catActiva = useMemo(() => {
    if (selCat) {
      const fresh = categorias.find((c) => c.id_categoria === selCat.id_categoria)
      if (fresh) return fresh
    }
    return catsFiltradas[0] || null
  }, [selCat, categorias, catsFiltradas])

  async function sortear(payload, mensajeOk) {
    const esTodas = Boolean(payload.todas)
    setSorteoMsg(
      payload.reset
        ? 'Restaurando orden por dorsal…'
        : esTodas
          ? 'Sorteando todas las categorías…'
          : 'Sorteando categoría…',
    )
    setSorteando(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/poomsae`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error en el sorteo')
      setCategorias(json.categorias || [])
      setResumen(json.resumen || null)
      if (mensajeOk) {
        const extra =
          json.categoriasSorteadas != null
            ? ` (${json.categoriasSorteadas} cat. · ${json.lineasActualizadas ?? '—'} líneas)`
            : ''
        alert(`${mensajeOk}${extra}`)
      }
    } catch (e) {
      alert(e.message)
    } finally {
      setSorteando(false)
      setSorteoMsg('')
    }
  }

  const anioCampeonato = campeonato?.fecha_inicio
    ? new Date(campeonato.fecha_inicio).getFullYear()
    : new Date().getFullYear()

  function categoriasValidasPara(p) {
    if (!p?.perfil) return categoriasDisponibles
    try {
      return categoriasPoomsaeValidas(categoriasDisponibles, p.perfil, anioCampeonato)
    } catch {
      return categoriasDisponibles
    }
  }

  function abrirCambiarCategoria(p) {
    setEditParticipante(p)
    setEditCatId(p.id_categoria ? String(p.id_categoria) : '')
  }

  async function guardarCategoriaParticipante(e) {
    e.preventDefault()
    if (!editParticipante || !editCatId) return
    setAccionBusy(editParticipante.id_linea)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/linea`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLinea: editParticipante.id_linea,
          idCategoria: editCatId,
        }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setEditParticipante(null)
      await cargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setAccionBusy(null)
    }
  }

  async function eliminarParticipante(p) {
    if (!confirm(`¿Eliminar a ${p.nombres} (${p.dorsal}) del campeonato? Se anula la inscripción y se quita del sorteo/puntaje poomsae.`)) return
    setAccionBusy(p.id_linea)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/linea`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLinea: p.id_linea, accion: 'anular_linea' }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      await cargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setAccionBusy(null)
    }
  }

  function exportar(tipo) {
    const cats = categorias.filter((c) => c.inscritos > 0)
    if (!cats.length) { alert('No hay participantes para exportar.'); return }
    if (tipo === 'excel') descargarPoomsaeExcel(campeonato, cats)
    else descargarPoomsaePdf(campeonato, cats)
  }

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

        {resumen?.pendientesPago > 0 && (
          <div className="ios-card no-print" style={{ padding: 14, marginBottom: 16, background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.35)' }}>
            <p className="ios-headline" style={{ marginBottom: 6, fontSize: 14 }}>
              {resumen.pendientesPago} competidor(es) con pago pendiente (resaltados en la tabla)
            </p>
            <p className="ios-caption" style={{ color: 'var(--label2)', lineHeight: 1.45, marginBottom: 8 }}>
              Aparecen en el sorteo y en mesa de puntuación con dorsal asignado. El pago se valida aparte en Pagos.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--label2)' }}>
              {(resumen.pendientesPagoLista || []).slice(0, 12).map((x) => (
                <li key={x.id_linea}>
                  {x.nombres || 'Sin nombre'} · dorsal {x.dorsal}
                </li>
              ))}
            </ul>
            <Link href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-secondary" style={{ marginTop: 12, fontSize: 12 }}>
              Ir a pagos
            </Link>
          </div>
        )}

        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Buscar categoría o competidor…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="ios-input"
            style={{ flex: '1 1 240px', maxWidth: 360 }}
          />
          <button
            type="button"
            className="ios-btn ios-btn-primary"
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            disabled={sorteando}
            onClick={() => {
              if (confirm('¿Sortear el orden de salida de TODAS las categorías poomsae? Se reemplazará cualquier sorteo previo.')) {
                sortear({ todas: true }, 'Sorteo realizado en todas las categorías.')
              }
            }}
          >
            {sorteando ? <><LoadingSpinner size={16} light /> Sorteando…</> : '🎲 Sortear todas'}
          </button>
          <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }} disabled={sorteando} onClick={() => exportar('excel')}>⬇ Excel</button>
          <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }} disabled={sorteando} onClick={() => exportar('pdf')}>⬇ PDF</button>
        </div>

        {sorteando && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99 }} aria-hidden />
            <div
              className="ios-card"
              role="status"
              aria-live="polite"
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
              <LoadingSpinner size={40} />
              <p className="ios-headline" style={{ marginBottom: 8, marginTop: 16 }}>
                {sorteoMsg || 'Sorteando…'}
              </p>
              <p className="ios-caption" style={{ color: 'var(--label3)' }}>
                {resumen
                  ? `${resumen.conInscritos || 0} categorías · ${resumen.totalParticipantes || 0} participantes`
                  : 'No cierres esta ventana'}
              </p>
            </div>
          </>
        )}

        {resumen && resumen.soporteSorteo === false && (
          <div className="no-print ios-card" style={{ padding: 12, marginBottom: 16, background: 'rgba(255,149,0,0.12)', color: '#8a5300', fontSize: 13 }}>
            El sorteo aún no está disponible: falta aplicar la migración <code>orden_poomsae</code> en la base de datos. El orden mostrado es por dorsal.
          </div>
        )}

        {loading ? (
          <LoadingState mensaje="Cargando poomsae…" />
        ) : !catsFiltradas.length ? (
          <p style={{ color: '#64748b' }}>No hay inscripciones poomsae con dorsal en este campeonato.</p>
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
                  <header style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #fbbf24', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                        {catActiva.nombre}
                        {catActiva.sorteada && (
                          <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 11, verticalAlign: 'middle' }}>Sorteada</span>
                        )}
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                        {catActiva.division} · {catActiva.genero} · {catActiva.inscritos} participantes
                        {!catActiva.sorteada && ' · orden por dorsal'}
                      </p>
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        disabled={sorteando}
                        onClick={() => sortear({ idCategoria: catActiva.id_categoria }, `Sorteo realizado: ${catActiva.nombre}.`)}
                      >
                        {sorteando ? <><LoadingSpinner size={14} light /> …</> : '🎲 Sortear'}
                      </button>
                      {catActiva.sorteada && (
                        <button
                          type="button"
                          className="ios-btn ios-btn-ghost"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                          disabled={sorteando}
                          onClick={() => sortear({ idCategoria: catActiva.id_categoria, reset: true }, 'Orden restaurado por dorsal.')}
                        >
                          ↺ Por dorsal
                        </button>
                      )}
                      <button
                        type="button"
                        className="ios-btn ios-btn-ghost"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => descargarPoomsaeCategoriaPdf(campeonato, catActiva)}
                      >
                        ⬇ PDF
                      </button>
                    </div>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fef9c3', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: 48 }}>#</th>
                        <th style={{ padding: '8px 10px', width: 72 }}>Dorsal</th>
                        <th style={{ padding: '8px 10px' }}>Competidor</th>
                        <th style={{ padding: '8px 10px' }}>Academia</th>
                        <th style={{ padding: '8px 10px' }}>Modalidad</th>
                        <th style={{ padding: '8px 10px', width: 160 }} className="no-print">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catActiva.participantes.map((p, i) => (
                        <tr
                          key={p.id_linea}
                          style={{
                            background: p.faltaPago
                              ? 'rgba(255,149,0,0.18)'
                              : i % 2
                                ? '#f8fafc'
                                : '#fff',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#64748b' }}>{p.orden}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{p.dorsal || '—'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 500 }}>
                            {p.nombres}
                            {p.faltaPago && (
                              <span className="badge badge-yellow" style={{ marginLeft: 8, fontSize: 10 }}>Pago pendiente</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{p.academia}</td>
                          <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b' }}>{p.modalidad}</td>
                          <td className="no-print" style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              <button
                                type="button"
                                className="ios-btn ios-btn-ghost"
                                style={{ fontSize: 11, padding: '4px 8px' }}
                                disabled={accionBusy === p.id_linea}
                                onClick={() => abrirCambiarCategoria(p)}
                              >
                                Categoría
                              </button>
                              <button
                                type="button"
                                className="ios-btn ios-btn-ghost"
                                style={{ fontSize: 11, padding: '4px 8px', color: 'var(--red)' }}
                                disabled={accionBusy === p.id_linea}
                                onClick={() => eliminarParticipante(p)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
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

        {editParticipante && (
          <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <form
              className="ios-card"
              style={{ width: '100%', maxWidth: 420, padding: 20 }}
              onSubmit={guardarCategoriaParticipante}
            >
              <h3 className="ios-headline" style={{ marginBottom: 8 }}>Cambiar categoría</h3>
              <p className="ios-caption" style={{ color: 'var(--label2)', marginBottom: 14 }}>
                {editParticipante.nombres} · {editParticipante.dorsal}. Se reinicia sorteo y puntaje de esta línea.
              </p>
              <select
                className="ios-input"
                required
                value={editCatId}
                onChange={(e) => setEditCatId(e.target.value)}
              >
                <option value="">Elegir categoría…</option>
                {categoriasValidasPara(editParticipante).map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre} · {c.division} {c.genero}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setEditParticipante(null)}>
                  Cancelar
                </button>
                <button type="submit" className="ios-btn ios-btn-primary" disabled={accionBusy === editParticipante.id_linea}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
