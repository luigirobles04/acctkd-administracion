'use client'
import { useState } from 'react'
import { crearMaestro, actualizarMaestro } from '@/lib/services/maestro.service'

const GRADOS_DAN = [
  { v: '',  l: '—' },
  { v: '1', l: '1er DAN' },
  { v: '2', l: '2do DAN' },
  { v: '3', l: '3er DAN' },
  { v: '4', l: '4to DAN' },
  { v: '5', l: '5to DAN' },
  { v: '6', l: '6to DAN' },
  { v: '7', l: '7mo DAN' },
  { v: '8', l: '8vo DAN' },
  { v: '9', l: '9no DAN' },
]

export default function MaestroFormSheet({
  maestroExistente = null,
  turnosDisponibles = [],
  onClose, onSaved,
}) {
  const editando = !!maestroExistente
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('personal')

  const [f, setF] = useState(() => ({
    nombres: maestroExistente?.nombres || '',
    apellidos: maestroExistente?.apellidos || '',
    dni: maestroExistente?.dni || '',
    telefono: maestroExistente?.telefono || '',
    correo: maestroExistente?.correo || '',
    direccion: maestroExistente?.direccion || '',
    fecha_nacimiento: maestroExistente?.fecha_nacimiento || '',
    fecha_ingreso: maestroExistente?.fecha_ingreso || new Date().toISOString().slice(0, 10),
    especialidad: maestroExistente?.especialidad || '',
    grado_cinturon: maestroExistente?.grado_cinturon || '',
    dan_nivel: maestroExistente?.dan_nivel || '',
    num_kukkiwon: maestroExistente?.num_kukkiwon || '',
    curso_coach_wt: maestroExistente?.curso_coach_wt || false,
    curso_coach_vencimiento: maestroExistente?.curso_coach_vencimiento || '',
    sueldo_mensual: maestroExistente?.sueldo_mensual || '',
  }))
  const [turnosSeleccionados, setTurnosSeleccionados] = useState(
    () => maestroExistente?.turnos?.map(t => t.turno?.id_turno).filter(Boolean) || [],
  )

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  function toggleTurno(id) {
    setTurnosSeleccionados(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    setError(null)
    if (!f.nombres.trim() || !f.apellidos.trim()) {
      setTab('personal'); setError('Nombres y apellidos obligatorios'); return
    }
    setSaving(true)
    try {
      const datos = {
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        dni: f.dni?.trim() || null,
        telefono: f.telefono?.trim() || null,
        correo: f.correo?.trim() || null,
        direccion: f.direccion?.trim() || null,
        fecha_nacimiento: f.fecha_nacimiento || null,
        fecha_ingreso: f.fecha_ingreso || null,
        especialidad: f.especialidad?.trim() || null,
        grado_cinturon: f.grado_cinturon?.trim() || null,
        dan_nivel: f.dan_nivel ? parseInt(f.dan_nivel, 10) : null,
        num_kukkiwon: f.num_kukkiwon?.trim() || null,
        curso_coach_wt: !!f.curso_coach_wt,
        curso_coach_vencimiento: f.curso_coach_vencimiento || null,
        sueldo_mensual: f.sueldo_mensual ? Number(f.sueldo_mensual) : 0,
        activo: true,
      }
      if (editando) {
        await actualizarMaestro(maestroExistente.id_maestro, datos, turnosSeleccionados)
      } else {
        await crearMaestro(datos, turnosSeleccionados)
      }
      onSaved?.()
    } catch (err) {
      console.error(err); setError(err.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="ios-sheet-overlay anim-fade-in" onClick={onClose}
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div className="ios-sheet anim-fade-up" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 640, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
        <div className="ios-sheet-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 12px', borderBottom: '0.5px solid var(--separator)' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
              {editando ? 'Editar maestro' : 'Nuevo maestro'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
              Ficha completa del instructor
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(60,60,67,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--label2)' }}>close</span>
          </button>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {[
            { id: 'personal',      l: 'Personal',      i: 'person' },
            { id: 'certificacion', l: 'Certificación', i: 'verified' },
            { id: 'turnos',        l: 'Turnos',        i: 'schedule' },
            { id: 'sueldo',        l: 'Sueldo',        i: 'payments' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`ios-chip ${tab === t.id ? 'active' : ''}`}>
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{t.i}</span>
              {t.l}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ margin: '12px 16px 0', padding: '10px 14px',
            background: 'rgba(229,57,53,0.08)', border: '0.5px solid rgba(229,57,53,0.3)',
            borderRadius: 10, fontSize: 13, color: 'var(--red-dark)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '14px 16px 100px' }}>
            {tab === 'personal' && (
              <Section titulo="Datos personales">
                <Row label="Nombres *"><input value={f.nombres} onChange={e => set('nombres', e.target.value)} required autoFocus /></Row>
                <Row label="Apellidos *"><input value={f.apellidos} onChange={e => set('apellidos', e.target.value)} required /></Row>
                <Row label="DNI"><input value={f.dni} onChange={e => set('dni', e.target.value)} inputMode="numeric" maxLength={15} /></Row>
                <Row label="Fecha nac."><input type="date" value={f.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></Row>
                <Row label="Teléfono"><input type="tel" value={f.telefono} onChange={e => set('telefono', e.target.value)} /></Row>
                <Row label="Correo"><input type="email" value={f.correo} onChange={e => set('correo', e.target.value)} /></Row>
                <Row label="Dirección"><input value={f.direccion} onChange={e => set('direccion', e.target.value)} /></Row>
                <Row label="Ingreso"><input type="date" value={f.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} /></Row>
              </Section>
            )}

            {tab === 'certificacion' && (
              <>
                <Section titulo="Grado y especialidad">
                  <Row label="Grado">
                    <select value={f.dan_nivel} onChange={e => set('dan_nivel', e.target.value)}>
                      {GRADOS_DAN.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
                    </select>
                  </Row>
                  <Row label="Especialidad">
                    <select value={f.especialidad} onChange={e => set('especialidad', e.target.value)}>
                      <option value="">—</option>
                      <option value="Kyorugi">Kyorugi</option>
                      <option value="Poomsae">Poomsae</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </Row>
                </Section>
                <Section titulo="Certificaciones oficiales">
                  <Row label="N° Kukkiwon"><input value={f.num_kukkiwon} onChange={e => set('num_kukkiwon', e.target.value)} placeholder="—" /></Row>
                  <div className="ios-form-row">
                    <span className="ios-form-row-label">Curso Coach WT</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={f.curso_coach_wt} onChange={e => set('curso_coach_wt', e.target.checked)} style={{ transform: 'scale(1.2)', accentColor: 'var(--red)' }} />
                      <span style={{ fontSize: 14 }}>{f.curso_coach_wt ? 'Vigente' : 'No registrado'}</span>
                    </label>
                  </div>
                  {f.curso_coach_wt && (
                    <Row label="Vencimiento">
                      <input type="date" value={f.curso_coach_vencimiento} onChange={e => set('curso_coach_vencimiento', e.target.value)} />
                    </Row>
                  )}
                </Section>
              </>
            )}

            {tab === 'turnos' && (
              <Section titulo="Turnos asignados">
                {turnosDisponibles.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--label3)', fontSize: 13, textAlign: 'center' }}>
                    No hay turnos configurados en la sede
                  </div>
                ) : (
                  turnosDisponibles.map(t => {
                    const sel = turnosSeleccionados.includes(t.id_turno)
                    return (
                      <button key={t.id_turno} type="button"
                        className="ios-form-row" onClick={() => toggleTurno(t.id_turno)}
                        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: `1.5px solid ${sel ? 'var(--red)' : 'var(--label4)'}`,
                          background: sel ? 'var(--red)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {sel && <span className="material-symbols-rounded" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{t.nombre}</span>
                      </button>
                    )
                  })
                )}
              </Section>
            )}

            {tab === 'sueldo' && (
              <Section titulo="Sueldo mensual fijo (S/)">
                <Row label="Monto">
                  <input type="number" step="0.01" inputMode="decimal"
                    value={f.sueldo_mensual} onChange={e => set('sueldo_mensual', e.target.value)}
                    placeholder="0.00" />
                </Row>
                <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--label3)', background: 'rgba(60,60,67,0.04)' }}>
                  El sueldo se paga a fin de mes. Genera la planilla desde la ficha del maestro.
                </div>
              </Section>
            )}
          </div>

          <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0,
            background: 'rgba(242,242,247,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
            padding: '12px 16px 20px', borderTop: '0.5px solid var(--separator)',
            display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="ios-btn ios-btn-ghost" style={{ flex: 1, height: 46 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="ios-btn ios-btn-primary" style={{ flex: 2, height: 46 }}>
              {saving ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Registrar maestro')}
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
  return (<div className="ios-form-row"><span className="ios-form-row-label">{label}</span>{children}</div>)
}
