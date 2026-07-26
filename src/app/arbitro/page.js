'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isArbitroMesa, isAdmin, isOrganizador, isAdminCampeonato, logout } from '@/lib/services/auth.service'
import { adminFetch } from '@/lib/admin-client'
import { getSupabase } from '@/lib/supabase'
import LoadingState from '@/components/ui/LoadingState'
import '@/components/arbitro/arbitro.css'

const CTX_KEY = 'acctkd_arbitro_ctx'

function leerCtx() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(CTX_KEY) || 'null')
  } catch {
    return null
  }
}

function guardarCtx(ctx) {
  localStorage.setItem(CTX_KEY, JSON.stringify(ctx))
}

export default function ArbitroPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [ctx, setCtx] = useState(null)

  useEffect(() => {
    const u = getCurrentUser()
    const permitido = u && (isArbitroMesa(u) || isAdmin(u) || isOrganizador(u) || isAdminCampeonato(u))
    if (!permitido) {
      router.replace('/login')
      return
    }
    setUser(u)
    setCtx(leerCtx())
    setChecking(false)
  }, [router])

  function actualizarCtx(patch) {
    setCtx((prev) => {
      const next = { ...(prev || {}), ...patch }
      guardarCtx(next)
      return next
    })
  }

  function cambiarTodo() {
    localStorage.removeItem(CTX_KEY)
    setCtx(null)
  }

  async function salir() {
    await logout()
    router.push('/login')
  }

  if (checking) return null

  return (
    <div className="arb-shell">
      <header className="arb-topbar">
        <div className="arb-topbar-title">
          <strong>ÁRBITRO / MESA</strong>
          <span>{user?.nombre || user?.username}{ctx?.nombreCampeonato ? ` · ${ctx.nombreCampeonato}` : ''}</span>
        </div>
        <div className="arb-topbar-actions">
          {ctx?.idCampeonato && (
            <button className="arb-chip-btn" onClick={cambiarTodo}>Cambiar</button>
          )}
          <button className="arb-chip-btn" onClick={salir}>Salir</button>
        </div>
      </header>

      {!ctx?.idCampeonato ? (
        <SelectorCampeonato onSeleccionar={(camp) => actualizarCtx({ idCampeonato: camp.id_campeonato, nombreCampeonato: camp.nombre, modo: null, cancha: null })} />
      ) : !ctx?.modo ? (
        <SelectorModo onSeleccionar={(modo) => actualizarCtx({ modo, cancha: null })} />
      ) : ctx.modo === 'kyorugi' && !ctx.cancha ? (
        <SelectorCancha onSeleccionar={(cancha) => actualizarCtx({ cancha })} onVolver={() => actualizarCtx({ modo: null })} />
      ) : ctx.modo === 'kyorugi' ? (
        <PanelKyorugi idCampeonato={ctx.idCampeonato} cancha={ctx.cancha} onCambiarCancha={() => actualizarCtx({ cancha: null })} />
      ) : (
        <PanelPoomsae idCampeonato={ctx.idCampeonato} />
      )}
    </div>
  )
}

function SelectorCampeonato({ onSeleccionar }) {
  const [campeonatos, setCampeonatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from('campeonato')
          .select('id_campeonato, nombre, ciudad, lugar, estado, fecha_inicio')
          .order('fecha_inicio', { ascending: false })
          .limit(20)
        if (error) throw error
        setCampeonatos(data || [])
      } catch (e) {
        setError(e.message || 'No se pudo cargar campeonatos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="arb-container">
      <h1 className="arb-h1">Elige el campeonato</h1>
      <p className="arb-sub">Selecciona el evento en el que vas a registrar resultados hoy.</p>

      {loading ? (
        <LoadingState mensaje="Cargando campeonatos…" light />
      ) : error ? (
        <p style={{ color: '#f87171' }}>{error}</p>
      ) : campeonatos.length === 0 ? (
        <div className="arb-empty">No hay campeonatos disponibles.</div>
      ) : (
        <div className="arb-grid-cards">
          {campeonatos.map((c) => (
            <button key={c.id_campeonato} className="arb-card" onClick={() => onSeleccionar(c)}>
              <div className="arb-card-icon">🏆</div>
              <div className="arb-card-body">
                <strong>{c.nombre}</strong>
                <span>{[c.lugar, c.ciudad].filter(Boolean).join(' · ') || 'Sin ubicación'}</span>
              </div>
              <span className={`arb-badge ${c.estado === 'en_curso' ? 'arb-badge--live' : 'arb-badge--wait'}`}>
                {c.estado === 'en_curso' ? 'En curso' : c.estado}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SelectorModo({ onSeleccionar }) {
  return (
    <div className="arb-container">
      <h1 className="arb-h1">¿Qué vas a arbitrar?</h1>
      <p className="arb-sub">Elige la modalidad que vas a operar en este momento.</p>
      <div className="arb-grid-cards">
        <button className="arb-card" onClick={() => onSeleccionar('kyorugi')}>
          <div className="arb-card-icon">🥋</div>
          <div className="arb-card-body">
            <strong>Kyorugi (combate)</strong>
            <span>Registra el ganador de cada combate en tu área asignada</span>
          </div>
        </button>
        <button className="arb-card" onClick={() => onSeleccionar('poomsae')}>
          <div className="arb-card-icon">🎯</div>
          <div className="arb-card-body">
            <strong>Poomsae</strong>
            <span>Califica competidores por categoría, en el orden que decidas</span>
          </div>
        </button>
      </div>
    </div>
  )
}

function SelectorCancha({ onSeleccionar, onVolver }) {
  return (
    <div className="arb-container">
      <button className="arb-btn-outline" onClick={onVolver} style={{ marginBottom: 16 }}>← Volver</button>
      <h1 className="arb-h1">Elige tu área / cancha</h1>
      <p className="arb-sub">Verás únicamente los combates asignados a esa área.</p>
      <div className="arb-grid-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[1, 2, 3].map((n) => (
          <button key={n} className="arb-card" style={{ flexDirection: 'column', textAlign: 'center', gap: 6 }} onClick={() => onSeleccionar(n)}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>{n}</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Área {n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function nombreLado(comp) {
  if (!comp?.id_linea) return 'Por definir'
  return `${comp.dorsal || ''} ${comp.nombres || ''}`.trim() || `#${comp.id_linea}`
}

function PanelKyorugi({ idCampeonato, cancha, onCambiarCancha }) {
  const [combates, setCombates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marcando, setMarcando] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/canchas`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCombates(json.porCancha?.[cancha] || [])
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo cargar combates')
    } finally {
      setLoading(false)
    }
  }, [idCampeonato, cancha])

  useEffect(() => {
    setLoading(true)
    cargar()
    const t = setInterval(cargar, 8000)
    return () => clearInterval(t)
  }, [cargar])

  async function marcarGanador(combate, idLinea, { walkover = false } = {}) {
    setMarcando(combate.id_llave)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/llaves/combate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLlave: combate.id_llave, ganadorIdLinea: idLinea, walkover }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      await cargar()
    } catch (e) {
      alert(e.message || 'No se pudo registrar el ganador')
    } finally {
      setMarcando(null)
    }
  }

  const pendientes = useMemo(
    () => combates.filter((c) => c.estado === 'pendiente' && c.id_linea1 && c.id_linea2).sort((a, b) => (a.orden_pista || 9999) - (b.orden_pista || 9999)),
    [combates]
  )
  const finalizados = useMemo(
    () => combates.filter((c) => c.estado === 'finalizado').slice(-6).reverse(),
    [combates]
  )

  return (
    <div className="arb-container">
      <div className="arb-toolbar">
        <button className="arb-btn-outline" onClick={onCambiarCancha}>Área {cancha} · cambiar</button>
        <button className="arb-btn-outline" onClick={cargar}>↻ Actualizar</button>
      </div>
      <h1 className="arb-h1">Combates — Área {cancha}</h1>
      <p className="arb-sub">Toca el color del ganador apenas termine el combate. Se refleja al instante en pantalla TV y podios.</p>

      {loading ? (
        <LoadingState mensaje="Cargando combates…" light />
      ) : error ? (
        <p style={{ color: '#f87171' }}>{error}</p>
      ) : pendientes.length === 0 ? (
        <div className="arb-empty">No hay combates pendientes en esta área.</div>
      ) : (
        pendientes.map((c, i) => (
          <div key={c.id_llave} className={`arb-combate ${i === 0 ? 'arb-combate--actual' : ''}`}>
            <div className="arb-combate-meta">
              <span>{c.categoria_nombre} · {c.rondaLabel}</span>
              <strong>Combate #{c.match_numero || c.id_llave}</strong>
            </div>
            <div className="arb-vs-row">
              <div className="arb-competidor">
                <div className="arb-competidor-dorsal">AZUL · {c.competidor1?.dorsal}</div>
                <div className="arb-competidor-nombre">{nombreLado(c.competidor1)}</div>
                <div className="arb-competidor-academia">{c.competidor1?.academia}</div>
              </div>
              <span className="arb-vs-label">VS</span>
              <div className="arb-competidor" style={{ textAlign: 'right' }}>
                <div className="arb-competidor-dorsal">ROJO · {c.competidor2?.dorsal}</div>
                <div className="arb-competidor-nombre">{nombreLado(c.competidor2)}</div>
                <div className="arb-competidor-academia">{c.competidor2?.academia}</div>
              </div>
            </div>
            <div className="arb-win-btns">
              <button
                className="arb-win-btn arb-win-btn--azul"
                disabled={marcando === c.id_llave}
                onClick={() => marcarGanador(c, c.id_linea1)}
              >
                🔵 Ganó Azul
              </button>
              <button
                className="arb-win-btn arb-win-btn--rojo"
                disabled={marcando === c.id_llave}
                onClick={() => marcarGanador(c, c.id_linea2)}
              >
                🔴 Ganó Rojo
              </button>
            </div>
            <div className="arb-win-btns" style={{ marginTop: 8 }}>
              <button
                className="arb-win-btn"
                style={{ flex: 1, background: '#fef3c7', color: '#92400e', fontSize: 13 }}
                disabled={marcando === c.id_llave}
                onClick={() => { if (confirm('W/O — ¿Azul gana porque el rival no vino?')) marcarGanador(c, c.id_linea1, { walkover: true }) }}
              >
                W/O → Azul
              </button>
              <button
                className="arb-win-btn"
                style={{ flex: 1, background: '#fef3c7', color: '#92400e', fontSize: 13 }}
                disabled={marcando === c.id_llave}
                onClick={() => { if (confirm('W/O — ¿Rojo gana porque el rival no vino?')) marcarGanador(c, c.id_linea2, { walkover: true }) }}
              >
                W/O → Rojo
              </button>
            </div>
          </div>
        ))
      )}

      {finalizados.length > 0 && (
        <>
          <p className="arb-section-title">Últimos resultados</p>
          {finalizados.map((c) => {
            const ganador = c.ganador_id_linea === c.id_linea1 ? c.competidor1 : c.competidor2
            return (
              <div key={c.id_llave} className="arb-combate" style={{ padding: 12 }}>
                <div className="arb-combate-meta" style={{ marginBottom: 4 }}>
                  <span>{c.categoria_nombre} · {c.rondaLabel}</span>
                </div>
                <div className="arb-resultado-pill">
                  ★ Ganó {nombreLado(ganador)}
                  {c.motivo_resultado === 'walkover' ? ' · W/O' : ''}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function PanelPoomsae({ idCampeonato }) {
  const [categorias, setCategorias] = useState([])
  const [catActivaId, setCatActivaId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsMigration, setNeedsMigration] = useState(false)
  const [scores, setScores] = useState({})
  const [guardando, setGuardando] = useState(null)
  const [podio, setPodio] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/poomsae`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCategorias((json.categorias || []).filter((c) => c.inscritos > 0))
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo cargar poomsae')
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => { cargar() }, [cargar])

  const catActiva = useMemo(() => categorias.find((c) => c.id_categoria === catActivaId) || null, [categorias, catActivaId])

  async function guardarPuntaje(idLinea) {
    const puntaje = scores[idLinea]
    if (puntaje === undefined || puntaje === '') return
    setGuardando(idLinea)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/poomsae/puntaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLinea, puntaje: Number(puntaje) }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.needsMigration) setNeedsMigration(true)
        throw new Error(json.error)
      }
      await cargar()
    } catch (e) {
      alert(e.message || 'No se pudo guardar el puntaje')
    } finally {
      setGuardando(null)
    }
  }

  async function cerrarCategoria() {
    if (!catActiva) return
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/poomsae/puntaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCategoria: catActiva.id_categoria, cerrarCategoria: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPodio(json.podio || [])
    } catch (e) {
      alert(e.message || 'No se pudo calcular el podio')
    }
  }

  if (needsMigration) {
    return (
      <div className="arb-container">
        <div className="arb-empty">
          Falta aplicar una migración de base de datos para habilitar la calificación de poomsae.
          Pide al administrador que ejecute <code>20260701120000_arbitraje_y_logos.sql</code>.
        </div>
      </div>
    )
  }

  if (!catActiva) {
    return (
      <div className="arb-container">
        <h1 className="arb-h1">Poomsae — categorías</h1>
        <p className="arb-sub">Elige a qué categoría vas a calificar ahora. Puedes cambiar en cualquier momento.</p>
        {loading ? (
          <LoadingState mensaje="Cargando categorías…" light />
        ) : error ? (
          <p style={{ color: '#f87171' }}>{error}</p>
        ) : categorias.length === 0 ? (
          <div className="arb-empty">No hay categorías de poomsae con inscritos.</div>
        ) : (
          <div className="arb-grid-cards">
            {categorias.map((c) => (
              <button key={c.id_categoria} className="arb-card" onClick={() => setCatActivaId(c.id_categoria)}>
                <div className="arb-card-icon">🎯</div>
                <div className="arb-card-body">
                  <strong>{c.nombre}</strong>
                  <span>{c.inscritos} inscritos{c.calificados ? ` · ${c.calificados} calificados` : ''}</span>
                </div>
                {c.cerrada && <span className="arb-badge arb-badge--live">Completa</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="arb-container">
      <div className="arb-toolbar">
        <button className="arb-btn-outline" onClick={() => { setCatActivaId(null); setPodio(null) }}>← Categorías</button>
        <button className="arb-btn-outline" onClick={cargar}>↻ Actualizar</button>
        <button className="arb-btn-fill" onClick={cerrarCategoria}>🏁 Calcular podio</button>
      </div>
      <h1 className="arb-h1">{catActiva.nombre}</h1>
      <p className="arb-sub">Ingresa el puntaje (0–10) de cada competidor en el orden que decidas y guarda.</p>

      {podio && (
        <div className="arb-podio-box">
          <strong style={{ fontSize: 13, letterSpacing: '0.06em', color: '#fbbf24' }}>PODIO CALCULADO</strong>
          {podio.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Aún no hay competidores calificados.</p>
          ) : (
            podio.map((p, i) => {
              const linea = catActiva.participantes.find((x) => x.id_linea === p.id_linea)
              return (
                <div key={p.id_linea} className="arb-podio-item">
                  <span>{['🥇', '🥈', '🥉'][i]}</span>
                  <span>{linea?.nombres || `#${p.id_linea}`}</span>
                  <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>{p.puntaje}</span>
                </div>
              )
            })
          )}
        </div>
      )}

      <p className="arb-section-title">Participantes</p>
      {catActiva.participantes.map((p) => (
        <div key={p.id_linea} className={`arb-poomsae-row ${p.calificado ? 'arb-poomsae-row--calificado' : ''}`}>
          <div className="arb-poomsae-orden">{p.orden}</div>
          <div className="arb-poomsae-info">
            <strong>{p.nombres}</strong>
            <span>{p.dorsal} · {p.academia}</span>
          </div>
          <input
            className="arb-score-input"
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder={p.puntaje != null ? String(p.puntaje) : '—'}
            value={scores[p.id_linea] ?? ''}
            onChange={(e) => setScores((s) => ({ ...s, [p.id_linea]: e.target.value }))}
          />
          <button
            className="arb-save-btn"
            disabled={guardando === p.id_linea || scores[p.id_linea] === undefined || scores[p.id_linea] === ''}
            onClick={() => guardarPuntaje(p.id_linea)}
          >
            {guardando === p.id_linea ? '...' : 'Guardar'}
          </button>
        </div>
      ))}
    </div>
  )
}
