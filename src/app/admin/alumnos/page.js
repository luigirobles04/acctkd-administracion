'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import AlumnoFormSheet from '@/components/alumnos/AlumnoFormSheet'
import {
  listarAlumnos, listarPlanes, listarTurnos, listarGrados, contarAlumnosPorEstado,
} from '@/lib/services/alumno.service'
import { obtenerMapaAlertasMensualidadPorAlumno } from '@/lib/services/pagoAlerts.service'
import { iniciales, edadDesde, formatTelefono } from '@/lib/utils/format'

const ESTADOS = [
  { id: null,         label: 'Todos',      color: 'var(--label)' },
  { id: 'activo',     label: 'Activos',    color: '#1A7A34' },
  { id: 'prueba',     label: 'En prueba',  color: '#8A5700' },
  { id: 'suspendido', label: 'Suspendidos',color: '#C0000A' },
  { id: 'retirado',   label: 'Retirados',  color: '#48484A' },
]

function badgeDeEstado(estado) {
  const map = {
    activo:     { cls: 'badge-green',  txt: 'Activo' },
    prueba:     { cls: 'badge-yellow', txt: 'En prueba' },
    suspendido: { cls: 'badge-red',    txt: 'Suspendido' },
    retirado:   { cls: 'badge-gray',   txt: 'Retirado' },
  }
  const b = map[estado] || { cls: 'badge-gray', txt: estado || '—' }
  return <span className={`ios-badge ${b.cls}`}>{b.txt}</span>
}

function MensualidadBadges({ estado, alert }) {
  if (!alert?.debeMensualidad) return null
  if (!['activo', 'suspendido'].includes(estado)) return null
  const base = {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 6,
  }
  if (alert.vencida) return <span className="ios-badge badge-red" style={base}>Mensualidad vencida</span>
  if (alert.vencePronto)
    return (
      <span
        className="ios-badge"
        style={{
          ...base,
          background: 'rgba(245,158,11,0.18)',
          color: '#92400e',
          border: '1px solid rgba(245,158,11,0.45)',
        }}
      >
        Próximo a vencer
      </span>
    )
  return <span className="ios-badge badge-yellow" style={base}>Mensualidad sin pagar</span>
}

export default function AlumnosPage() {
  const router = useRouter()
  const [alumnos, setAlumnos] = useState([])
  const [planes, setPlanes]   = useState([])
  const [turnos, setTurnos]   = useState([])
  const [grados, setGrados]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [mensualidadesPorAlumno, setMensualidadesPorAlumno] = useState({})

  async function cargar() {
    setLoading(true)
    setLoadError(null)
    try {
      const [al, pl, tu, gr, mapaM] = await Promise.all([
        listarAlumnos({ estado: filtroEstado }),
        listarPlanes(), listarTurnos(), listarGrados(),
        obtenerMapaAlertasMensualidadPorAlumno().catch(() => ({})),
      ])
      setAlumnos(al); setPlanes(pl); setTurnos(tu); setGrados(gr)
      setMensualidadesPorAlumno(typeof mapaM === 'object' && mapaM ? mapaM : {})
    } catch (err) {
      console.error('Error cargando alumnos:', err)
      setLoadError(err?.message || 'No se pudo cargar el listado. Revisa la conexión a Supabase.')
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [filtroEstado])

  const filtrados = useMemo(() => {
    const t = search.toLowerCase().trim()
    if (!t) return alumnos
    return alumnos.filter(a =>
      [a.nombres, a.apellidos, a.dni, a.codigo_alumno, a.telefono].filter(Boolean).join(' ')
        .toLowerCase().includes(t),
    )
  }, [alumnos, search])

  const contadores = contarAlumnosPorEstado(alumnos)

  return (
    <AdminLayout
      title="Alumnos"
      subtitle={`${contadores.total || 0} registrados · ${contadores.activo || 0} activos`}
      actions={
        <button className="ios-btn ios-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 14 }}
          onClick={() => setShowForm(true)}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
          <span className="hidden sm:inline">Nuevo alumno</span>
        </button>
      }>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {loadError && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(229,57,53,0.1)',
              border: '1px solid rgba(229,57,53,0.35)',
              fontSize: 13,
              color: '#B71C1C',
            }}
          >
            {loadError}
          </div>
        )}
        {/* Resumen en tarjetas (solo desktop / tablet) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatMini label="Activos"     valor={contadores.activo || 0}      color="#1A7A34" icon="check_circle" />
          <StatMini label="En prueba"   valor={contadores.prueba || 0}      color="#8A5700" icon="schedule" />
          <StatMini label="Suspendidos" valor={contadores.suspendido || 0}  color="#C0000A" icon="pause_circle" />
          <StatMini label="Retirados"   valor={contadores.retirado || 0}    color="#48484A" icon="logout" />
        </div>

        {/* Búsqueda */}
        <div className="ios-searchbar" style={{ marginBottom: 12 }}>
          <span className="ios-searchbar-icon material-symbols-rounded" style={{ fontSize: 18 }}>search</span>
          <input
            type="search"
            placeholder="Buscar por nombre, DNI o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtros chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {ESTADOS.map(e => (
            <button key={String(e.id)}
              className={`ios-chip ${filtroEstado === e.id ? 'active' : ''}`}
              onClick={() => setFiltroEstado(e.id)}>
              {e.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <div className="ios-empty">
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2.5px solid var(--red)', borderTopColor: 'transparent',
                margin: '0 auto 10px', animation: 'spin 0.8s linear infinite',
              }} />
              Cargando alumnos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">school</span>
              <p style={{ fontSize: 15, color: 'var(--label2)', fontWeight: 500 }}>
                {search ? 'No se encontraron alumnos' : 'Aún no has registrado alumnos'}
              </p>
              {!search && (
                <button className="ios-btn ios-btn-primary" style={{ marginTop: 14, height: 42 }}
                  onClick={() => setShowForm(true)}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                  Registrar primer alumno
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtrados.map(a => (
                <div key={a.id_alumno}
                  className="ios-data-row"
                  onClick={() => router.push(`/admin/alumnos/${a.id_alumno}`)}>
                  <div className="ios-avatar">{iniciales(a.nombres, a.apellidos)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ios-hstack" style={{ gap: 8, marginBottom: 2 }}>
                      <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                        {a.apellidos}, {a.nombres}
                      </p>
                      {a.codigo_alumno && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--red)',
                          background: 'rgba(229,57,53,0.08)', padding: '2px 6px',
                          borderRadius: 4, letterSpacing: 0.2,
                        }}>
                          {a.codigo_alumno}
                        </span>
                      )}
                    </div>
                    <div className="ios-hstack" style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <MensualidadBadges estado={a.estado} alert={mensualidadesPorAlumno[a.id_alumno]} />
                    </div>
                    <p className="truncate-1" style={{ fontSize: 12, color: 'var(--label3)' }}>
                      {a.plan?.nombre || 'Sin plan'} · {a.turno?.nombre || 'Sin turno'}
                      {a.grado?.nombre ? ` · ${a.grado.nombre}` : ''}
                      {a.fecha_nacimiento ? ` · ${edadDesde(a.fecha_nacimiento)} años` : ''}
                    </p>
                    <p className="truncate-1 sm:hidden" style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
                      {formatTelefono(a.telefono) || '—'}
                    </p>
                  </div>
                  <div className="ios-hstack" style={{ gap: 10 }}>
                    <span className="hidden sm:inline">{badgeDeEstado(a.estado)}</span>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--label4)' }}>chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sheet de creación */}
      {showForm && (
        <AlumnoFormSheet
          planes={planes}
          turnos={turnos}
          grados={grados}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); cargar() }}
        />
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  )
}

function StatMini({ label, valor, color, icon }) {
  return (
    <div className="ios-card-flat" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: 'var(--label)', lineHeight: 1 }}>{valor}</p>
        <p style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}
