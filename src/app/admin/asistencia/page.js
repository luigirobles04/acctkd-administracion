'use client'
import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  listarTurnos,
  listarAsistenciaDeTurno,
  listarAsistenciaRangoTurno,
  marcarAsistencia,
  marcarTodosPresentes,
  ESTADOS,
  turnoTieneSesionEsteDia,
  inicioSemanaLunesISO,
  finSemanaDomingoISO,
  rangoMesContainingISO,
} from '@/lib/services/asistencia.service'
import { iniciales, formatFechaLarga, hoyISO, DIAS_SEMANA } from '@/lib/utils/format'

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
]

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

export default function AsistenciaPage() {
  const [turnos, setTurnos] = useState([])
  const [idTurno, setIdTurno] = useState(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [modoVista, setModoVista] = useState('dia')

  const [clase, setClase] = useState(null)
  const [filas, setFilas] = useState([])

  const [matrizPayload, setMatrizPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [toast, setToast] = useState('')
  const [initError, setInitError] = useState('')

  useEffect(() => {
    ;(async () => {
      setInitError('')
      try {
        const ts = await listarTurnos()
        setTurnos(ts)
        if (ts.length && !idTurno) setIdTurno(ts[0].id_turno)
      } catch (e) {
        console.error(e)
        const msg =
          typeof e.message === 'string' && /Supabase/i.test(e.message)
            ? e.message
            : 'No se pudieron cargar los turnos. Revisa tu conexión y variables Supabase.'
        setInitError(msg)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- arranque
  }, [])

  useEffect(() => {
    if (!idTurno) return
    cargar()
  }, [idTurno, fecha, modoVista, turnos])

  async function cargar() {
    setLoading(true)
    const turno = turnos.find((t) => t.id_turno === idTurno)
    try {
      if (modoVista === 'dia') {
        setMatrizPayload(null)
        if (!turnoTieneSesionEsteDia(fecha, turno?.dias_array)) {
          setClase(null)
          setFilas([])
          setLoading(false)
          return
        }
        const { clase: c, filas: fs } = await listarAsistenciaDeTurno({ idTurno, fecha })
        setClase(c)
        setFilas(fs)
      } else if (modoVista === 'semana') {
        setClase(null)
        setFilas([])
        const lunes = inicioSemanaLunesISO(fecha)
        const domingo = finSemanaDomingoISO(lunes)
        const m = await listarAsistenciaRangoTurno({ idTurno, fechaDesde: lunes, fechaHasta: domingo })
        setMatrizPayload(m)
      } else {
        setClase(null)
        setFilas([])
        const { desde, hasta } = rangoMesContainingISO(fecha)
        const m = await listarAsistenciaRangoTurno({ idTurno, fechaDesde: desde, fechaHasta: hasta })
        setMatrizPayload(m)
      }
    } catch (e) {
      console.error(e)
      setToast('Error al cargar: ' + e.message)
      setFilas([])
      setClase(null)
      setMatrizPayload(null)
    } finally {
      setLoading(false)
    }
  }

  function mostrarToast(msg) {
    setToast(msg)
    setInitError('')
    setTimeout(() => setToast(''), 1600)
  }

  async function cambiarEstado(idAlumno, estado) {
    if (!clase || modoVista !== 'dia') return
    setSavingId(idAlumno)
    setFilas((prev) => prev.map((f) => (f.alumno.id_alumno === idAlumno ? { ...f, estado } : f)))
    try {
      await marcarAsistencia({ idClase: clase.id_clase, idAlumno, estado })
      mostrarToast('Guardado')
    } catch (e) {
      console.error(e)
      mostrarToast('Error al guardar')
      cargar()
    } finally {
      setSavingId(null)
    }
  }

  async function marcarTodos() {
    if (!clase || !filas.length || modoVista !== 'dia') return
    const ids = filas.map((f) => f.alumno.id_alumno)
    try {
      await marcarTodosPresentes({ idClase: clase.id_clase, idsAlumnos: ids })
      setFilas((prev) => prev.map((f) => ({ ...f, estado: ESTADOS.PRESENTE })))
      mostrarToast(`${ids.length} marcados presentes`)
    } catch (e) {
      mostrarToast('Error: ' + e.message)
    }
  }

  const resumen = useMemo(() => {
    const r = { total: filas.length, p: 0, a: 0, j: 0, rec: 0 }
    for (const f of filas) {
      if (f.estado === ESTADOS.PRESENTE) r.p++
      else if (f.estado === ESTADOS.JUSTIFICADA) r.j++
      else if (f.estado === ESTADOS.RECUPERACION) r.rec++
      else r.a++
    }
    const base = r.p + r.a + r.j
    r.pct = base > 0 ? Math.round((r.p / base) * 100) : 0
    return r
  }, [filas])

  const turnoActual = turnos.find((t) => t.id_turno === idTurno)
  const diaValidoParaTurno = turnoTieneSesionEsteDia(fecha, turnoActual?.dias_array)

  const tituloPeriodoMatriz = useMemo(() => {
    if (!matrizPayload) return ''
    const { fechaDesde, fechaHasta } = matrizPayload
    const d0 = fechaDesde === fechaHasta ? formatFechaLarga(fechaDesde) : `${fechaDesde} → ${fechaHasta}`
    return d0.charAt(0).toUpperCase() + d0.slice(1)
  }, [matrizPayload])

  const resumenMatriz = useMemo(() => {
    if (!matrizPayload?.matrix || !matrizPayload?.alumnos?.length || !matrizPayload?.fechasSesion?.length) {
      return null
    }
    let cel = 0
    let fal = 0
    let pr = 0
    let ju = 0
    let re = 0
    const { matrix, fechasSesion, alumnos } = matrizPayload
    for (const { fecha: fiso } of fechasSesion) {
      const col = matrix.get(fiso)
      if (!col) continue
      for (const alum of alumnos) {
        const e = col.get(alum.id_alumno) ?? ESTADOS.AUSENTE
        cel++
        if (e === ESTADOS.AUSENTE) fal++
        else if (e === ESTADOS.PRESENTE) pr++
        else if (e === ESTADOS.JUSTIFICADA) ju++
        else if (e === ESTADOS.RECUPERACION) re++
      }
    }
    const base = fal + pr + ju
    const pct = base > 0 ? Math.round(((pr + re) / base) * 100) : 0
    return { celulas: cel, ausentes: fal, presentes: pr, justif: ju, recuper: re, pct }
  }, [matrizPayload])

  return (
    <AdminLayout
      title="Asistencia"
      subtitle={
        modoVista === 'dia'
          ? `${formatFechaLarga(fecha)} · activos y en prueba`
          : tituloPeriodoMatriz || 'Activos y en prueba'
      }
    >
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

        <div className="ios-form-section" style={{ marginBottom: 16 }}>
          <div className="ios-form-row">
            <span className="ios-form-row-label">Turno</span>
            <select
              value={idTurno || ''}
              onChange={(e) => setIdTurno(Number(e.target.value))}
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
              {turnos.length === 0 && <option>— sin turnos —</option>}
              {turnos.map((t) => (
                <option key={t.id_turno} value={t.id_turno}>
                  {t.nombre} · {horario(t)} · {diasDeTurno(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="ios-form-row">
            <span className="ios-form-row-label">Vista</span>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              {MODOS_VISTA.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ios-chip ${modoVista === m.id ? 'active' : ''}`}
                  onClick={() => setModoVista(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ios-form-row">
            <span className="ios-form-row-label">{modoVista === 'dia' ? 'Fecha del día' : 'Referencia calendario'}</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ textAlign: 'right' }} />
          </div>

          {(modoVista === 'semana' || modoVista === 'mes') && (
            <p style={{ fontSize: 12, color: 'var(--label3)', margin: '10px 0 4px', lineHeight: 1.45, paddingLeft: 2 }}>
              {modoVista === 'semana'
                ? 'Semana de lunes a domingo que contiene la fecha elegida.'
                : 'Todo el mes calendario de la fecha elegida.'}{' '}
              Incluye faltas (A) donde no hay asistencia o está ausente. Sin columna cuando no tocaba ese día para el turno.
            </p>
          )}
        </div>

        {modoVista === 'dia' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              <Stat label="Total" valor={diaValidoParaTurno ? resumen.total : '—'} color="var(--label)" />
              <Stat label="Presentes" valor={diaValidoParaTurno ? resumen.p : '—'} color="#059669" />
              <Stat label="Ausentes" valor={diaValidoParaTurno ? resumen.a : '—'} color="#6B7280" />
              <Stat label="Justif." valor={diaValidoParaTurno ? resumen.j : '—'} color="#F59E0B" />
              <Stat label="Recup." valor={diaValidoParaTurno ? resumen.rec : '—'} color="#3B82F6" />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--label3)', fontWeight: 600 }}>
                Asistencia real:{' '}
                <strong style={{ color: 'var(--label)' }}>{diaValidoParaTurno ? `${resumen.pct}%` : '—'}</strong>
              </span>
              <div style={{ flex: 1 }} />
              <button
                className="ios-chip"
                onClick={marcarTodos}
                disabled={!filas.length || loading || !diaValidoParaTurno}
                style={{ background: '#059669', color: '#fff', fontWeight: 600 }}
              >
                Todos presentes
              </button>
            </div>
          </>
        )}

        {(modoVista === 'semana' || modoVista === 'mes') && resumenMatriz && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8 }}>
              <Stat label="Celdas" valor={resumenMatriz.celulas} color="var(--label)" />
              <Stat label="Ausentes · A" valor={resumenMatriz.ausentes} color="#6B7280" />
              <Stat label="Presentes · P" valor={resumenMatriz.presentes} color="#059669" />
              <Stat label="Justif. · J" valor={resumenMatriz.justif} color="#F59E0B" />
              <Stat label="Recup. · R" valor={resumenMatriz.recuper} color="#3B82F6" />
              <Stat label="Cubre sesión %" valor={`${resumenMatriz.pct}%`} color="#1F3864" />
            </div>
          </div>
        )}

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
          ) : !turnoActual ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">event_busy</span>
              <p>No hay turnos registrados</p>
            </div>
          ) : modoVista === 'dia' && !diaValidoParaTurno ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">calendar_month</span>
              <p style={{ fontWeight: 600 }}>Este día no corresponde a una sesión de este turno</p>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--label2)', lineHeight: 1.45 }}>
                Elige otra fecha o cambia el turno. Sesiones esperadas este periodo: {diasDeTurno(turnoActual) || '—'}.
              </p>
            </div>
          ) : modoVista === 'dia' && filas.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">groups</span>
              <p>No hay alumnos asignados a este turno</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Edita alumnos desde la pestaña <strong>Académico</strong> y asígnales este turno.
              </p>
            </div>
          ) : modoVista === 'dia' ? (
            filas.map((f, i) => (
              <FilaAsistencia
                key={f.alumno.id_alumno}
                index={i + 1}
                fila={f}
                saving={savingId === f.alumno.id_alumno}
                onEstado={(est) => cambiarEstado(f.alumno.id_alumno, est)}
              />
            ))
          ) : matrizPayload && matrizPayload.fechasSesion.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">event_busy</span>
              <p>No hay sesiones de este turno en el período seleccionado</p>
              <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 4 }}>
                Solo se listan los días de la agenda del turno.
              </p>
            </div>
          ) : matrizPayload && matrizPayload.alumnos.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">groups</span>
              <p>No hay alumnos asignados a este turno</p>
            </div>
          ) : matrizPayload ? (
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
                    {matrizPayload.fechasSesion.map(({ fecha: fiso, clase: cl }) => (
                      <th key={fiso} title={cl ? '' : 'Sin clase registrada aún'} style={{ padding: '6px 4px', minWidth: 44 }}>
                        <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>{String(fiso).slice(8, 10)}</div>
                        <div style={{ fontSize: 9, color: 'var(--label3)', marginTop: 2 }}>
                          {!cl ? '−' : '✓'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrizPayload.alumnos.map((alumno, ix) => (
                    <tr key={alumno.id_alumno}>
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
                      {matrizPayload.fechasSesion.map(({ fecha: fiso }) => {
                        const estado = matrizPayload.matrix.get(fiso)?.get(alumno.id_alumno) ?? ESTADOS.AUSENTE
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
                            title={estado.replace(/_/g, ' ')}
                          >
                            {simboloEstado(estado)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '12px 8px', fontSize: 11, color: 'var(--label3)' }}>
                <span>
                  <strong>P</strong> presente · <strong>J</strong> justificada · <strong>R</strong> recuperación · <strong>A</strong>{' '}
                  ausencia o sin marcar · columna día/mes corto (<strong>✓</strong> clase existe)
                </span>
              </div>
            </div>
          ) : null}
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
  return (
    <div className="ios-form-section" style={{ padding: '10px 8px', textAlign: 'center', margin: 0 }}>
      <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{valor}</p>
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
