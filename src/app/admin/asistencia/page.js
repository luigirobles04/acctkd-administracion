'use client'
import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  listarTurnos,
  listarAsistenciaDeTurno,
  listarAsistenciaRangoTurno,
  listarAsistenciaDiaTodosLosTurnos,
  listarAsistenciaRangoTodosLosTurnos,
  marcarAsistencia,
  marcarTodosPresentes,
  ESTADOS,
  turnoTieneSesionEsteDia,
  inicioSemanaLunesISO,
  finSemanaDomingoISO,
  rangoMesContainingISO,
} from '@/lib/services/asistencia.service'
import { iniciales, formatFechaLarga, formatFecha, hoyISO, DIAS_SEMANA } from '@/lib/utils/format'

const OPCIONES_ESTADO = [
  { id: ESTADOS.PRESENTE, label: 'P', help: 'Presente' },
  { id: ESTADOS.AUSENTE, label: 'A', help: 'Ausente' },
  { id: ESTADOS.JUSTIFICADA, label: 'J', help: 'Justificada' },
  { id: ESTADOS.RECUPERACION, label: 'R', help: 'Recuperación' },
]

const MODOS_VISTA = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' },
]

function addDaysISO(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d + delta)
  const yy = t.getFullYear()
  const mm = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function diasDeTurno(turno) {
  if (Array.isArray(turno?.dias_array) && turno.dias_array.length) {
    return turno.dias_array
      .map((n) => DIAS_SEMANA.find((d) => d.id === n)?.corto)
      .filter(Boolean)
      .join('·')
  }
  return turno?.dias_semana || ''
}

function horario(turno) {
  if (!turno?.hora_inicio) return ''
  return `${turno.hora_inicio.slice(0, 5)}–${turno.hora_fin?.slice(0, 5) || ''}`
}

function simboloEstado(estado) {
  if (estado === ESTADOS.PRESENTE) return 'P'
  if (estado === ESTADOS.JUSTIFICADA) return 'J'
  if (estado === ESTADOS.RECUPERACION) return 'R'
  return 'A'
}

function colorCeldaRango(estado) {
  if (estado === ESTADOS.PRESENTE || estado === ESTADOS.RECUPERACION) return '#D1FAE5'
  if (estado === ESTADOS.JUSTIFICADA) return '#FEF3C7'
  return '#F3F4F6'
}

const VAL_TURNOS_TODOS = 'todos'

export default function AsistenciaPage() {
  const [turnos, setTurnos] = useState([])
  const [fecha, setFecha] = useState(() => hoyISO())
  const [fechaDesdeRango, setFechaDesdeRango] = useState(() => addDaysISO(hoyISO(), -7))
  const [fechaHastaRango, setFechaHastaRango] = useState(() => hoyISO())
  const [modoVista, setModoVista] = useState('dia')
  const [valorTurno, setValorTurno] = useState(VAL_TURNOS_TODOS)

  /** @type {[{ turno:any, clase:any, filas:any[] }] | null} */
  const [bloquesDia, setBloquesDia] = useState(null)
  /** un solo turno (día) */
  const [claseSingle, setClaseSingle] = useState(null)
  const [filasSingle, setFilasSingle] = useState([])

  /** @type {Awaited<ReturnType<typeof listarAsistenciaRangoTurno>> | null} */
  const [matrizSingle, setMatrizSingle] = useState(null)
  /** todas las matrices rango por turno */
  const [matricesTodos, setMatricesTodos] = useState(null)

  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [toast, setToast] = useState('')
  const [initError, setInitError] = useState('')

  useEffect(() => {
    ;(async () => {
      setInitError('')
      try {
        const ts = await listarTurnos()
        setTurnos(ts)
      } catch (e) {
        console.error(e)
        const msg =
          typeof e.message === 'string' && /Supabase/i.test(e.message)
            ? e.message
            : 'No se pudieron cargar los turnos. Revisa tu conexión y variables Supabase.'
        setInitError(msg)
      }
    })()
  }, [])

  const idsTurnos = useMemo(() => {
    const n = valorTurno === VAL_TURNOS_TODOS ? null : Number(valorTurno)
    return { esTodos: valorTurno === VAL_TURNOS_TODOS, idTurno: n }
  }, [valorTurno])

  const periodoCalculado = useMemo(() => {
    if (modoVista === 'dia') return { desde: fecha, hasta: fecha }
    if (modoVista === 'semana') {
      const l = inicioSemanaLunesISO(fecha)
      return { desde: l, hasta: finSemanaDomingoISO(l) }
    }
    if (modoVista === 'mes') {
      const { desde, hasta } = rangoMesContainingISO(fecha)
      return { desde, hasta }
    }
    const d0 = fechaDesdeRango <= fechaHastaRango ? fechaDesdeRango : fechaHastaRango
    const d1 = fechaDesdeRango <= fechaHastaRango ? fechaHastaRango : fechaDesdeRango
    return { desde: d0, hasta: d1 }
  }, [modoVista, fecha, fechaDesdeRango, fechaHastaRango])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnos.length, fecha, fechaDesdeRango, fechaHastaRango, modoVista, valorTurno])

  async function cargar() {
    if (!turnos.length) {
      setLoading(false)
      return
    }

    const { desde, hasta } = periodoCalculado
    setLoading(true)
    setToast('')
    setBloquesDia(null)
    setMatrizSingle(null)
    setMatricesTodos(null)
    setClaseSingle(null)
    setFilasSingle([])
    try {
      if (modoVista === 'dia') {
        if (idsTurnos.esTodos) {
          const bloques = await listarAsistenciaDiaTodosLosTurnos(fecha)
          setBloquesDia(bloques)
        } else {
          const sel = turnos.find((x) => x.id_turno === idsTurnos.idTurno)
          if (!sel || !turnoTieneSesionEsteDia(fecha, sel.dias_array)) {
            setClaseSingle(null)
            setFilasSingle([])
          } else {
            const { clase, filas } = await listarAsistenciaDeTurno({ idTurno: idsTurnos.idTurno, fecha })
            setClaseSingle(clase)
            setFilasSingle(filas)
          }
        }
      } else {
        if (idsTurnos.esTodos) {
          const mats = await listarAsistenciaRangoTodosLosTurnos({ fechaDesde: desde, fechaHasta: hasta })
          setMatricesTodos(mats)
        } else if (idsTurnos.idTurno) {
          const m = await listarAsistenciaRangoTurno({ idTurno: idsTurnos.idTurno, fechaDesde: desde, fechaHasta: hasta })
          setMatrizSingle(m)
        }
      }
    } catch (e) {
      console.error(e)
      setToast('Error al cargar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function mostrarToast(msg) {
    setToast(msg)
    setInitError('')
    setTimeout(() => setToast(''), 1600)
  }

  async function cambiarEstado(idAlumno, estado, idClase) {
    if (!idClase) return
    const key = `${idClase}-${idAlumno}`
    setSavingKey(key)

    const actualizarLista = (prev) =>
      prev.map((f) => (f.alumno.id_alumno === idAlumno ? { ...f, estado } : f))

    if (!idsTurnos.esTodos && modoVista === 'dia') setFilasSingle(actualizarLista)
    if (bloquesDia?.length && idsTurnos.esTodos) {
      setBloquesDia(
        bloquesDia.map((bl) =>
          bl.clase?.id_clase === idClase ? { ...bl, filas: actualizarLista(bl.filas || []) } : bl,
        ),
      )
    }
    try {
      await marcarAsistencia({ idClase, idAlumno, estado })
      mostrarToast('Guardado')
    } catch (e) {
      console.error(e)
      mostrarToast('Error al guardar')
      cargar()
    } finally {
      setSavingKey(null)
    }
  }

  async function marcarTodosBloque(idClase, filas) {
    if (!filas?.length || !idClase) return
    const ids = filas.map((f) => f.alumno.id_alumno)
    try {
      await marcarTodosPresentes({ idClase, idsAlumnos: ids })

      const marcar = (lista) =>
        lista.map((f) => ({
          ...f,
          estado: ESTADOS.PRESENTE,
        }))

      if (!idsTurnos.esTodos && modoVista === 'dia') setFilasSingle((prev) => marcar(prev))
      if (bloquesDia?.length && idsTurnos.esTodos) {
        setBloquesDia(
          bloquesDia.map((bl) =>
            bl.clase?.id_clase === idClase ? { ...bl, filas: marcar(bl.filas || []) } : bl,
          ),
        )
      }
      mostrarToast(`${ids.length} marcados presentes`)
    } catch (e) {
      mostrarToast('Error: ' + e.message)
    }
  }

  const resumenFilasLocal = useMemo(() => {
    let filas =
      modoVista === 'dia'
        ? !idsTurnos.esTodos && claseSingle && filasSingle.length
          ? filasSingle
          : []
        : []
    const r = { total: filas.length, p: 0, a: 0, j: 0, rec: 0 }
    for (const f of filas) {
      if (f.estado === ESTADOS.PRESENTE) r.p++
      else if (f.estado === ESTADOS.JUSTIFICADA) r.j++
      else if (f.estado === ESTADOS.RECUPERACION) r.rec++
      else r.a++
    }
    const base = r.p + r.a + r.j
    return { ...r, pct: base > 0 ? Math.round((r.p / base) * 100) : 0 }
  }, [modoVista, idsTurnos.esTodos, claseSingle, filasSingle])

  const textoPeriodoLinea = useMemo(() => {
    const { desde, hasta } = periodoCalculado
    if (desde === hasta) return formatFechaLarga(desde)
    return `${formatFecha(desde)} → ${formatFecha(hasta)}`
  }, [periodoCalculado])

  function resumenDeMatriz(m) {
    if (!m?.matrix || !m?.alumnos?.length || !m?.fechasSesion?.length) return null
    let cel = 0
    let fal = 0
    let pr = 0
    let ju = 0
    let re = 0
    for (const { fecha: fiso } of m.fechasSesion) {
      const col = m.matrix.get(fiso)
      if (!col) continue
      for (const alum of m.alumnos) {
        const e = col.get(alum.id_alumno) ?? ESTADOS.AUSENTE
        cel++
        if (e === ESTADOS.AUSENTE) fal++
        else if (e === ESTADOS.PRESENTE) pr++
        else if (e === ESTADOS.JUSTIFICADA) ju++
        else if (e === ESTADOS.RECUPERACION) re++
      }
    }
    const base = fal + pr + ju
    return { celulas: cel, ausentes: fal, presentes: pr, justif: ju, recuper: re, pct: base > 0 ? Math.round(((pr + re) / base) * 100) : 0 }
  }

  const resumenRangoTodos = useMemo(() => {
    if (!matricesTodos?.length) return null
    let ac = {
      celulas: 0,
      ausentes: 0,
      presentes: 0,
      justif: 0,
      recuper: 0,
    }
    for (const bloc of matricesTodos) {
      const rs = resumenDeMatriz(bloc)
      if (!rs) continue
      ac.celulas += rs.celulas
      ac.ausentes += rs.ausentes
      ac.presentes += rs.presentes
      ac.justif += rs.justif
      ac.recuper += rs.recuper
    }
    const base = ac.ausentes + ac.presentes + ac.justif
    const pct = base > 0 ? Math.round(((ac.presentes + ac.recuper) / base) * 100) : 0
    return { ...ac, pct }
  }, [matricesTodos])

  const resumenRangoSingle = useMemo(() => resumenDeMatriz(matrizSingle), [matrizSingle])

  const diaValidoUnTurno =
    modoVista === 'dia' && !idsTurnos.esTodos
      ? turnoTieneSesionEsteDia(fecha, turnos.find((t) => t.id_turno === idsTurnos.idTurno)?.dias_array)
      : true

  return (
    <AdminLayout title="Asistencia" subtitle={`${textoPeriodoLinea.charAt(0).toUpperCase() + textoPeriodoLinea.slice(1)} · filtros inferiores`}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {(initError || toast) && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '11px 14px',
              borderRadius: 12,
              fontSize: 13,
              background: initError ? 'rgba(229,57,53,0.1)' : 'rgba(5,150,105,0.12)',
              border: initError ? '1px solid rgba(229,57,53,0.35)' : '1px solid rgba(5,150,105,0.35)',
              color: initError ? '#B71C1C' : '#065F46',
            }}
          >
            {initError || toast}
          </div>
        )}

        <div className="ios-form-section" style={{ marginBottom: 14 }}>
          <div className="ios-form-row" style={{ alignItems: 'center' }}>
            <span className="ios-form-row-label">Filtrar período</span>
            <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" className={`ios-chip ${modoVista === 'dia' ? 'active' : ''}`} onClick={() => setModoVista('dia')}>
                Por día
              </button>
              <button type="button" className={`ios-chip ${modoVista === 'semana' ? 'active' : ''}`} onClick={() => setModoVista('semana')}>
                Por semana
              </button>
              <button type="button" className={`ios-chip ${modoVista === 'mes' ? 'active' : ''}`} onClick={() => setModoVista('mes')}>
                Por mes
              </button>
              <button type="button" className={`ios-chip ${modoVista === 'rango' ? 'active' : ''}`} onClick={() => setModoVista('rango')}>
                Rango libre
              </button>
            </div>
          </div>
          <div className="ios-form-row" style={{ borderTop: '0.5px solid var(--separator)', marginTop: 6, paddingTop: 8 }}>
            <span style={{ flex: '1 1 100%', fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
              De <strong style={{ letterSpacing: 0 }}>{periodoCalculado.desde}</strong> a{' '}
              <strong style={{ letterSpacing: 0 }}>{periodoCalculado.hasta}</strong>
              {modoVista === 'dia' ? ' (un día)' : ''}
              {modoVista === 'semana' ? ' (lunes–domingo de la fecha de referencia)' : ''}
              {modoVista === 'mes' ? ' (mes natural de la referencia)' : ''}
              {modoVista === 'rango' ? ' (entre las dos fechas que elijas)' : ''}
            </span>
          </div>
          {modoVista === 'rango' && (
            <>
              <div className="ios-form-row">
                <span className="ios-form-row-label">Desde</span>
                <input type="date" value={fechaDesdeRango} onChange={(e) => setFechaDesdeRango(e.target.value)} style={{ textAlign: 'right' }} />
              </div>
              <div className="ios-form-row">
                <span className="ios-form-row-label">Hasta</span>
                <input type="date" value={fechaHastaRango} onChange={(e) => setFechaHastaRango(e.target.value)} style={{ textAlign: 'right' }} />
              </div>
            </>
          )}
          {(modoVista === 'dia' || modoVista === 'semana' || modoVista === 'mes') && (
            <div className="ios-form-row">
              <span className="ios-form-row-label">{modoVista === 'dia' ? 'Día seleccionado' : 'Mes / semana desde'}</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ textAlign: 'right' }} />
            </div>
          )}
          <div className="ios-form-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span style={{ flex: '1 1 160px', fontSize: 12, color: 'var(--label3)', lineHeight: 1.5 }}>
              Atajo: fecha de referencia usa <strong>hoy</strong> al entrar en la página. Con «Todos los horarios» verás cada turno del mismo día /
              período en bloques seguidos.
            </span>
            <button type="button" className="ios-chip" style={{ flexShrink: 0 }} onClick={() => setFecha(hoyISO())}>
              Hoy como referencia
            </button>
          </div>
        </div>

        <div className="ios-form-section" style={{ marginBottom: 16 }}>
          <div className="ios-form-row">
            <span className="ios-form-row-label">Horario · turno</span>
            <select
              value={valorTurno}
              onChange={(e) => setValorTurno(e.target.value === VAL_TURNOS_TODOS ? VAL_TURNOS_TODOS : e.target.value)}
              style={{
                flex: 1,
                textAlign: 'right',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: 'var(--label)',
                fontFamily: 'inherit',
                minWidth: 0,
              }}
            >
              <option value={VAL_TURNOS_TODOS}>Todos los horarios (dia / semana / mes / rango)</option>
              {turnos.map((t) => (
                <option key={t.id_turno} value={String(t.id_turno)}>
                  {t.nombre} · {horario(t)} · {diasDeTurno(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {modoVista === 'dia' && !idsTurnos.esTodos && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              <Stat label="Total" valor={diaValidoUnTurno ? resumenFilasLocal.total : '—'} color="var(--label)" />
              <Stat label="Presentes" valor={diaValidoUnTurno ? resumenFilasLocal.p : '—'} color="#059669" />
              <Stat label="Ausentes" valor={diaValidoUnTurno ? resumenFilasLocal.a : '—'} color="#6B7280" />
              <Stat label="Justif." valor={diaValidoUnTurno ? resumenFilasLocal.j : '—'} color="#F59E0B" />
              <Stat label="Recup." valor={diaValidoUnTurno ? resumenFilasLocal.rec : '—'} color="#3B82F6" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--label3)', fontWeight: 600 }}>
                Asistencia real:{' '}
                <strong style={{ color: 'var(--label)' }}>{diaValidoUnTurno ? `${resumenFilasLocal.pct}%` : '—'}</strong>
              </span>
              <div style={{ flex: 1 }} />
              <button
                className="ios-chip"
                onClick={() => claseSingle && marcarTodosBloque(claseSingle.id_clase, filasSingle)}
                disabled={!filasSingle.length || loading || !diaValidoUnTurno}
                style={{ background: '#059669', color: '#fff', fontWeight: 600 }}
              >
                Todos presentes (este turno)
              </button>
            </div>
          </>
        )}

        {(modoVista === 'semana' || modoVista === 'mes' || modoVista === 'rango') &&
          ((idsTurnos.esTodos ? resumenRangoTodos : resumenRangoSingle)?.celulas || 0) > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8 }}>
                {(() => {
                  const r = idsTurnos.esTodos ? resumenRangoTodos : resumenRangoSingle
                  if (!r) return null
                  return (
                    <>
                      <Stat label="Celdas" valor={r.celulas} color="var(--label)" />
                      <Stat label="Ausentes · A" valor={r.ausentes} color="#6B7280" />
                      <Stat label="Presentes · P" valor={r.presentes} color="#059669" />
                      <Stat label="Justif. · J" valor={r.justif} color="#F59E0B" />
                      <Stat label="Recup. · R" valor={r.recuper} color="#3B82F6" />
                      <Stat label="Cubre sesión %" valor={`${r.pct}%`} color="#1F3864" />
                    </>
                  )
                })()}
              </div>
            </div>
          )}

        {/* evita doble estadística en día+todos */}
        {modoVista === 'dia' && idsTurnos.esTodos && bloquesDia?.length ? (
          <p style={{ fontSize: 12, color: 'var(--label3)', marginBottom: 12 }}>
            Varios horarios este día · puedes pasar lista en cada bloque por separado.
          </p>
        ) : null}

        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <div className="ios-empty">
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: '2px solid var(--red)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 8px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Cargando…
            </div>
          ) : !turnos.length ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">event_busy</span>
              <p>No hay turnos registrados</p>
            </div>
          ) : modoVista === 'dia' && idsTurnos.esTodos ? (
            !bloquesDia?.length ? (
              <div className="ios-empty">
                <span className="material-symbols-rounded ios-empty-icon">calendar_month</span>
                <p style={{ fontWeight: 600 }}>Ningún turno tiene sesión este día</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  Cambia la fecha · hoy corresponde a: <strong>{formatFechaLarga(hoyISO())}</strong>
                </p>
              </div>
            ) : (
              bloquesDia.map((bl) => (
                <BloqueDiaTurno
                  key={`${bl.turno?.id_turno}-${bl.clase?.id_clase}-${fecha}`}
                  bloque={bl}
                  savingKey={savingKey}
                  onEstado={(idAlum, est) => cambiarEstado(idAlum, est, bl.clase?.id_clase)}
                  onTodosPresentes={() => marcarTodosBloque(bl.clase?.id_clase, bl.filas)}
                />
              ))
            )
          ) : modoVista === 'dia' && !idsTurnos.esTodos && !diaValidoUnTurno ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">calendar_month</span>
              <p style={{ fontWeight: 600 }}>Este día no corresponde a una sesión de este turno</p>
            </div>
          ) : modoVista === 'dia' && !filasSingle.length ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">groups</span>
              <p>No hay alumnos asignados a este turno</p>
            </div>
          ) : modoVista === 'dia' && idsTurnos.esTodos === false ? (
            filasSingle.map((f, i) => (
              <FilaAsistencia
                key={f.alumno.id_alumno}
                index={i + 1}
                fila={f}
                saving={savingKey === `${claseSingle?.id_clase}-${f.alumno.id_alumno}`}
                onEstado={(est) => cambiarEstado(f.alumno.id_alumno, est, claseSingle?.id_clase)}
              />
            ))
          ) : idsTurnos.esTodos && matricesTodos?.length ? (
            matricesTodos.map((matBloc) => <TablaMatrizTurno key={`t-${matBloc.turno?.id_turno}-${matBloc.fechaDesde}`} bloc={matBloc} />)
          ) : !idsTurnos.esTodos && matrizSingle ? (
            <TablaMatrizTurno key={`one-${matrizSingle.turno?.id_turno}`} bloc={matrizSingle} />
          ) : modoVista !== 'dia' ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">event_busy</span>
              <p>No hay datos en ese período / turno</p>
            </div>
          )}
        </div>

        {toast && !initError && <div className="ios-toast">{toast}</div>}
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AdminLayout>
  )
}

function Stat({ label, valor, color }) {
  const vDisp = valor == null ? '—' : valor
  return (
    <div className="ios-form-section" style={{ padding: '10px 8px', textAlign: 'center', margin: 0 }}>
      <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{vDisp}</p>
      <p
        style={{
          fontSize: 10,
          color: 'var(--label3)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 700,
        }}
      >
        {label}
      </p>
    </div>
  )
}

function BloqueDiaTurno({ bloque, savingKey, onEstado, onTodosPresentes }) {
  const t = bloque.turno
  const filas = bloque.filas || []

  const res = useMemo(() => {
    const r = { total: filas.length, p: 0, a: 0, j: 0, rec: 0 }
    for (const f of filas) {
      if (f.estado === ESTADOS.PRESENTE) r.p++
      else if (f.estado === ESTADOS.JUSTIFICADA) r.j++
      else if (f.estado === ESTADOS.RECUPERACION) r.rec++
      else r.a++
    }
    const base = r.p + r.a + r.j
    return { ...r, pct: base > 0 ? Math.round((r.p / base) * 100) : 0 }
  }, [filas])

  return (
    <>
      <div
        style={{
          padding: '12px 14px',
          background: 'rgba(60,60,67,0.06)',
          borderBottom: '0.5px solid var(--separator)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <strong style={{ fontSize: 15 }}>{t?.nombre || 'Turno'}</strong>
        <span style={{ fontSize: 12, color: 'var(--label3)' }}>
          {horario(t)} · {diasDeTurno(t)}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--label3)' }}>
          Lista: presentes ~{res.pct}% ({res.total} alumnos)
        </span>
        <button type="button" className="ios-chip" style={{ background: '#059669', color: '#fff', fontWeight: 600 }} onClick={onTodosPresentes}>
          Todos presentes
        </button>
      </div>
      {filas.length === 0 ? (
        <div className="ios-empty">
          <p style={{ padding: '12px 16px', fontSize: 13 }}>Sin alumnos en este turno.</p>
        </div>
      ) : (
        filas.map((f, i) => (
          <FilaAsistencia
            key={f.alumno.id_alumno}
            index={i + 1}
            fila={f}
            saving={savingKey === `${bloque.clase?.id_clase}-${f.alumno.id_alumno}`}
            onEstado={(est) => onEstado(f.alumno.id_alumno, est)}
          />
        ))
      )}
    </>
  )
}

function TablaMatrizTurno({ bloc }) {
  const keyBase = `${bloc.turno?.id_turno}-${bloc.fechaDesde}-${bloc.fechaHasta}`
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '0.5px solid var(--separator)',
          fontWeight: 700,
          fontSize: 14,
          background: 'rgba(60,60,67,0.05)',
        }}
      >
        {bloc.turno?.nombre || 'Turno'}{' '}
        <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--label3)', marginLeft: 8 }}>
          {horario(bloc.turno)} · {diasDeTurno(bloc.turno)}
        </span>
      </div>
      {!bloc.fechasSesion?.length ? (
        <p style={{ padding: 16, fontSize: 13, color: 'var(--label3)' }}>Este turno no tiene sesiones en el período (según agenda).</p>
      ) : !bloc.alumnos?.length ? (
        <p style={{ padding: 16, fontSize: 13 }}>Sin alumnos asignados a este turno.</p>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 480 }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    zIndex: 2,
                    boxShadow: '1px 0 0 var(--separator)',
                  }}
                >
                  Alumno
                </th>
                {bloc.fechasSesion.map(({ fecha: fiso, clase: cl }) => (
                  <th key={fiso} title={cl ? '' : 'Sin clase registrada aún'} style={{ padding: '6px 4px', minWidth: 44 }}>
                    <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>{String(fiso).slice(8, 10)}</div>
                    <div style={{ fontSize: 9, color: 'var(--label3)', marginTop: 2 }}>{!cl ? '−' : '✓'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.alumnos.map((alumno, ix) => (
                <tr key={`${keyBase}-a-${alumno.id_alumno}`}>
                  <td
                    style={{
                      padding: '6px 10px',
                      position: 'sticky',
                      left: 0,
                      background: '#fff',
                      zIndex: 1,
                      boxShadow: '1px 0 0 var(--separator)',
                      maxWidth: 180,
                      borderBottom: '0.5px solid var(--separator)',
                    }}
                  >
                    <div className="ios-hstack" style={{ gap: 8 }}>
                      <span style={{ color: 'var(--label3)', fontSize: 11, width: 16 }}>{ix + 1}</span>
                      <span className="truncate-1" style={{ fontWeight: 600, fontSize: 13 }}>
                        {alumno.apellidos}, {alumno.nombres}
                      </span>
                    </div>
                  </td>
                  {bloc.fechasSesion.map(({ fecha: fiso }) => {
                    const estado = bloc.matrix.get(fiso)?.get(alumno.id_alumno) ?? ESTADOS.AUSENTE
                    return (
                      <td
                        key={fiso + '-' + alumno.id_alumno}
                        style={{
                          textAlign: 'center',
                          fontWeight: 800,
                          borderBottom: '0.5px solid var(--separator)',
                          padding: 4,
                          background: colorCeldaRango(estado),
                          color: estado === ESTADOS.AUSENTE ? '#4B5563' : '#111827',
                        }}
                        title={String(estado).replace(/_/g, ' ')}
                      >
                        {simboloEstado(estado)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilaAsistencia({ index, fila, saving, onEstado }) {
  const a = fila.alumno
  const grado = a.grado
  return (
    <div className="ios-data-row" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--label3)', width: 20, textAlign: 'right' }}>{index}</span>
        <div
          className="ios-avatar"
          style={
            grado?.color_cinturon ? { background: `linear-gradient(135deg, ${grado.color_cinturon}, rgba(0,0,0,0.5))` } : undefined
          }
        >
          {iniciales(a.nombres, a.apellidos)}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>
          {a.apellidos}, {a.nombres}
        </p>
        <p className="truncate-1" style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
          {a.codigo_alumno || '—'}
          {grado?.nombre ? ` · ${grado.nombre}` : ''}
        </p>
      </div>
      <div className="ios-segmented" style={{ opacity: saving ? 0.5 : 1 }}>
        {OPCIONES_ESTADO.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`ios-segmented-item ${o.id} ${fila.estado === o.id ? 'active' : ''}`}
            onClick={() => onEstado(o.id)}
            title={o.help}
            disabled={saving}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
