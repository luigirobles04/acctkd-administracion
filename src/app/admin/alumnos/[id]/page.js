'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import AlumnoFormSheet from '@/components/alumnos/AlumnoFormSheet'
import {
  obtenerAlumno, listarPlanes, listarTurnos, listarGrados,
  cambiarEstadoAlumno, listarSesionesParaClasePrueba, actualizarClaseDePrueba,
} from '@/lib/services/alumno.service'
import { supabase } from '@/lib/supabase'
import { resumenAsistenciaAlumno, ESTADOS } from '@/lib/services/asistencia.service'
import {
  iniciales, edadDesde, formatFecha, formatMoney, formatTelefono, waLink,
  labelConceptoPago,
  etiquetaMetodoVisible,
  gradoHistorialLabel,
  gradoHistorialColor,
} from '@/lib/utils/format'

export default function AlumnoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [alumno, setAlumno] = useState(null)
  const [historial, setHistorial] = useState([])
  const [pagos, setPagos] = useState([])
  const [asistencia, setAsistencia] = useState(null)
  const [catalogos, setCatalogos] = useState({ planes: [], turnos: [], grados: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)
  const [extrasError, setExtrasError] = useState(null)
  const [sessPrueba, setSessPrueba] = useState([])
  const [busyClasePrueba, setBusyClasePrueba] = useState(false)

  async function cargar() {
    setLoading(true)
    setExtrasError(null)
    try {
      const [a, pl, tu, gr] = await Promise.all([
        obtenerAlumno(id), listarPlanes(), listarTurnos(), listarGrados(),
      ])
      setAlumno(a)
      setCatalogos({ planes: pl, turnos: tu, grados: gr })
      await Promise.all([cargarHistorial(), cargarPagos(), cargarAsistencia()])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function cargarHistorial() {
    if (!supabase) {
      setHistorial([])
      setExtrasError((prev) => prev || 'Supabase no está configurado.')
      return
    }
    const idNum = Number(id)
    const sel = '*, grado_marcial:id_grado(nombre, color_cinturon, nivel)'
    let { data, error } = await supabase
      .from('historial_grados')
      .select(sel)
      .eq('id_alumno', idNum)
      .order('fecha_examen', { ascending: false })
    if (error) {
      const r2 = await supabase
        .from('historial_grados')
        .select('*')
        .eq('id_alumno', idNum)
        .order('fecha_examen', { ascending: false })
      data = r2.data
      if (r2.error) {
        setHistorial([])
        setExtrasError((prev) => {
          const msg = r2.error.message || 'No se pudo cargar el historial de grados.'
          if (!prev) return msg
          return prev.includes(msg) ? prev : `${prev} · ${msg}`
        })
        return
      }
      console.warn('historial_grados (embed):', error.message)
    }
    setHistorial(data || [])
  }

  async function cargarPagos() {
    if (!supabase) {
      setPagos([])
      setExtrasError((prev) => prev || 'Supabase no está configurado.')
      return
    }
    const idNum = Number(id)
    const sel = '*, concepto_pago(nombre), metodo_cat:metodo_pago!id_metodo(nombre)'
    let { data, error } = await supabase
      .from('pago')
      .select(sel)
      .eq('id_alumno', idNum)
      .order('fecha_pago', { ascending: false })
      .limit(48)
    if (error) {
      const r2 = await supabase
        .from('pago')
        .select('*')
        .eq('id_alumno', idNum)
        .order('fecha_pago', { ascending: false })
        .limit(48)
      data = r2.data
      if (r2.error) {
        setPagos([])
        setExtrasError((prev) => {
          const msg = r2.error.message || 'No se pudieron cargar los pagos.'
          if (!prev) return msg
          return prev.includes(msg) ? prev : `${prev} · ${msg}`
        })
        return
      }
      console.warn('pago (embed):', error.message)
    }
    setPagos(data || [])
  }

  async function cargarAsistencia() {
    try {
      const res = await resumenAsistenciaAlumno({ idAlumno: Number(id), mesesAtras: 3 })
      setAsistencia(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { cargar() }, [id])

  useEffect(() => {
    let cancelled = false
    async function go() {
      if (tab !== 'estado' || alumno?.estado !== 'prueba' || !alumno?.id_turno) {
        if (!cancelled) setSessPrueba([])
        return
      }
      try {
        const rows = await listarSesionesParaClasePrueba(Number(id))
        if (!cancelled) setSessPrueba(rows)
      } catch (e) {
        console.warn(e)
      }
    }
    go()
    return () => { cancelled = true }
  }, [tab, id, alumno?.estado, alumno?.id_turno])

  async function handleElegirClasePrueba(idClaseSel) {
    const v = Number(idClaseSel)
    if (!v) return
    setBusyClasePrueba(true)
    try {
      await actualizarClaseDePrueba(Number(id), v)
      await cargar()
    } catch (e) {
      alert(e.message || 'No se pudo actualizar la clase de prueba.')
    } finally {
      setBusyClasePrueba(false)
    }
  }

  async function handleCambioEstado(nuevo) {
    if (!confirm(`¿Cambiar estado a "${nuevo}"?`)) return
    try {
      await cambiarEstadoAlumno(id, nuevo)
      await cargar()
    } catch (err) { alert('Error: ' + err.message) }
  }

  if (loading || !alumno) {
    return (
      <AdminLayout title="Cargando..."
        actions={<button onClick={() => router.back()} className="ios-btn ios-btn-ghost" style={{ height: 36, fontSize: 13 }}>Volver</button>}>
        <div className="ios-empty">
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2.5px solid var(--red)', borderTopColor: 'transparent',
            margin: '0 auto 10px', animation: 'spin 0.8s linear infinite',
          }} />
          Cargando ficha del alumno...
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    )
  }

  const edad = edadDesde(alumno.fecha_nacimiento)
  const pctAsist = asistencia != null && typeof asistencia.porcentaje === 'number'
    ? asistencia.porcentaje
    : 0

  const fichaSecciones = [
    { id: 'info',       l: 'Información',  i: 'info' },
    { id: 'apoderado',  l: 'Apoderado',    i: 'family_restroom' },
    { id: 'medico',     l: 'Médico',       i: 'medical_information' },
    { id: 'asistencia', l: `Asistencia (${pctAsist}%)`, i: 'fact_check' },
    { id: 'pagos',      l: `Pagos (${pagos.length})`, i: 'payments' },
    { id: 'grados',     l: `Grados (${historial.length})`, i: 'workspace_premium' },
    { id: 'estado',     l: 'Acciones',     i: 'tune' },
  ]

  return (
    <AdminLayout
      title={`${alumno.apellidos}, ${alumno.nombres}`}
      subtitle={alumno.codigo_alumno || 'Sin código asignado'}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/admin/alumnos')} className="ios-btn ios-btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 17 }}>arrow_back</span>
            <span className="hidden sm:inline">Volver</span>
          </button>
          <button onClick={() => setShowEdit(true)} className="ios-btn ios-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 17 }}>edit</span>
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>
      }>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {extrasError && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(229,57,53,0.1)',
              border: '1px solid rgba(229,57,53,0.35)',
              fontSize: 13,
              color: '#B71C1C',
            }}
          >
            <strong>Error al cargar datos.</strong> {extrasError}
          </div>
        )}
        {/* Header con avatar */}
        <div className="ios-card-flat" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="ios-avatar ios-avatar-lg">{iniciales(alumno.nombres, alumno.apellidos)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>
                {alumno.nombres} {alumno.apellidos}
              </h2>
              <div className="ios-hstack" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <EstadoBadge estado={alumno.estado} />
                {alumno.grado && (
                  <span className="ios-badge badge-blue">
                    <span className="material-symbols-rounded" style={{ fontSize: 13, marginRight: 3, verticalAlign: 'text-bottom' }}>workspace_premium</span>
                    {alumno.grado.nombre}
                  </span>
                )}
                {edad !== null && <span className="ios-caption">{edad} años</span>}
                {alumno.dni && <span className="ios-caption">DNI · {alumno.dni}</span>}
              </div>
              <div className="ios-hstack" style={{ gap: 14, marginTop: 10, color: 'var(--label3)', fontSize: 13, flexWrap: 'wrap' }}>
                {alumno.plan && (
                  <span><span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'text-bottom' }}>event</span> {alumno.plan.nombre}</span>
                )}
                {alumno.turno && (
                  <span><span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'text-bottom' }}>schedule</span> {alumno.turno.nombre}</span>
                )}
                {alumno.fecha_ingreso && (
                  <span><span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'text-bottom' }}>login</span> Ingreso: {formatFecha(alumno.fecha_ingreso)}</span>
                )}
              </div>
            </div>
            {/* Acciones rápidas */}
            <div className="ios-hstack" style={{ gap: 8, alignSelf: 'stretch' }}>
              {alumno.telefono && (
                <a href={waLink(alumno.telefono)} target="_blank" rel="noreferrer"
                  className="ios-btn ios-btn-ghost" style={{ height: 40, width: 40, padding: 0, borderRadius: 12 }}
                  title="WhatsApp">
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#25D366' }}>chat</span>
                </a>
              )}
              {alumno.telefono && (
                <a href={`tel:${alumno.telefono}`}
                  className="ios-btn ios-btn-ghost" style={{ height: 40, width: 40, padding: 0, borderRadius: 12 }}
                  title="Llamar">
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>call</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Navegación: móvil = chips; desktop = lista lateral fijada (sticky) */}
        <nav className="alumno-ficha-nav--mobile" style={{ marginBottom: 12 }} aria-label="Secciones de la ficha">
          {fichaSecciones.map(t => (
            <button
              key={t.id}
              type="button"
              className={`ios-chip ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{t.i}</span>
              {t.l}
            </button>
          ))}
        </nav>

        <div className="alumno-ficha-shell" style={{ marginTop: 4 }}>
          <div className="alumno-ficha-nav--desktop">
            <p className="ios-form-section-title" style={{ margin: '0 0 8px 4px', fontSize: 12 }}>
              Secciones
            </p>
            <nav className="alumno-ficha-nav-panel" aria-label="Secciones de la ficha">
              {fichaSecciones.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`alumno-ficha-nav-item ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="material-symbols-rounded alumno-ficha-nav-ico" aria-hidden="true">{t.i}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{t.l}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="alumno-ficha-content" style={{ minWidth: 0 }}>
        {tab === 'info' && (
          <Section titulo="Datos personales">
            <Row label="Nombres"    valor={alumno.nombres} />
            <Row label="Apellidos"  valor={alumno.apellidos} />
            <Row label="DNI"        valor={alumno.dni} />
            <Row label="Sexo"       valor={alumno.sexo === 'F' ? 'Femenino' : alumno.sexo === 'M' ? 'Masculino' : '—'} />
            <Row label="Nacimiento" valor={formatFecha(alumno.fecha_nacimiento)} />
            <Row label="Teléfono"   valor={formatTelefono(alumno.telefono)} />
            <Row label="Correo"     valor={alumno.correo} />
            <Row label="Dirección"  valor={alumno.direccion} />
            <Row label="Sede"       valor={alumno.sede?.nombre} />
          </Section>
        )}

        {tab === 'apoderado' && (
          <Section titulo="Apoderado / responsable">
            {alumno.apoderado ? (
              <>
                <Row label="Nombres"    valor={alumno.apoderado.nombres} />
                <Row label="Apellidos"  valor={alumno.apoderado.apellidos} />
                <Row label="DNI"        valor={alumno.apoderado.dni} />
                <Row label="Relación"   valor={alumno.apoderado.relacion} />
                <Row label="Teléfono"   valor={formatTelefono(alumno.apoderado.telefono)} />
                <Row label="Correo"     valor={alumno.apoderado.correo} />
              </>
            ) : <EmptyMsg texto="Sin apoderado registrado." />}
          </Section>
        )}

        {tab === 'medico' && (
          <>
            <Section titulo="Información médica">
              <Row label="Tipo sangre"    valor={alumno.tipo_sangre} />
              <Row label="Alergias"       valor={alumno.alergias} />
              <Row label="Condición"      valor={alumno.condicion_medica} />
              <Row label="Seguro"         valor={alumno.seguro_medico} />
            </Section>
            <Section titulo="Contacto de emergencia">
              <Row label="Nombre"   valor={alumno.contacto_emergencia_nombre} />
              <Row label="Teléfono" valor={formatTelefono(alumno.contacto_emergencia_telefono)} />
            </Section>
            {alumno.observaciones && (
              <Section titulo="Observaciones">
                <div style={{ padding: 16, fontSize: 14, lineHeight: 1.55 }}>{alumno.observaciones}</div>
              </Section>
            )}
          </>
        )}

        {tab === 'asistencia' && (
          <>
            {!asistencia ? (
              <Section titulo="Asistencia (últimos 3 meses)">
                <EmptyMsg texto="Sin datos de asistencia todavía." />
              </Section>
            ) : (
              <>
                <Section titulo="Asistencia (últimos 3 meses)">
                  <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(118,118,128,0.18)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="16" fill="none"
                          stroke={asistencia.porcentaje >= 70 ? '#059669' : '#F59E0B'}
                          strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={`${asistencia.porcentaje} 100`}
                          pathLength="100" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800 }}>
                        {asistencia.porcentaje}%
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'var(--label2)', marginBottom: 4 }}>
                        {asistencia.conAsistencia ?? asistencia.presentes + (asistencia.recuperaciones || 0)} de{' '}
                        {asistencia.presentes + asistencia.ausentes + asistencia.justificadas + (asistencia.recuperaciones || 0)} clases con asistencia efectiva
                        (presente o recuperación).
                      </p>
                      <p style={{ fontSize: 12, color: asistencia.porcentaje >= 70 ? '#059669' : '#F59E0B', fontWeight: 600 }}>
                        {asistencia.porcentaje >= 70
                          ? 'Cumple el 70 % requerido para examen.'
                          : 'Por debajo del 70 % requerido para examen.'}
                      </p>
                    </div>
                  </div>
                  <div className="ios-form-row">
                    <span className="ios-form-row-label">Presentes</span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{asistencia.presentes}</span>
                  </div>
                  <div className="ios-form-row">
                    <span className="ios-form-row-label">Ausentes</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{asistencia.ausentes}</span>
                  </div>
                  <div className="ios-form-row">
                    <span className="ios-form-row-label">Justificadas</span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#F59E0B' }}>{asistencia.justificadas}</span>
                  </div>
                  <div className="ios-form-row">
                    <span className="ios-form-row-label">Recuperaciones</span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#3B82F6' }}>{asistencia.recuperaciones}</span>
                  </div>
                </Section>
                <Section titulo="Historial reciente">
                  {asistencia.historial.length === 0 ? (
                    <EmptyMsg texto="Sin clases registradas en este período." />
                  ) : (
                    asistencia.historial
                      .slice()
                      .sort((a, b) => (b.clase?.fecha || '').localeCompare(a.clase?.fecha || ''))
                      .slice(0, 20)
                      .map((h, i) => {
                        const obs = (h.observacion || '').toLowerCase()
                        const marcaPruebaObs = obs.includes('clase de prueba')
                        const estado = obs.includes('recuper') ? ESTADOS.RECUPERACION
                                      : h.presente ? ESTADOS.PRESENTE
                                      : h.justificado ? ESTADOS.JUSTIFICADA
                                      : ESTADOS.AUSENTE
                        const map = {
                          [ESTADOS.PRESENTE]:     { l: 'Presente',     c: '#059669' },
                          [ESTADOS.AUSENTE]:      { l: 'Ausente',      c: '#6B7280' },
                          [ESTADOS.JUSTIFICADA]:  { l: 'Justificada',  c: '#F59E0B' },
                          [ESTADOS.RECUPERACION]: { l: 'Recuperación', c: '#3B82F6' },
                        }
                        return (
                          <div key={i} className="ios-form-row">
                            <span className="ios-form-row-label">{formatFecha(h.clase?.fecha)}</span>
                            <span style={{ flex: 1, textAlign: 'right', fontSize: 13, color: 'var(--label3)' }}>
                              {h.clase?.turno?.nombre || alumno.turno?.nombre || '—'}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: map[estado].c, marginLeft: 10 }}>
                              {map[estado].l}{marcaPruebaObs ? ' · clase prueba' : ''}
                            </span>
                          </div>
                        )
                      })
                  )}
                </Section>
              </>
            )}
          </>
        )}

        {tab === 'pagos' && (
          <Section titulo="Pagos y mensualidades">
            {pagos.length === 0 ? <EmptyMsg texto="Sin pagos registrados aún." /> : pagos.map(p => (
              <div key={p.id_pago} className="ios-form-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, minHeight: 72, paddingTop: 10, paddingBottom: 10 }}>
                <div className="ios-hstack" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>
                      {labelConceptoPago(p)}
                    </span>
                    {p.mes_correspondiente && (
                      <span style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2, display: 'block' }}>
                        Periodo: {formatFecha(typeof p.mes_correspondiente === 'string' ? p.mes_correspondiente.slice(0, 10) : p.mes_correspondiente)}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>{formatMoney(p.monto_final || p.monto)}</span>
                    <EstadoPagoBadge estado={p.estado} />
                  </div>
                </div>
                <div className="ios-hstack" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--label3)', flexWrap: 'wrap', gap: 6 }}>
                  <span>
                    {(() => {
                      const met = p.estado === 'pagado' ? etiquetaMetodoVisible(p) : '—'
                      const parts = []
                      if (p.estado === 'pagado' && met !== '—') parts.push(met)
                      parts.push(formatFecha(p.fecha_pago))
                      if (
                        p.fecha_vencimiento &&
                        (p.estado === 'pendiente' || p.estado === 'vencido')
                      ) {
                        parts.push(`Vence ${formatFecha(p.fecha_vencimiento)}`)
                      }
                      return parts.join(' · ')
                    })()}
                  </span>
                </div>
                {p.observaciones && (
                  <p style={{ fontSize: 11, color: 'var(--label3)', margin: 0, lineHeight: 1.4 }}>{p.observaciones}</p>
                )}
              </div>
            ))}
          </Section>
        )}

        {tab === 'grados' && (
          <Section titulo="Historial de grados">
            {historial.length === 0 ? <EmptyMsg texto="Sin exámenes de grado registrados." /> : historial.map((h, idx) => (
              <div key={h.id ?? h.id_historial ?? `${h.id_alumno}-${h.fecha_examen}-${h.id_grado}-${idx}`} className="ios-form-row" style={{ minHeight: 56 }}>
                <div style={{
                  width: 10, height: 28, borderRadius: 3,
                  background: gradoHistorialColor(h), flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{gradoHistorialLabel(h)}</p>
                  <p style={{ fontSize: 12, color: 'var(--label3)' }}>
                    {formatFecha(h.fecha_examen)} {h.codigo_examen ? ` · ${h.codigo_examen}` : ''}
                  </p>
                </div>
                <span className={`ios-badge ${h.aprobado ? 'badge-green' : 'badge-red'}`}>
                  {h.aprobado ? 'Aprobado' : 'No aprobado'}
                </span>
              </div>
            ))}
          </Section>
        )}

        {tab === 'estado' && (
          <>
            {alumno.estado === 'prueba' && (
              <Section titulo="Clase de prueba (una sola)">
                {!alumno.id_turno ? (
                  <EmptyMsg texto="Edita la ficha y asigna un turno para listar sesiones." />
                ) : (
                  <>
                    <Row
                      label="Sesión marcada"
                      valor={alumno.clase_prueba?.fecha
                        ? `${formatFecha(alumno.clase_prueba.fecha)} · ${alumno.turno?.nombre || ''}`.trim()
                        : ''}
                    />
                    <Row
                      label="Cambiar a…"
                      valor={(
                        <select
                          key={`spr-${sessPrueba.length}-${alumno.id_clase_prueba ?? 'x'}`}
                          style={{ width: '100%', maxWidth: 320, marginLeft: 'auto', fontSize: 14 }}
                          disabled={busyClasePrueba}
                          defaultValue=""
                          aria-label="Elegir otra clase de prueba"
                          onChange={(e) => {
                            const v = e.target.value
                            if (!v) return
                            if (!confirm('¿Registrar esta fecha como la única clase de prueba del alumno?'))
                              return
                            handleElegirClasePrueba(Number(v))
                          }}>
                          <option value="">— Elegir otra fecha —</option>
                          {sessPrueba.map((s) => (
                            <option key={s.id_clase} value={String(s.id_clase)}>
                              {formatFecha(s.fecha)}{alumno.id_clase_prueba === s.id_clase ? ' · actual' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </>
                )}
              </Section>
            )}
            <Section titulo="Cambiar estado">
              {['activo','prueba','suspendido','retirado'].map(est => (
                <button key={est} className="ios-form-row" style={{
                  width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                  cursor: alumno.estado === est ? 'default' : 'pointer',
                  opacity: alumno.estado === est ? 0.5 : 1,
                }}
                  disabled={alumno.estado === est}
                  onClick={() => handleCambioEstado(est)}>
                  <span className="ios-form-row-label" style={{ flex: 1 }}>
                    {est === 'activo'     && 'Marcar como activo'}
                    {est === 'prueba'     && 'Marcar como en prueba'}
                    {est === 'suspendido' && 'Suspender alumno'}
                    {est === 'retirado'   && 'Retirar alumno'}
                  </span>
                  {alumno.estado === est
                    ? <span className="ios-caption">Actual</span>
                    : <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--label4)' }}>chevron_right</span>}
                </button>
              ))}
            </Section>
          </>
        )}
          </div>
        </div>
      </div>

      {showEdit && (
        <AlumnoFormSheet
          alumnoExistente={alumno}
          planes={catalogos.planes}
          turnos={catalogos.turnos}
          grados={catalogos.grados}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); cargar() }}
        />
      )}
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  )
}

function Section({ titulo, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p className="ios-form-section-title">{titulo}</p>
      <div className="ios-form-section" style={{ marginBottom: 0 }}>{children}</div>
    </div>
  )
}

function Row({ label, valor }) {
  return (
    <div className="ios-form-row">
      <span className="ios-form-row-label">{label}</span>
      <span style={{ flex: 1, textAlign: 'right', color: valor ? 'var(--label)' : 'var(--label3)', fontSize: 15 }}>
        {valor || '—'}
      </span>
    </div>
  )
}

function EmptyMsg({ texto }) {
  return <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>{texto}</div>
}

function EstadoBadge({ estado }) {
  const map = {
    activo:     { cls: 'badge-green',  txt: 'Activo' },
    prueba:     { cls: 'badge-yellow', txt: 'En prueba' },
    suspendido: { cls: 'badge-red',    txt: 'Suspendido' },
    retirado:   { cls: 'badge-gray',   txt: 'Retirado' },
  }
  const b = map[estado] || { cls: 'badge-gray', txt: estado || '—' }
  return <span className={`ios-badge ${b.cls}`}>{b.txt}</span>
}

function EstadoPagoBadge({ estado }) {
  const e = (estado || '').toLowerCase()
  const map = {
    pagado:     { cls: 'badge-green',  txt: 'Pagado' },
    pendiente:  { cls: 'badge-yellow', txt: 'Pendiente' },
    vencido:    { cls: 'badge-red',    txt: 'Vencido' },
    anulado:    { cls: 'badge-gray',   txt: 'Anulado' },
  }
  const b = map[e] || { cls: 'badge-gray', txt: estado || '—' }
  return <span className={`ios-badge ${b.cls}`} style={{ marginTop: 4, display: 'inline-block' }}>{b.txt}</span>
}
