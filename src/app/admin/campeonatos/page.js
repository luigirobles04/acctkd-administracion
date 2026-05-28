'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import { listarCampeonatos } from '@/lib/services/campeonato.service'
import { formatFecha } from '@/lib/utils/format'

const ESTADOS = {
  planificado: { label: 'Planificado', cls: 'badge-blue' },
  inscripciones: { label: 'Inscripciones', cls: 'badge-yellow' },
  en_curso: { label: 'En curso', cls: 'badge-green' },
  finalizado: { label: 'Finalizado', cls: 'badge-gray' },
  cancelado: { label: 'Cancelado', cls: 'badge-red' },
}

const FORM_INICIAL = {
  nombre: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  fecha_cierre_inscripcion: '',
  lugar: '',
  ciudad: 'Trujillo',
  estado: 'inscripciones',
}

function conteo(rel) {
  if (Array.isArray(rel)) return rel.length
  return rel?.[0]?.count ?? 0
}

export default function CampeonatosPage() {
  const router = useRouter()
  const [campeonatos, setCampeonatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [error, setError] = useState(null)

  async function cargar() {
    setLoading(true)
    setError(null)
    try {
      setCampeonatos(await listarCampeonatos())
    } catch (e) {
      setError(e.message || 'No se pudo cargar campeonatos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/campeonatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fecha_cierre_inscripcion: form.fecha_cierre_inscripcion || form.fecha_inicio,
          publicado: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setShowModal(false)
      setForm(FORM_INICIAL)
      router.push(`/admin/campeonatos/${json.campeonato.id_campeonato}`)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Campeonatos" subtitle="Gestión de eventos deportivos">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 8px 24px' }}>
        <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p className="ios-caption" style={{ color: 'var(--label3)' }}>
              {campeonatos.length} evento(s) registrados
            </p>
          </div>
          <button type="button" className="ios-btn ios-btn-primary" onClick={() => setShowModal(true)}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
            Nuevo campeonato
          </button>
        </div>

        {error && (
          <div style={{ padding: 14, marginBottom: 16, borderRadius: 12, background: 'rgba(255,59,48,0.12)', color: '#C0000A', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="ios-card" style={{ padding: 48, textAlign: 'center', color: 'var(--label3)' }}>
            Cargando campeonatos…
          </div>
        ) : campeonatos.length === 0 ? (
          <div className="ios-card anim-fade-up" style={{ padding: 48, textAlign: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 56, color: 'var(--label4)', display: 'block', marginBottom: 12 }}>emoji_events</span>
            <p className="ios-headline" style={{ color: 'var(--label)' }}>Sin campeonatos registrados</p>
            <p className="ios-body" style={{ color: 'var(--label3)', marginTop: 6 }}>Crea el primer evento para categorías, inscripciones y competidores.</p>
            <button type="button" className="ios-btn ios-btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
              Crear campeonato
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {campeonatos.map((c) => {
              const st = ESTADOS[c.estado] || { label: c.estado, cls: 'badge-gray' }
              const nCat = conteo(c.categoria_campeonato)
              const listoPortal = c.slug && c.publicado && nCat >= 50
              const nComp = conteo(c.competidor)
              const nIns = conteo(c.inscripcion_campeonato)
              return (
                <button
                  key={c.id_campeonato}
                  type="button"
                  className="ios-card anim-fade-up"
                  style={{ padding: 18, textAlign: 'left', cursor: 'pointer', border: '0.5px solid var(--separator)' }}
                  onClick={() => router.push(`/admin/campeonatos/${c.id_campeonato}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(192,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-rounded" style={{ color: 'var(--red)', fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                    </div>
                    <span className={`ios-badge ${st.cls}`}>{st.label}</span>
                  </div>
                  {!listoPortal && (
                    <span className="ios-badge badge-yellow" style={{ display: 'inline-block', marginBottom: 8, fontSize: 11 }}>
                      Configurando…
                    </span>
                  )}
                  <p className="ios-headline" style={{ color: 'var(--label)', marginBottom: 4 }}>{c.nombre}</p>
                  <p className="ios-caption" style={{ color: 'var(--label3)' }}>{c.lugar || c.ciudad || 'Trujillo'}</p>
                  <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: 8 }}>
                    {formatFecha(c.fecha_inicio)} — {formatFecha(c.fecha_fin)}
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--separator)', fontSize: 12, color: 'var(--label3)' }}>
                    <span>{nCat} cat.</span>
                    <span>{nIns} insc.</span>
                    <span>{nComp} comp.</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="ios-sheet-overlay anim-fade-in flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={() => !saving && setShowModal(false)}>
          <div className="ios-sheet anim-fade-up sm:!rounded-[28px]" style={{ maxWidth: 440, padding: '0 20px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ios-sheet-handle sm:hidden" aria-hidden />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
              <h3 className="ios-headline">Nuevo campeonato</h3>
              <button type="button" className="ios-btn ios-btn-ghost" style={{ height: 36, width: 36, padding: 0 }} onClick={() => setShowModal(false)} aria-label="Cerrar">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Nombre del evento *</span><input className="ios-input" required value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} /></label>
              <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Lugar</span><input className="ios-input" value={form.lugar} onChange={(e) => setForm((p) => ({ ...p, lugar: e.target.value }))} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Inicio *</span><input className="ios-input" type="date" required value={form.fecha_inicio} onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))} /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Fin *</span><input className="ios-input" type="date" required value={form.fecha_fin} onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))} /></label>
              </div>
              <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Cierre de inscripciones</span><input className="ios-input" type="date" value={form.fecha_cierre_inscripcion} onChange={(e) => setForm((p) => ({ ...p, fecha_cierre_inscripcion: e.target.value }))} /></label>
              <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: -6 }}>Se generan automáticamente todas las categorías WT y tarifas FDPTKD.</p>
              <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Descripción</span><textarea className="ios-input" rows={2} style={{ height: 'auto', paddingTop: 10 }} value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} /></label>
              <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Estado inicial</span><select className="ios-input" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>{Object.entries(ESTADOS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}</select></label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="ios-btn ios-btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="ios-btn ios-btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Guardando…' : 'Crear y abrir'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
