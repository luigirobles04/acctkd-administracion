'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase } from '@/lib/supabase'

export default function PagosPage() {
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState({
    id_alumno: '', concepto: 'Mensualidad', monto: 80, descuento: 0,
    fecha_pago: new Date().toISOString().split('T')[0],
    mes_correspondiente: new Date().toISOString().slice(0,7) + '-01',
    metodo_pago: 'efectivo', observaciones: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data: pagosData }, { data: alumnosData }] = await Promise.all([
        supabase.from('pago')
          .select('*, alumno(nombres, apellidos, dni), sede(nombre)')
          .order('fecha_pago', { ascending: false })
          .limit(100),
        supabase.from('alumno').select('id_alumno, nombres, apellidos, dni').eq('activo', true).order('apellidos'),
      ])
      setPagos(pagosData || [])
      setAlumnos(alumnosData || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('pago').insert({
        ...form,
        id_sede: 1,
        monto: parseFloat(form.monto),
        descuento: parseFloat(form.descuento || 0),
      })
      setShowModal(false)
      fetchAll()
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  const totalMes = pagos
    .filter(p => p.fecha_pago?.startsWith(new Date().toISOString().slice(0,7)))
    .reduce((s, p) => s + parseFloat(p.monto_final || p.monto), 0)

  const pendientes = pagos.filter(p => p.estado === 'pendiente').length
  const filtrados = filtro === 'todos' ? pagos : pagos.filter(p => p.estado === filtro)

  function estadoBadge(estado) {
    const map = { pagado: 'badge-green', pendiente: 'badge-yellow', vencido: 'badge-red', anulado: 'badge-gray' }
    return map[estado] || 'badge-gray'
  }

  return (
    <AdminLayout title="Pagos y Mensualidades">
      <div className="max-w-7xl mx-auto">
        {/* Stats rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total Este Mes', value: `S/ ${totalMes.toFixed(2)}`, icon: 'payments', color: '#059669' },
            { label: 'Pagos Pendientes', value: pendientes, icon: 'pending', color: '#D97706' },
            { label: 'Total Registros', value: pagos.length, icon: 'receipt_long', color: '#1F3864' },
            { label: 'Alumnos Activos', value: alumnos.length, icon: 'school', color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="tkd-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <span className="material-symbols-rounded text-xl" style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <p className="font-black text-lg text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros y acción */}
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <div className="flex gap-2">
            {['todos','pagado','pendiente','vencido'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: filtro === f ? 'var(--red)' : '#F3F4F6',
                  color: filtro === f ? '#fff' : '#6B7280'
                }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--red)' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Registrar Pago
          </button>
        </div>

        {/* Tabla */}
        <div className="tkd-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Cargando pagos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <span className="material-symbols-rounded text-5xl text-gray-300 block mb-2">payments</span>
              <p className="text-gray-400">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-semibold text-gray-500 border-b" style={{ background: '#FAFAFA' }}>
                    <th className="text-left px-5 py-3">Alumno</th>
                    <th className="text-left px-4 py-3">Concepto</th>
                    <th className="text-left px-4 py-3">Monto</th>
                    <th className="text-left px-4 py-3">Método</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(p => (
                    <tr key={p.id_pago} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-sm text-gray-900">
                          {p.alumno ? `${p.alumno.apellidos}, ${p.alumno.nombres}` : '—'}
                        </p>
                        <p className="text-xs text-gray-400">{p.alumno?.dni || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.concepto}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900">S/ {parseFloat(p.monto_final || p.monto).toFixed(2)}</span>
                        {p.descuento > 0 && <p className="text-xs text-green-600">-S/ {p.descuento}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.metodo_pago}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.fecha_pago}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${estadoBadge(p.estado)}`}>{p.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold">Registrar Pago</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Alumno *</label>
                <select required value={form.id_alumno} onChange={e => setForm(p=>({...p,id_alumno:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map(a => (
                    <option key={a.id_alumno} value={a.id_alumno}>{a.apellidos}, {a.nombres}</option>
                  ))}
                </select>
              </div>
              {[
                ['concepto','Concepto','text'],
                ['monto','Monto (S/)','number'],
                ['descuento','Descuento (S/)','number'],
                ['fecha_pago','Fecha de Pago','date'],
              ].map(([f,l,t]) => (
                <div key={f}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={t} value={form[f]} onChange={e => setForm(p=>({...p,[f]:e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Método de pago</label>
                <select value={form.metodo_pago} onChange={e => setForm(p=>({...p,metodo_pago:e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--red)' }}>
                  {saving ? 'Guardando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
