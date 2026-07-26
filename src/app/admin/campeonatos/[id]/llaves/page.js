'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import CombateCard from '@/components/campeonatos/CombateCard'
import BracketVisual, { combateVisible } from '@/components/campeonatos/BracketVisual'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'
import {
  descargarLlavesExcel,
  descargarLlavesPdf,
  descargarLlavesPdfPorCancha,
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
  const [llavesSinPesaje, setLlavesSinPesaje] = useState(false)
  const [requierePesaje, setRequierePesaje] = useState(true)
  const [opsClicks, setOpsClicks] = useState(0)
  const [opsPanel, setOpsPanel] = useState(false)
  const [solosSel, setSolosSel] = useState([])
  const [destinoConsol, setDestinoConsol] = useState('')
  const [consolidando, setConsolidando] = useState(false)

  const cargarCats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al cargar categorías'))
      setCategorias(json.categorias || [])
      setLlavesSinPesaje(Boolean(json.llaves_sin_pesaje))
      setRequierePesaje(json.requiere_pesaje !== false)
      return json.categorias || []
    } catch (e) {
      if (!silent) alert(e.message)
      throw e
    } finally {
      if (!silent) setLoading(false)
    }
  }, [idCampeonato])

  const cargarCanchas = useCallback(async () => {
    const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/canchas`, { cache: 'no-store' })
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
    const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/${cat.id_categoria}`, { cache: 'no-store' })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      alert(apiError(json, 'Error al cargar llave'))
      return
    }
    setLlaves(json.llaves || [])
    setPorRonda(json.porRonda || {})
  }

  async function generarTodas() {
    const sinLlave = catsGenerables.filter((c) => !c.tiene_llave)
    const n = sinLlave.length
    if (!n) { alert('No hay categorías listas para generar llave (completa el pesaje primero).'); return }
    if (!confirm(`¿Generar llaves para ${n} categoría(s) con pesaje OK?\nSe asignarán canchas 1–3 y colores de peto.`)) return

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
        const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
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
    if (!cat.puede_generar) {
      alert(requierePesaje
        ? `"${cat.nombre}": faltan competidores con pesaje OK (${cat.aptos ?? 0} aptos de ${cat.inscritos ?? 0} inscritos).`
        : `Se necesitan al menos 2 competidores con dorsal.`)
      return
    }
    if (!confirm(`¿Generar llave para "${cat.nombre}"?`)) return
    setGenerando(cat.id_categoria)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
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
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/combate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLlave: Number(idLlave), ganadorIdLinea: Number(ganadorIdLinea) }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al registrar ganador'))
      if (porCancha) await cargarCanchas()
      if (selCat) await verLlave(selCat)
    } catch (e) {
      alert(e.message)
    } finally {
      setMarcando(null)
    }
  }

  async function marcarWalkover(idLlave, ganadorIdLinea) {
    if (!idLlave || !ganadorIdLinea) return
    if (!confirm('¿Walkover (W/O)? El rival no se presentó — avanzará sin pelear.')) return
    setMarcando(idLlave)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/combate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLlave: Number(idLlave), ganadorIdLinea: Number(ganadorIdLinea), walkover: true }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error W/O'))
      if (porCancha) await cargarCanchas()
      if (selCat) await verLlave(selCat)
    } catch (e) {
      alert(e.message)
    } finally {
      setMarcando(null)
    }
  }

  async function oroUnico(cat) {
    if (!confirm(`¿Oro automático para "${cat.nombre}" (1 solo competidor)?`)) return
    setGenerando(cat.id_categoria)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/especial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'oro_unico', idCategoria: cat.id_categoria }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error oro único'))
      await cargarCats({ silent: true })
      alert(`Oro registrado para ${cat.nombre}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setGenerando(null)
    }
  }

  function toggleSolo(idCat) {
    setSolosSel((prev) => {
      const next = prev.includes(idCat) ? prev.filter((x) => x !== idCat) : [...prev, idCat]
      setDestinoConsol((d) => {
        const cur = Number(d)
        if (next.includes(cur)) return d
        return next.length ? String(next[0]) : ''
      })
      return next
    })
  }

  async function consolidarOros() {
    if (solosSel.length < 2) {
      alert('Selecciona al menos 2 categorías con 1 competidor')
      return
    }
    const destId = Number(destinoConsol)
    if (!destId || !solosSel.includes(destId)) {
      alert('Elige la categoría destino (debe estar seleccionada)')
      return
    }
    const destNombre = catsSolo.find((c) => c.id_categoria === destId)?.nombre || 'destino'
    if (!confirm(
      `¿Consolidar ${solosSel.length} competidores en "${destNombre}" y generar llave competitiva?\n\n` +
      'Se moverán a esa categoría (aunque el peso original sea distinto) y se creará la llave con medallas oficiales.'
    )) return

    setConsolidando(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/especial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'consolidar',
          idsCategorias: solosSel,
          idCategoriaDestino: destId,
        }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error al consolidar'))
      setSolosSel([])
      setDestinoConsol('')
      const cats = await cargarCats({ silent: true })
      const dest = (cats || []).find((c) => c.id_categoria === destId)
      if (dest) await verLlave(dest)
      alert(`Llave generada en "${json.categoria_destino}" · ${json.participantes} competidores`)
    } catch (e) {
      alert(e.message)
    } finally {
      setConsolidando(false)
    }
  }

  async function crearExhibicion(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const dorsal1 = String(fd.get('dorsal1') || '').trim()
    const dorsal2 = String(fd.get('dorsal2') || '').trim()
    const cancha = Number(fd.get('cancha') || 1)
    if (!dorsal1 || !dorsal2) { alert('Ingresa dos dorsales'); return }
    setExportando('exhibicion')
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/especial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'exhibicion', dorsal1, dorsal2, cancha }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiError(json, 'Error exhibición'))
      e.target.reset()
      await cargarCanchas()
      alert(`Exhibición creada en área ${json.cancha} · combate #${json.orden_pista}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setExportando(null)
    }
  }

  const catsConInscritos = categorias.filter((c) => c.inscritos >= 2)
  const catsGenerables = categorias.filter((c) => c.puede_generar)
  const catsSolo = categorias.filter((c) => (requierePesaje ? c.aptos === 1 : c.inscritos === 1) && !c.tiene_llave)

  function registrarClickOps() {
    const n = opsClicks + 1
    setOpsClicks(n)
    if (n >= 5) {
      setOpsClicks(0)
      const clave = prompt('Clave operaciones:')
      if (!clave) return
      adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'config_ops', clave, llaves_sin_pesaje: llavesSinPesaje }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.error) {
            alert(json.error)
            return
          }
          setOpsPanel(true)
        })
        .catch((e) => alert(e.message))
      return
    }
    window.setTimeout(() => setOpsClicks(0), 2500)
  }

  async function toggleLlavesSinPesaje() {
    const clave = prompt('Clave operaciones:')
    if (!clave) return
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'config_ops', clave, llaves_sin_pesaje: !llavesSinPesaje }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No autorizado')
      setLlavesSinPesaje(Boolean(json.llaves_sin_pesaje))
      setRequierePesaje(!json.llaves_sin_pesaje)
      await cargarCats({ silent: true })
    } catch (e) {
      alert(e.message)
    }
  }
  async function exportar(formato) {
    setExportando(formato)
    try {
      if (formato === 'xlsx') await descargarLlavesExcel(idCampeonato, campeonato?.nombre)
      else if (formato === 'pdf') await descargarLlavesPdf(idCampeonato, campeonato?.nombre)
      else if (formato.startsWith('pdf-area-')) {
        const cancha = Number(formato.replace('pdf-area-', ''))
        await descargarLlavesPdfPorCancha(idCampeonato, campeonato?.nombre, cancha)
      }
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

  const bloqueado = generandoTodas || Boolean(generando) || consolidando

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

        <p
          className="ios-caption"
          style={{ margin: '16px 0', color: 'var(--label2)', lineHeight: 1.5, userSelect: 'none' }}
          onClick={registrarClickOps}
          title=""
        >
          Llaves aleatorias · 3 canchas · peto azul (Chung) / rojo (Hong) · toca el ganador para avanzar.
          {requierePesaje && (
            <span style={{ display: 'block', marginTop: 6, color: '#b45309' }}>
              Generación bloqueada hasta pesaje OK — completa Pesaje antes de armar llaves.
            </span>
          )}
        </p>

        {opsPanel && (
          <div style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 50, background: '#1a1a1a', color: '#fff',
            padding: '10px 14px', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={llavesSinPesaje} onChange={toggleLlavesSinPesaje} />
              Llaves sin pesaje (modo prueba)
            </label>
            <button type="button" onClick={() => setOpsPanel(false)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 11 }}>
              Cerrar
            </button>
          </div>
        )}

        {!loading && catsGenerables.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ios-btn ios-btn-primary" disabled={bloqueado} onClick={generarTodas}>
              {generandoTodas ? `Generando ${catsGenerables.length} llaves…` : `Generar todas (${catsGenerables.filter((c) => !c.tiene_llave).length})`}
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
            {[1, 2, 3].map((area) => (
              <button
                key={area}
                type="button"
                className="ios-btn ios-btn-secondary"
                disabled={bloqueado || exportando}
                onClick={() => exportar(`pdf-area-${area}`)}
              >
                {exportando === `pdf-area-${area}` ? 'Exportando…' : `PDF Área ${area}`}
              </button>
            ))}
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
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99 }} aria-hidden />
            <div
              className="ios-card camp-spinner-overlay"
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
              <div className="camp-spinner" aria-hidden />
              <p className="ios-headline" style={{ marginBottom: 8, marginTop: 16 }}>Generando llaves…</p>
              <p className="ios-caption" style={{ color: 'var(--label3)' }}>
                {catsConInscritos.length} categorías · canchas y colores
              </p>
            </div>
          </>
        )}

        {!loading && catsSolo.length > 0 && (
          <div className="ios-card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ margin: '0 0 8px' }}>Categorías con 1 competidor ({catsSolo.length})</h3>
            <p className="ios-caption" style={{ color: 'var(--label2)', marginBottom: 12 }}>
              Marca 2 o más para consolidarlos en una categoría y generar llave real.
              O da oro único a cada uno, o crea una exhibición abajo.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {catsSolo.map((c) => {
                const checked = solosSel.includes(c.id_categoria)
                return (
                  <div key={c.id_categoria} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSolo(c.id_categoria)}
                        disabled={bloqueado || consolidando}
                      />
                      <span style={{ minWidth: 0 }}>
                        <strong>{c.nombre}</strong>
                        {c.solo && (
                          <span className="ios-caption" style={{ display: 'block', color: 'var(--label3)', marginTop: 2 }}>
                            {c.solo.dorsal || '—'} · {c.solo.nombre}
                          </span>
                        )}
                      </span>
                    </label>
                    <button type="button" className="ios-btn ios-btn-primary" style={{ fontSize: 12 }} disabled={bloqueado || consolidando || generando === c.id_categoria} onClick={() => oroUnico(c)}>
                      {generando === c.id_categoria ? '…' : '🥇 Oro único'}
                    </button>
                  </div>
                )
              })}
            </div>
            {solosSel.length >= 2 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--separator)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ fontSize: 12, flex: '1 1 220px' }}>
                  Categoría destino (nombre de la llave)
                  <select
                    className="ios-input"
                    value={destinoConsol}
                    onChange={(e) => setDestinoConsol(e.target.value)}
                    style={{ display: 'block', marginTop: 4 }}
                  >
                    {solosSel.map((idCat) => {
                      const c = catsSolo.find((x) => x.id_categoria === idCat)
                      return (
                        <option key={idCat} value={idCat}>{c?.nombre || idCat}</option>
                      )
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  className="ios-btn ios-btn-primary"
                  disabled={bloqueado || consolidando}
                  onClick={consolidarOros}
                >
                  {consolidando ? 'Consolidando…' : `Consolidar y generar llave (${solosSel.length})`}
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && (
          <div className="ios-card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px' }}>Combate de exhibición</h3>
            <p className="ios-caption" style={{ color: 'var(--label2)', marginBottom: 12 }}>
              No afecta el podio. Inserta en la cola del área indicada (ideal para categorías con un solo inscrito).
            </p>
            <form onSubmit={crearExhibicion} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 12 }}>
                Dorsal 1
                <input name="dorsal1" className="ios-input" placeholder="101" style={{ display: 'block', marginTop: 4, width: 80 }} />
              </label>
              <label style={{ fontSize: 12 }}>
                Dorsal 2
                <input name="dorsal2" className="ios-input" placeholder="205" style={{ display: 'block', marginTop: 4, width: 80 }} />
              </label>
              <label style={{ fontSize: 12 }}>
                Área
                <select name="cancha" className="ios-input" defaultValue="1" style={{ display: 'block', marginTop: 4 }}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
              <button type="submit" className="ios-btn ios-btn-secondary" disabled={exportando === 'exhibicion'}>
                {exportando === 'exhibicion' ? '…' : 'Agregar exhibición'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <LoadingState mensaje="Cargando llaves…" />
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
                        {requierePesaje
                          ? `${c.aptos ?? 0} aptos · ${c.inscritos ?? 0} inscritos`
                          : `${c.inscritos ?? 0} inscritos`}
                        {' · '}{c.tiene_llave ? 'Llave OK' : c.puede_generar ? 'Listo' : 'Falta pesaje'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {c.tiene_llave && (
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} disabled={bloqueado} onClick={() => verLlave(c)}>
                          Ver
                        </button>
                      )}
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 12, opacity: c.puede_generar ? 1 : 0.45 }}
                        disabled={bloqueado || generando === c.id_categoria || !c.puede_generar}
                        onClick={() => generarLlave(c)}
                      >
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
                                    onWalkover={(idLinea) => marcarWalkover(m.id_llave, idLinea)}
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
                    onWalkover={marcarWalkover}
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
                        onWalkover={(idLinea) => marcarWalkover(m.id_llave, idLinea)}
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
