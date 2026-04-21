'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import MaestroFormSheet from '@/components/maestros/MaestroFormSheet'
import { listarMaestros } from '@/lib/services/maestro.service'
import { listarTurnos } from '@/lib/services/alumno.service'
import { iniciales, formatTelefono, formatMoney } from '@/lib/utils/format'

export default function MaestrosPage() {
  const router = useRouter()
  const [maestros, setMaestros] = useState([])
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [m, t] = await Promise.all([listarMaestros({ soloActivos: true }), listarTurnos()])
      setMaestros(m); setTurnos(t)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  const filtrados = useMemo(() => {
    const t = search.toLowerCase().trim()
    if (!t) return maestros
    return maestros.filter(m =>
      [m.nombres, m.apellidos, m.dni, m.num_kukkiwon, m.correo]
        .filter(Boolean).join(' ').toLowerCase().includes(t),
    )
  }, [maestros, search])

  return (
    <AdminLayout
      title="Maestros"
      subtitle={`${maestros.length} instructores activos`}
      actions={
        <button className="ios-btn ios-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 14 }}
          onClick={() => setShowForm(true)}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
          <span className="hidden sm:inline">Nuevo maestro</span>
        </button>
      }>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="ios-searchbar" style={{ marginBottom: 16 }}>
          <span className="ios-searchbar-icon material-symbols-rounded" style={{ fontSize: 18 }}>search</span>
          <input type="search" placeholder="Buscar por nombre o DNI..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <div className="ios-empty">
              <div style={{ width: 28, height: 28, borderRadius: '50%',
                border: '2.5px solid var(--red)', borderTopColor: 'transparent',
                margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
              Cargando maestros...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">person_pin</span>
              <p style={{ fontSize: 15, color: 'var(--label2)', fontWeight: 500 }}>
                {search ? 'No se encontraron maestros' : 'Aún no has registrado maestros'}
              </p>
              {!search && (
                <button className="ios-btn ios-btn-primary" style={{ marginTop: 14, height: 42 }}
                  onClick={() => setShowForm(true)}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                  Registrar primer maestro
                </button>
              )}
            </div>
          ) : (
            filtrados.map(m => (
              <div key={m.id_maestro} className="ios-data-row" onClick={() => router.push(`/admin/maestros/${m.id_maestro}`)}>
                <div className="ios-avatar" style={{ background: 'linear-gradient(135deg, #1C1C1E, #3C3C43)' }}>
                  {iniciales(m.nombres, m.apellidos)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                    {m.apellidos}, {m.nombres}
                  </p>
                  <p className="truncate-1" style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                    {m.dan_nivel ? `${m.dan_nivel}° DAN` : 'Sin DAN'}
                    {m.especialidad ? ` · ${m.especialidad}` : ''}
                    {m.num_kukkiwon ? ` · Kukkiwon #${m.num_kukkiwon}` : ''}
                  </p>
                  <p className="truncate-1" style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
                    {formatTelefono(m.telefono)} {m.sueldo_mensual ? ` · ${formatMoney(m.sueldo_mensual)}/mes` : ''}
                  </p>
                </div>
                <div className="ios-hstack" style={{ gap: 10 }}>
                  {m.curso_coach_wt && (
                    <span className="ios-badge badge-green" title="Coach WT vigente">
                      <span className="material-symbols-rounded" style={{ fontSize: 12, marginRight: 2, verticalAlign: 'middle' }}>verified</span>
                      Coach WT
                    </span>
                  )}
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--label4)' }}>chevron_right</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <MaestroFormSheet
          turnosDisponibles={turnos}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); cargar() }}
        />
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  )
}
