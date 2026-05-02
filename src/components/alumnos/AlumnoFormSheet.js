'use client'
import { useEffect, useState } from 'react'
import { crearAlumno, actualizarAlumno, actualizarApoderado } from '@/lib/services/alumno.service'

const TABS = [
  { id: 'alumno',    label: 'Alumno',    icon: 'person' },
  { id: 'academico', label: 'Académico', icon: 'school' },
  { id: 'apoderado', label: 'Apoderado', icon: 'family_restroom' },
  { id: 'medico',    label: 'Médico',    icon: 'medical_information' },
]

const SEXO = [{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Femenino' }]
const TIPO_SANGRE = ['O+','O-','A+','A-','B+','B-','AB+','AB-']
const RELACION = ['Padre','Madre','Abuelo/a','Tío/a','Hermano/a','Tutor legal','Otro']

export default function AlumnoFormSheet({
  alumnoExistente = null,
  planes = [], turnos = [], grados = [],
  onClose,
  onSaved,
}) {
  const editando = !!alumnoExistente
  const [tab, setTab] = useState('alumno')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState(() => ({
    // Alumno
    nombres: alumnoExistente?.nombres || '',
    apellidos: alumnoExistente?.apellidos || '',
    dni: alumnoExistente?.dni || '',
    fecha_nacimiento: alumnoExistente?.fecha_nacimiento || '',
    sexo: alumnoExistente?.sexo || 'M',
    telefono: alumnoExistente?.telefono || '',
    correo: alumnoExistente?.correo || '',
    direccion: alumnoExistente?.direccion || '',
    estado: alumnoExistente?.estado || 'prueba',
    fecha_ingreso: alumnoExistente?.fecha_ingreso || new Date().toISOString().slice(0, 10),
    // Académico
    id_plan: alumnoExistente?.id_plan || '',
    id_turno: alumnoExistente?.id_turno || '',
    id_grado_actual: alumnoExistente?.id_grado_actual || '',
    // Apoderado
    apo_nombres: alumnoExistente?.apoderado?.nombres || '',
    apo_apellidos: alumnoExistente?.apoderado?.apellidos || '',
    apo_dni: alumnoExistente?.apoderado?.dni || '',
    apo_telefono: alumnoExistente?.apoderado?.telefono || '',
    apo_correo: alumnoExistente?.apoderado?.correo || '',
    apo_relacion: alumnoExistente?.apoderado?.relacion || 'Padre',
    // Médico
    tipo_sangre: alumnoExistente?.tipo_sangre || '',
    alergias: alumnoExistente?.alergias || '',
    condicion_medica: alumnoExistente?.condicion_medica || '',
    seguro_medico: alumnoExistente?.seguro_medico || '',
    contacto_emergencia_nombre: alumnoExistente?.contacto_emergencia_nombre || '',
    contacto_emergencia_telefono: alumnoExistente?.contacto_emergencia_telefono || '',
    observaciones: alumnoExistente?.observaciones || '',
  }))

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (editando || !grados?.length) return
    setForm(p => {
      if (p.id_grado_actual !== '' && p.id_grado_actual != null) return p
      const id = grados[0]?.id_grado
      if (id == null) return p
      return { ...p, id_grado_actual: String(id) }
    })
  }, [editando, grados])

  async function handleSubmit(e) {
    e?.preventDefault()
    setError(null)
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setTab('alumno'); setError('Nombres y apellidos son obligatorios')
      return
    }
    setSaving(true)
    try {
      const alumno = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        dni: form.dni?.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        sexo: form.sexo || null,
        telefono: form.telefono?.trim() || null,
        correo: form.correo?.trim() || null,
        direccion: form.direccion?.trim() || null,
        estado: form.estado || 'prueba',
        fecha_ingreso: form.fecha_ingreso || null,
        id_plan: form.id_plan || null,
        id_turno: form.id_turno || null,
        id_grado_actual: form.id_grado_actual || null,
        tipo_sangre: form.tipo_sangre || null,
        alergias: form.alergias?.trim() || null,
        condicion_medica: form.condicion_medica?.trim() || null,
        seguro_medico: form.seguro_medico?.trim() || null,
        contacto_emergencia_nombre: form.contacto_emergencia_nombre?.trim() || null,
        contacto_emergencia_telefono: form.contacto_emergencia_telefono?.trim() || null,
        observaciones: form.observaciones?.trim() || null,
      }
      const apoderado = form.apo_nombres?.trim() ? {
        nombres: form.apo_nombres.trim(),
        apellidos: form.apo_apellidos?.trim() || '',
        dni: form.apo_dni?.trim() || null,
        telefono: form.apo_telefono?.trim() || null,
        correo: form.apo_correo?.trim() || null,
        relacion: form.apo_relacion || null,
      } : null

      if (editando) {
        await actualizarAlumno(alumnoExistente.id_alumno, alumno)
        if (apoderado && alumnoExistente.id_apoderado) {
          await actualizarApoderado(alumnoExistente.id_apoderado, apoderado)
        }
      } else {
        await crearAlumno({ alumno, apoderado })
      }
      onSaved?.()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ios-sheet-overlay anim-fade-in" onClick={onClose}
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        className="ios-sheet anim-fade-up"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
        <div className="ios-sheet-handle" />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 12px', borderBottom: '0.5px solid var(--separator)',
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
              {editando ? 'Editar alumno' : 'Nuevo alumno'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
              {editando ? form.nombres + ' ' + form.apellidos : 'Completa la ficha del alumno'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(60,60,67,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--label2)' }}>close</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`ios-chip ${tab === t.id ? 'active' : ''}`}>
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Error bar */}
        {error && (
          <div style={{
            margin: '12px 16px 0', padding: '10px 14px',
            background: 'rgba(229,57,53,0.08)', border: '0.5px solid rgba(229,57,53,0.3)',
            borderRadius: 10, fontSize: 13, color: 'var(--red-dark)',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 15, verticalAlign: 'text-bottom', marginRight: 4 }}>error</span>
            {error}
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '14px 16px 100px' }}>
            {tab === 'alumno' && (
              <Section titulo="Datos personales">
                <Row label="Nombres *"><input value={form.nombres} onChange={e => set('nombres', e.target.value)} required autoFocus /></Row>
                <Row label="Apellidos *"><input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} required /></Row>
                <Row label="DNI"><input value={form.dni} onChange={e => set('dni', e.target.value)} inputMode="numeric" maxLength={15} /></Row>
                <Row label="Fecha nac."><input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></Row>
                <Row label="Sexo">
                  <select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                    {SEXO.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </Row>
                <Row label="Teléfono"><input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Row>
                <Row label="Correo"><input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="—" /></Row>
                <Row label="Dirección"><input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="—" /></Row>
              </Section>
            )}

            {tab === 'academico' && (
              <>
                <Section titulo="Plan, turno y grado">
                  <Row label="Plan mensualidad">
                    <select value={form.id_plan} onChange={e => set('id_plan', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {planes.map(p => (
                        <option key={p.id_plan} value={p.id_plan}>{p.nombre} · S/ {Number(p.monto).toFixed(0)}</option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Turno">
                    <select value={form.id_turno} onChange={e => set('id_turno', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {turnos.map(t => (
                        <option key={t.id_turno} value={t.id_turno}>{t.nombre}</option>
                      ))}
                    </select>
                  </Row>
                  <Row label="Grado actual">
                    <select value={form.id_grado_actual} onChange={e => set('id_grado_actual', e.target.value)}>
                      <option value="">— Sin grado —</option>
                      {grados.map(g => (
                        <option key={g.id_grado} value={g.id_grado}>{g.nombre}</option>
                      ))}
                    </select>
                  </Row>
                </Section>

                <Section titulo="Estado en la academia">
                  <Row label="Estado">
                    <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                      <option value="prueba">En prueba</option>
                      <option value="activo">Activo</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="retirado">Retirado</option>
                    </select>
                  </Row>
                  <Row label="Fecha ingreso"><input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} /></Row>
                </Section>
              </>
            )}

            {tab === 'apoderado' && (
              <Section titulo="Datos del apoderado (opcional si es mayor de edad)">
                <Row label="Nombres"><input value={form.apo_nombres} onChange={e => set('apo_nombres', e.target.value)} /></Row>
                <Row label="Apellidos"><input value={form.apo_apellidos} onChange={e => set('apo_apellidos', e.target.value)} /></Row>
                <Row label="DNI"><input value={form.apo_dni} onChange={e => set('apo_dni', e.target.value)} inputMode="numeric" maxLength={15} /></Row>
                <Row label="Teléfono"><input type="tel" value={form.apo_telefono} onChange={e => set('apo_telefono', e.target.value)} /></Row>
                <Row label="Correo"><input type="email" value={form.apo_correo} onChange={e => set('apo_correo', e.target.value)} /></Row>
                <Row label="Relación">
                  <select value={form.apo_relacion} onChange={e => set('apo_relacion', e.target.value)}>
                    {RELACION.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Row>
              </Section>
            )}

            {tab === 'medico' && (
              <>
                <Section titulo="Información médica">
                  <Row label="Tipo sangre">
                    <select value={form.tipo_sangre} onChange={e => set('tipo_sangre', e.target.value)}>
                      <option value="">—</option>
                      {TIPO_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Row>
                  <Row label="Alergias"><input value={form.alergias} onChange={e => set('alergias', e.target.value)} placeholder="Ninguna" /></Row>
                  <Row label="Condición médica"><input value={form.condicion_medica} onChange={e => set('condicion_medica', e.target.value)} placeholder="—" /></Row>
                  <Row label="Seguro médico"><input value={form.seguro_medico} onChange={e => set('seguro_medico', e.target.value)} placeholder="SIS / EsSalud / Particular" /></Row>
                </Section>
                <Section titulo="Contacto de emergencia">
                  <Row label="Nombre"><input value={form.contacto_emergencia_nombre} onChange={e => set('contacto_emergencia_nombre', e.target.value)} /></Row>
                  <Row label="Teléfono"><input type="tel" value={form.contacto_emergencia_telefono} onChange={e => set('contacto_emergencia_telefono', e.target.value)} /></Row>
                </Section>
                <Section titulo="Observaciones">
                  <div style={{ padding: '10px 16px' }}>
                    <textarea
                      value={form.observaciones}
                      onChange={e => set('observaciones', e.target.value)}
                      rows={4}
                      placeholder="Notas adicionales sobre el alumno..."
                      style={{
                        width: '100%', minHeight: 84, padding: 12,
                        border: 'none', outline: 'none',
                        background: 'rgba(118,118,128,0.10)', borderRadius: 10,
                        fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
                      }}
                    />
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* Footer fijo */}
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0,
            background: 'rgba(242,242,247,0.95)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            padding: '12px 16px 20px',
            borderTop: '0.5px solid var(--separator)',
            display: 'flex', gap: 10,
          }}>
            <button type="button" onClick={onClose} className="ios-btn ios-btn-ghost" style={{ flex: 1, height: 46 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="ios-btn ios-btn-primary" style={{ flex: 2, height: 46 }}>
              {saving ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Registrar alumno')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="ios-form-section-title">{titulo}</p>
      <div className="ios-form-section" style={{ marginBottom: 0 }}>{children}</div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="ios-form-row">
      <span className="ios-form-row-label">{label}</span>
      {children}
    </div>
  )
}
