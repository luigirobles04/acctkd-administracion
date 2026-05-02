'use client'
import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  listarTurnos,
  listarAsistenciaDeTurno,
  marcarAsistencia,
  marcarTodosPresentes,
  ESTADOS,
} from '@/lib/services/asistencia.service'
import { iniciales, formatFechaLarga, hoyISO, DIAS_SEMANA } from '@/lib/utils/format'

const OPCIONES_ESTADO = [
  { id: ESTADOS.PRESENTE,     label: 'P',  help: 'Presente' },
  { id: ESTADOS.AUSENTE,      label: 'A',  help: 'Ausente' },
  { id: ESTADOS.JUSTIFICADA,  label: 'J',  help: 'Justificada' },
  { id: ESTADOS.RECUPERACION, label: 'R',  help: 'Recuperación' },
]

function diasDeTurno(turno) {
  if (Array.isArray(turno?.dias_array) && turno.dias_array.length) {
    return turno.dias_array
      .map(n => DIAS_SEMANA.find(d => d.id === n)?.corto)
      .filter(Boolean)
      .join('·')
  }
  return turno?.dias_semana || ''
}

function horario(turno) {
  if (!turno?.hora_inicio) return ''
  return `${turno.hora_inicio.slice(0, 5)}–${turno.hora_fin?.slice(0, 5) || ''}`
}

export default function AsistenciaPage() {
  const [turnos, setTurnos] = useState([])
  const [idTurno, setIdTurno] = useState(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [clase, setClase] = useState(null)
  const [filas, setFilas] = useState([])
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
  }, [])

  useEffect(() => {
    if (!idTurno) return
    cargar()
  }, [idTurno, fecha])

  async function cargar() {
    setLoading(true)
    try {
      const { clase, filas } = await listarAsistenciaDeTurno({ idTurno, fecha })
      setClase(clase)
      setFilas(filas)
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

  async function cambiarEstado(idAlumno, estado) {
    if (!clase) return
    setSavingId(idAlumno)
    setFilas(prev => prev.map(f => f.alumno.id_alumno === idAlumno ? { ...f, estado } : f))
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
    if (!clase || !filas.length) return
    const ids = filas.map(f => f.alumno.id_alumno)
    try {
      await marcarTodosPresentes({ idClase: clase.id_clase, idsAlumnos: ids })
      setFilas(prev => prev.map(f => ({ ...f, estado: ESTADOS.PRESENTE })))
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

  const turnoActual = turnos.find(t => t.id_turno === idTurno)

  return (
    <AdminLayout title="Asistencia" subtitle={`${formatFechaLarga(fecha)} · activos y en prueba`}>
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

        {/* Selector turno + fecha */}
        <div className="ios-form-section" style={{ marginBottom: 16 }}>
          <div className="ios-form-row">
            <span className="ios-form-row-label">Turno</span>
            <select
              value={idTurno || ''}
              onChange={e => setIdTurno(Number(e.target.value))}
              style={{ flex: 1, textAlign: 'right', background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--label)', fontFamily: 'inherit', minWidth: 0 }}
            >
              {turnos.length === 0 && <option>— sin turnos —</option>}
              {turnos.map(t => (
                <option key={t.id_turno} value={t.id_turno}>
                  {t.nombre} · {horario(t)} · {diasDeTurno(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="ios-form-row">
            <span className="ios-form-row-label">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              style={{ textAlign: 'right' }}
            />
          </div>
        </div>

        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          <Stat label="Total"     valor={resumen.total} color="var(--label)" />
          <Stat label="Presentes" valor={resumen.p}     color="#059669" />
          <Stat label="Ausentes"  valor={resumen.a}     color="#6B7280" />
          <Stat label="Justif."   valor={resumen.j}     color="#F59E0B" />
          <Stat label="Recup."    valor={resumen.rec}   color="#3B82F6" />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--label3)', fontWeight: 600 }}>
            Asistencia real: <strong style={{ color: 'var(--label)' }}>{resumen.pct}%</strong>
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="ios-chip"
            onClick={marcarTodos}
            disabled={!filas.length || loading}
            style={{ background: '#059669', color: '#fff', fontWeight: 600 }}
          >
            Todos presentes
          </button>
        </div>

        {/* Lista */}
        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <div className="ios-empty">
              <div style={{ width: 28, height: 28, border: '2px solid var(--red)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
              Cargando…
            </div>
          ) : !turnoActual ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">event_busy</span>
              <p>No hay turnos registrados</p>
            </div>
          ) : filas.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">groups</span>
              <p>No hay alumnos asignados a este turno</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Edita alumnos desde la pestaña <strong>Académico</strong> y asígnales este turno.
              </p>
            </div>
          ) : (
            filas.map((f, i) => (
              <FilaAsistencia
                key={f.alumno.id_alumno}
                index={i + 1}
                fila={f}
                saving={savingId === f.alumno.id_alumno}
                onEstado={est => cambiarEstado(f.alumno.id_alumno, est)}
              />
            ))
          )}
        </div>

        {toast && !initError && <div className="ios-toast">{toast}</div>}
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  )
}

function Stat({ label, valor, color }) {
  return (
    <div className="ios-form-section" style={{ padding: '10px 8px', textAlign: 'center', margin: 0 }}>
      <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{valor}</p>
      <p style={{ fontSize: 10, color: 'var(--label3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{label}</p>
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
        <div className="ios-avatar" style={grado?.color_cinturon ? { background: `linear-gradient(135deg, ${grado.color_cinturon}, rgba(0,0,0,0.5))` } : undefined}>
          {iniciales(a.nombres, a.apellidos)}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>
          {a.apellidos}, {a.nombres}
        </p>
        <p className="truncate-1" style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
          {a.codigo_alumno || '—'}{grado?.nombre ? ` · ${grado.nombre}` : ''}
        </p>
      </div>
      <div className="ios-segmented" style={{ opacity: saving ? 0.5 : 1 }}>
        {OPCIONES_ESTADO.map(o => (
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
