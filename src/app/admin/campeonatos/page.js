'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase } from '@/lib/supabase'

const ESTADOS = {
  planificado: { label: 'Planificado', badge: 'badge-blue' },
  inscripciones: { label: 'Inscripciones', badge: 'badge-yellow' },
  en_curso: { label: 'En Curso', badge: 'badge-green' },
  finalizado: { label: 'Finalizado', badge: 'badge-gray' },
  cancelado: { label: 'Cancelado', badge: 'badge-red' },
}

export default function CampeonatosPage() {
  const [campeonatos, setCampeonatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '',
    lugar: '', ciudad: 'Trujillo', estado: 'planificado'
  })

  useEffect(() => { fetchCampeonatos() }, [])

  async function fetchCampeonatos() {
    setLoading(true)
    try {
      const { data } = await supabase.from('campeonato')
        .select('*, categoria_campeonato(count), competidor(count)')
        .order('fecha_inicio', { ascending: false })
      setCampeonatos(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('campeonato').insert(form)
      setShowModal(false)
      setForm({ nombre:'', descripcion:'', fecha_inicio:'', fecha_fin:'', lugar:'', ciudad:'Trujillo', estado:'planificado' })
      fetchCampeonatos()
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <AdminLayout title="Campeonatos">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{campeonatos.length} campeonato(s) registrado(s)</p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--red)' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo Campeonato
          </button>
        </div>

        {loading ? (
          <div className="tkd-card p-10 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          </div>
        ) : campeonatos.length === 0 ? (
          <div className="tkd-card p-16 text-center">
            <span className="material-symbols-rounded text-6xl text-gray-200 block mb-3">emoji_events</span>
            <p className="text-gray-400 font-medium">No hay campeonatos registrados</p>
            <p className="text-gray-300 text-sm mt-1">Crea el primer campeonato de la academia</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--red)' }}>
              + Crear Campeonato
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campeonatos.map(c => (
              <div key={c.id_campeonato} className="tkd-card p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelected(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--red)15' }}>
                    <span className="material-symbols-rounded text-xl" style={{ color: 'var(--red)' }}>emoji_events</span>
                  </div>
                  <span className={`badge ${ESTADOS[c.estado]?.badge || 'badge-gray'}`}>
                    {ESTADOS[c.estado]?.label || c.estado}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{c.nombre}</h3>
                <p className="text-sm text-gray-500 mb-3">{c.lugar || c.ciudad}</p>
                <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
                  <span>Inicio: {c.fecha_inicio || '—'}</span>
                  <span>Fin: {c.fecha_fin || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold">Nuevo Campeonato</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {[['nombre','Nombre del Campeonato *','text',true],['lugar','Lugar','text',false],['ciudad','Ciudad','text',false],['fecha_inicio','Fecha de Inicio','date',false],['fecha_fin','Fecha de Fin','date',false]].map(([f,l,t,req]) => (
                <div key={f}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={t} required={req} value={form[f]} onChange={e => setForm(p=>({...p,[f]:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea rows={2} value={form.descripcion} onChange={e => setForm(p=>({...p,descripcion:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--red)' }}>
                  {saving ? 'Guardando...' : 'Crear Campeonato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
