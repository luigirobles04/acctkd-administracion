'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase } from '@/lib/supabase'

export default function SedesPage() {
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('sede').select('*').then(({ data }) => {
      setSedes(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <AdminLayout title="Sedes">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">
          {loading ? (
            <div className="tkd-card p-10 text-center col-span-2">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : sedes.map(s => (
            <div key={s.id_sede} className="tkd-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--red)15' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--red)' }}>location_on</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{s.nombre}</h3>
                  <span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>
                    {s.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{s.direccion || '—'}</p>
              <p className="text-sm text-gray-500">{s.distrito}</p>
              {s.telefono && <p className="text-sm text-gray-500 mt-1">Tel: {s.telefono}</p>}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
