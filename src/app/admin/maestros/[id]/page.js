'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import MaestroFormSheet from '@/components/maestros/MaestroFormSheet'
import {
  obtenerMaestro, desactivarMaestro, listarPlanillas, generarPlanilla,
} from '@/lib/services/maestro.service'
import { listarTurnos } from '@/lib/services/alumno.service'
import {
  iniciales, formatFecha, formatMoney, formatTelefono, waLink,
} from '@/lib/utils/format'

export default function MaestroDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [maestro, setMaestro] = useState(null)
  const [planillas, setPlanillas] = useState([])
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [showEdit, setShowEdit] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [m, p, t] = await Promise.all([
        obtenerMaestro(id),
        listarPlanillas(id, new Date().getFullYear()),
        listarTurnos(),
      ])
      setMaestro(m); setPlanillas(p); setTurnos(t)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [id])

  async function handleDesactivar() {
    if (!confirm('¿Desactivar al maestro? Ya no aparecerá en la lista.')) return
    await desactivarMaestro(id)
    router.push('/admin/maestros')
  }

  async function handleGenerarPlanilla() {
    const mesStr = prompt('Ingresa el periodo (AAAA-MM). Ej: 2026-04', new Date().toISOString().slice(0, 7))
    if (!mesStr) return
    const periodo = `${mesStr}-01`
    try {
      await generarPlanilla({
        id_maestro: id,
        periodo,
        sueldo_base: Number(maestro.sueldo_mensual || 0),
      })
      await cargar()
      alert('Planilla generada para ' + mesStr)
    } catch (err) { alert('Error: ' + err.message) }
  }

  if (loading || !maestro) {
    return (
      <AdminLayout title="Cargando..."
        actions={<button onClick={() => router.back()} className="ios-btn ios-btn-ghost" style={{ height: 36, fontSize: 13 }}>Volver</button>}>
        <div className="ios-empty">
          <div style={{ width: 28, height: 28, borderRadius: '50%',
            border: '2.5px solid var(--red)', borderTopColor: 'transparent',
            margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          Cargando maestro...
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={`${maestro.apellidos}, ${maestro.nombres}`}
      subtitle={maestro.dan_nivel ? `${maestro.dan_nivel}° DAN` : 'Maestro'}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/admin/maestros')} className="ios-btn ios-btn-ghost" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 17 }}>arrow_back</span>
          </button>
          <button onClick={() => setShowEdit(true)} className="ios-btn ios-btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 17 }}>edit</span>
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>
      }>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* Header */}
        <div className="ios-card-flat" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="ios-avatar ios-avatar-lg" style={{ background: 'linear-gradient(135deg, #1C1C1E, #3C3C43)' }}>
              {iniciales(maestro.nombres, maestro.apellidos)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                {maestro.nombres} {maestro.apellidos}
              </h2>
              <div className="ios-hstack" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {maestro.dan_nivel && <span className="ios-badge badge-blue">{maestro.dan_nivel}° DAN</span>}
                {maestro.especialidad && <span className="ios-badge badge-gray">{maestro.especialidad}</span>}
                {maestro.curso_coach_wt && <span className="ios-badge badge-green">Coach WT</span>}
                {maestro.num_kukkiwon && <span className="ios-caption">Kukkiwon #{maestro.num_kukkiwon}</span>}
              </div>
            </div>
            <div className="ios-hstack" style={{ gap: 8 }}>
              {maestro.telefono && (
                <a href={waLink(maestro.telefono)} target="_blank" rel="noreferrer"
                  className="ios-btn ios-btn-ghost" style={{ height: 40, width: 40, padding: 0, borderRadius: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#25D366' }}>chat</span>
                </a>
              )}
              {maestro.telefono && (
                <a href={`tel:${maestro.telefono}`} className="ios-btn ios-btn-ghost"
                  style={{ height: 40, width: 40, padding: 0, borderRadius: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>call</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {[
            { id: 'info',      l: 'Información',  i: 'info' },
            { id: 'cert',      l: 'Certificación', i: 'verified' },
            { id: 'turnos',    l: `Turnos (${maestro.turnos?.length || 0})`, i: 'schedule' },
            { id: 'planilla',  l: 'Planilla',     i: 'receipt_long' },
            { id: 'acciones',  l: 'Acciones',     i: 'tune' },
          ].map(t => (
            <button key={t.id} className={`ios-chip ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{t.i}</span>
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <Section titulo="Datos personales">
            <Row label="DNI"        valor={maestro.dni} />
            <Row label="Nacimiento" valor={formatFecha(maestro.fecha_nacimiento)} />
            <Row label="Ingreso"    valor={formatFecha(maestro.fecha_ingreso)} />
            <Row label="Teléfono"   valor={formatTelefono(maestro.telefono)} />
            <Row label="Correo"     valor={maestro.correo} />
            <Row label="Dirección"  valor={maestro.direccion} />
            <Row label="Sueldo"     valor={maestro.sueldo_mensual ? formatMoney(maestro.sueldo_mensual) + '/mes' : '—'} />
          </Section>
        )}

        {tab === 'cert' && (
          <>
            <Section titulo="Grado marcial">
              <Row label="DAN"          valor={maestro.dan_nivel ? `${maestro.dan_nivel}° DAN` : null} />
              <Row label="Grado"        valor={maestro.grado_cinturon} />
              <Row label="Especialidad" valor={maestro.especialidad} />
            </Section>
            <Section titulo="Certificaciones oficiales">
              <Row label="Kukkiwon" valor={maestro.num_kukkiwon} />
              <Row label="Coach WT" valor={maestro.curso_coach_wt ? 'Vigente' : 'No registrado'} />
              {maestro.curso_coach_wt && <Row label="Vence" valor={formatFecha(maestro.curso_coach_vencimiento)} />}
            </Section>
          </>
        )}

        {tab === 'turnos' && (
          <Section titulo="Turnos a cargo">
            {(!maestro.turnos || maestro.turnos.length === 0) ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>
                Sin turnos asignados todavía.
              </div>
            ) : (
              maestro.turnos.map(t => (
                <div key={t.id} className="ios-form-row">
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--red)' }}>schedule</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{t.turno?.nombre || '—'}</p>
                    {t.turno && (
                      <p style={{ fontSize: 12, color: 'var(--label3)' }}>
                        {t.turno.dias_semana} · {String(t.turno.hora_inicio).slice(0,5)} a {String(t.turno.hora_fin).slice(0,5)}
                      </p>
                    )}
                  </div>
                  {t.es_titular && <span className="ios-badge badge-green">Titular</span>}
                </div>
              ))
            )}
          </Section>
        )}

        {tab === 'planilla' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--label3)' }}>Planillas del año {new Date().getFullYear()}</p>
              <button className="ios-btn ios-btn-secondary" style={{ height: 34, fontSize: 13 }} onClick={handleGenerarPlanilla}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
                Generar mes
              </button>
            </div>
            <Section titulo="Historial de planillas">
              {planillas.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>
                  Aún no se ha generado ninguna planilla este año.
                </div>
              ) : planillas.map(p => (
                <div key={p.id_planilla} className="ios-form-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, minHeight: 60 }}>
                  <div className="ios-hstack" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(p.periodo).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(p.total)}</span>
                  </div>
                  <div className="ios-hstack" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--label3)' }}>
                    <span>Base {formatMoney(p.sueldo_base)} · Desc {formatMoney(p.descuentos)} · Bonos {formatMoney(p.bonos)}</span>
                    <span>{p.fecha_pago ? `Pagado ${formatFecha(p.fecha_pago)}` : 'Pendiente'}</span>
                  </div>
                </div>
              ))}
            </Section>
          </>
        )}

        {tab === 'acciones' && (
          <Section titulo="Acciones">
            <button className="ios-form-row" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setShowEdit(true)}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--label2)' }}>edit</span>
              <span className="ios-form-row-label" style={{ flex: 1 }}>Editar ficha</span>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--label4)' }}>chevron_right</span>
            </button>
            <button className="ios-form-row" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--red)' }}
              onClick={handleDesactivar}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--red)' }}>person_remove</span>
              <span className="ios-form-row-label" style={{ flex: 1, color: 'var(--red)' }}>Desactivar maestro</span>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--red)' }}>chevron_right</span>
            </button>
          </Section>
        )}
      </div>

      {showEdit && (
        <MaestroFormSheet
          maestroExistente={maestro}
          turnosDisponibles={turnos}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); cargar() }}
        />
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  )
}

function Section({ titulo, children }) {
  return (<div style={{ marginBottom: 16 }}>
    <p className="ios-form-section-title">{titulo}</p>
    <div className="ios-form-section" style={{ marginBottom: 0 }}>{children}</div>
  </div>)
}
function Row({ label, valor }) {
  return (<div className="ios-form-row">
    <span className="ios-form-row-label">{label}</span>
    <span style={{ flex: 1, textAlign: 'right', color: valor ? 'var(--label)' : 'var(--label3)', fontSize: 15 }}>{valor || '—'}</span>
  </div>)
}
