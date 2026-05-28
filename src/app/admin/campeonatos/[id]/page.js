'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import { formatFecha } from '@/lib/utils/format'
import { GRADOS_KUP_DAN } from '@/lib/campeonato/constants'

const ESTADOS = {
  planificado: { label: 'Planificado', cls: 'badge-blue' },
  inscripciones: { label: 'Inscripciones', cls: 'badge-yellow' },
  en_curso: { label: 'En curso', cls: 'badge-green' },
  finalizado: { label: 'Finalizado', cls: 'badge-gray' },
  cancelado: { label: 'Cancelado', cls: 'badge-red' },
}

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'competidores', label: 'Competidores' },
]

export default function CampeonatoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const idCampeonato = Number(id)

  const [tab, setTab] = useState('resumen')
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [categoriasCount, setCategoriasCount] = useState(0)
  const [inscripcionesCount, setInscripcionesCount] = useState(0)
  const [academiasCamp, setAcademiasCamp] = useState([])
  const [lineasInscripcion, setLineasInscripcion] = useState([])
  const [recaudacion, setRecaudacion] = useState({ totalEsperado: 0, recaudado: 0, pendiente: 0 })
  const [necesitaActivacion, setNecesitaActivacion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingCats, setLoadingCats] = useState(false)
  const [error, setError] = useState(null)
  const [activando, setActivando] = useState(false)
  const [editPerfil, setEditPerfil] = useState(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const cargar = useCallback(async () => {
    if (!idCampeonato) {
      setError('ID de campeonato inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/detalle`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar el campeonato')
      setCampeonato(json.campeonato)
      setCategoriasCount(json.categoriasCount || 0)
      setInscripcionesCount(json.inscripcionesCount || 0)
      setAcademiasCamp(json.academiasCamp || [])
      setLineasInscripcion(json.lineasInscripcion || [])
      setRecaudacion(json.recaudacion || { totalEsperado: 0, recaudado: 0, pendiente: 0 })
      setNecesitaActivacion(Boolean(json.necesitaActivacion))
    } catch (e) {
      setError(e.message || 'Error al cargar el campeonato')
      setCampeonato(null)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (tab !== 'categorias' || categorias.length || !idCampeonato) return
    setLoadingCats(true)
    fetch(`/api/admin/campeonatos/${idCampeonato}/categorias`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.categorias) setCategorias(json.categorias)
      })
      .catch(() => {})
      .finally(() => setLoadingCats(false))
  }, [tab, categorias.length, idCampeonato])

  const perfilesPortal = useMemo(() => {
    const map = new Map()
    for (const l of lineasInscripcion) {
      for (const m of l.miembros || []) {
        const p = m.perfil
        if (!p?.id_perfil) continue
        const prev = map.get(p.id_perfil) || { ...p, lineas: [] }
        prev.lineas.push(l)
        map.set(p.id_perfil, prev)
      }
    }
    return [...map.values()].sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''))
  }, [lineasInscripcion])

  async function cambiarEstado(estado) {
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/detalle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  async function activarParaPortal() {
    setActivando(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/activar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      alert(json.mensaje || `Listo: ${json.categorias_creadas} categorías`)
      setCategorias([])
      await cargar()
    } catch (e) {
      alert(e.message)
    } finally {
      setActivando(false)
    }
  }

  async function eliminarCampeonato() {
    if (!confirm(`¿Eliminar "${campeonato?.nombre}" y todos sus datos? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/admin/campeonatos')
    } catch (e) {
      alert(e.message)
    }
  }

  async function guardarPerfilAdmin(e) {
    e.preventDefault()
    if (!editPerfil) return
    setGuardandoPerfil(true)
    try {
      const { id_perfil, nombres, apellidos, sexo, fecha_nacimiento, grado, documento_tipo, documento_numero } = editPerfil
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPerfil: id_perfil, nombres, apellidos, sexo, fecha_nacimiento, grado, documento_tipo, documento_numero }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEditPerfil(null)
      await cargar()
    } catch (e) {
      alert(e.message)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Campeonato">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--label3)' }}>Cargando…</div>
      </AdminLayout>
    )
  }

  if (error || !campeonato) {
    return (
      <AdminLayout title="Campeonato">
        <div style={{ padding: 16, margin: 24, borderRadius: 12, background: 'rgba(255,59,48,0.12)', color: '#C0000A' }}>{error || 'No encontrado'}</div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 24 }}>
          <button type="button" className="ios-btn ios-btn-primary" onClick={cargar}>Reintentar</button>
          <Link href="/admin/campeonatos" className="ios-btn ios-btn-secondary">Volver</Link>
        </div>
      </AdminLayout>
    )
  }

  const st = ESTADOS[campeonato.estado] || { label: campeonato.estado, cls: 'badge-gray' }
  const catsKyorugi = categorias.filter((c) => c.modalidad === 'kyorugi')
  const catsPoomsae = categorias.filter((c) => c.modalidad === 'poomsae')

  return (
    <AdminLayout title={campeonato.nombre} subtitle={`${formatFecha(campeonato.fecha_inicio)} — ${formatFecha(campeonato.fecha_fin)}`}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 8px 32px' }}>
        <Link href="/admin/campeonatos" className="ios-btn ios-btn-ghost" style={{ marginBottom: 16, paddingLeft: 0, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Campeonatos
        </Link>

        {necesitaActivacion && (
          <div className="ios-card" style={{ padding: 16, marginBottom: 16, background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.35)' }}>
            <p className="ios-headline" style={{ marginBottom: 6 }}>Este campeonato no está listo para el portal</p>
            <p className="ios-caption" style={{ color: 'var(--label2)', marginBottom: 12, lineHeight: 1.5 }}>
              Falta publicarlo, asignar enlace (slug) o generar categorías WT.
            </p>
            <button type="button" className="ios-btn ios-btn-primary" disabled={activando} onClick={activarParaPortal}>
              {activando ? 'Activando…' : 'Activar para inscripciones'}
            </button>
          </div>
        )}

        <div className="ios-card anim-fade-up" style={{ padding: 18, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className={`ios-badge ${st.cls}`} style={{ marginBottom: 8, display: 'inline-block' }}>{st.label}</span>
            <p className="ios-body" style={{ color: 'var(--label3)' }}>{campeonato.lugar || campeonato.ciudad}</p>
            {campeonato.descripcion && <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: 8, maxWidth: 520 }}>{campeonato.descripcion}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['inscripciones', 'en_curso', 'finalizado'].map((e) => (
              <button key={e} type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={() => cambiarEstado(e)} disabled={campeonato.estado === e}>
                {ESTADOS[e].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ios-segment anim-fade-up" style={{ marginBottom: 20 }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`ios-segment-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Categorías', val: categoriasCount, icon: 'category', color: '#007AFF' },
                { label: 'Academias', val: academiasCamp.length, icon: 'school', color: '#34C759' },
                { label: 'Líneas inscripción', val: lineasInscripcion.length, icon: 'groups', color: '#FF9500' },
                { label: 'Recaudado', val: `S/ ${Number(recaudacion.recaudado || 0).toFixed(0)}`, icon: 'payments', color: '#34C759' },
                { label: 'Pendiente', val: `S/ ${Number(recaudacion.pendiente || 0).toFixed(0)}`, icon: 'pending', color: '#FF9500' },
                { label: 'Total esperado', val: `S/ ${Number(recaudacion.totalEsperado || 0).toFixed(0)}`, icon: 'account_balance', color: '#5856D6' },
                { label: 'Slug portal', val: campeonato.slug || '—', icon: 'link', color: '#5856D6' },
              ].map((k) => (
                <div key={k.label} className="ios-card" style={{ padding: 16 }}>
                  <span className="material-symbols-rounded" style={{ color: k.color, fontSize: 22 }}>{k.icon}</span>
                  <p style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{k.val}</p>
                  <p className="ios-caption" style={{ color: 'var(--label3)' }}>{k.label}</p>
                </div>
              ))}
            </div>
            <div className="ios-card" style={{ padding: 18 }}>
              <p className="ios-headline" style={{ marginBottom: 8 }}>Gestión del evento</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Link href={`/admin/campeonatos/${id}/academias`} className="ios-btn ios-btn-primary">Academias inscritas</Link>
                <Link href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-secondary">Pagos y aprobación</Link>
                <Link href={`/admin/campeonatos/${id}/pesaje`} className="ios-btn ios-btn-secondary">Pesaje</Link>
                {campeonato.slug && (
                  <a href={`/campeonato/${campeonato.slug}`} className="ios-btn ios-btn-secondary" target="_blank" rel="noreferrer">Página pública</a>
                )}
                <button type="button" className="ios-btn ios-btn-ghost" style={{ color: 'var(--red)' }} onClick={eliminarCampeonato}>
                  Eliminar campeonato
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'categorias' && (
          <div className="ios-card" style={{ padding: 18 }}>
            {loadingCats ? (
              <p style={{ color: 'var(--label3)' }}>Cargando categorías…</p>
            ) : categorias.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p className="ios-body" style={{ color: 'var(--label3)', marginBottom: 14 }}>{categoriasCount ? 'Abre de nuevo esta pestaña' : 'Sin categorías generadas aún.'}</p>
                <button type="button" className="ios-btn ios-btn-primary" disabled={activando} onClick={activarParaPortal}>
                  {activando ? 'Generando…' : 'Generar categorías WT'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {[
                  { titulo: 'Kyorugi', items: catsKyorugi },
                  { titulo: 'Poomsae', items: catsPoomsae },
                ].map((grupo) => (
                  <div key={grupo.titulo}>
                    <p className="ios-caption" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--label2)' }}>
                      {grupo.titulo} ({grupo.items.length})
                    </p>
                    <div className="ios-group" style={{ maxHeight: 420, overflow: 'auto' }}>
                      {grupo.items.map((cat) => (
                        <div key={cat.id_categoria} className="ios-group-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span className="ios-headline truncate-1" style={{ width: '100%' }}>{cat.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'inscripciones' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="ios-card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="ios-headline">{academiasCamp.length} academias · {lineasInscripcion.length} líneas</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/admin/campeonatos/${id}/academias`} className="ios-btn ios-btn-secondary">Academias</Link>
                <Link href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-primary">Pagos y dorsales</Link>
              </div>
            </div>
            <div className="ios-group">
              {academiasCamp.map((ac) => {
                const lineasAc = lineasInscripcion.filter((l) => l.id_academia_campeonato === ac.id)
                const pagadas = lineasAc.filter((l) => ['pagado', 'aprobado'].includes(l.estado)).length
                return (
                  <div key={ac.id} className="ios-group-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <span className="ios-headline">{ac.academia?.nombre || `Academia #${ac.id}`}</span>
                    <span className="ios-caption" style={{ color: 'var(--label3)' }}>
                      {lineasAc.length} líneas · {pagadas} pagadas · S/ {Number(ac.monto_asignado || 0).toFixed(0)}/{Number(ac.monto_total || 0).toFixed(0)}
                    </span>
                  </div>
                )
              })}
            </div>
            {inscripcionesCount > 0 && (
              <p className="ios-caption" style={{ color: 'var(--label3)' }}>{inscripcionesCount} solicitud(es) legacy.</p>
            )}
          </div>
        )}

        {tab === 'competidores' && (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: editPerfil ? 'minmax(0, 1fr) minmax(280px, 340px)' : '1fr' }}>
            <div className="ios-group">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)' }}>
                <p className="ios-headline">{perfilesPortal.length} competidores (portal)</p>
              </div>
              {perfilesPortal.length === 0 ? (
                <p className="ios-body" style={{ padding: 20, color: 'var(--label3)', textAlign: 'center' }}>Sin competidores inscritos vía portal</p>
              ) : (
                perfilesPortal.map((p) => (
                  <div key={p.id_perfil} className="ios-group-row" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="ios-headline">{p.nombres} {p.apellidos}</p>
                      <p className="ios-caption" style={{ color: 'var(--label3)' }}>{p.documento_tipo} {p.documento_numero}</p>
                    </div>
                    <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditPerfil({ ...p })}>
                      Editar
                    </button>
                  </div>
                ))
              )}
            </div>
            {editPerfil && (
              <form className="ios-card" style={{ padding: 18, alignSelf: 'start' }} onSubmit={guardarPerfilAdmin}>
                <p className="ios-headline" style={{ marginBottom: 14 }}>Editar competidor</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="ios-input" required value={editPerfil.nombres || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, nombres: e.target.value }))} />
                  <input className="ios-input" required value={editPerfil.apellidos || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, apellidos: e.target.value }))} />
                  <select className="ios-input" value={editPerfil.sexo || 'M'} onChange={(e) => setEditPerfil((p) => ({ ...p, sexo: e.target.value }))}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                  <input className="ios-input" type="date" value={editPerfil.fecha_nacimiento || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, fecha_nacimiento: e.target.value }))} />
                  <select className="ios-input" value={editPerfil.grado || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, grado: e.target.value }))}>
                    {GRADOS_KUP_DAN.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="ios-btn ios-btn-primary" disabled={guardandoPerfil}>Guardar</button>
                    <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setEditPerfil(null)}>Cancelar</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
