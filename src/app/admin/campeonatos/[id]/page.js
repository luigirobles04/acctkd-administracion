'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState, { ErrorState } from '@/components/ui/LoadingState'
import Paginacion from '@/components/ui/Paginacion'
import { formatFecha } from '@/lib/utils/format'
import { GRADOS_KUP_DAN, MODALIDADES } from '@/lib/campeonato/constants'
import { categoriasPoomsaeValidas, categoriasValidas } from '@/lib/campeonato/validar-categoria'
import { filtrarLineasGrupo, modalidadesEnLineas, nombreParticipanteLinea } from '@/lib/campeonato/agrupar-academias'
import AcademiaExpansible from '@/components/campeonatos/AcademiaExpansible'
import FiltroLineasAcademia from '@/components/campeonatos/FiltroLineasAcademia'
import { useLineasAcademia } from '@/components/campeonatos/useLineasAcademia'
import { readJsonResponse } from '@/lib/public-app-url'

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
]

const GESTION_LINKS = [
  { href: 'academias', label: 'Academias inscritas', icon: 'school', color: '#007AFF', primary: true },
  { href: 'pagos', label: 'Pagos y aprobación', icon: 'payments', color: '#34C759' },
  { href: 'tarifas', label: 'Tarifas coaches', icon: 'sell', color: '#0EA5E9' },
  { href: 'llaves', label: 'Llaves Kyorugi', icon: 'account_tree', color: '#5856D6' },
  { href: 'festival', label: 'Planilla Festival', icon: 'celebration', color: '#EC4899' },
  { href: 'poomsae', label: 'Orden Poomsae', icon: 'format_list_numbered', color: '#FF9500' },
  { href: 'podios', label: 'Podios', icon: 'emoji_events', color: '#F5C518' },
  { href: 'credenciales', label: 'Credenciales', icon: 'badge', color: '#DC2626' },
  { href: 'pesaje', label: 'Pesaje', icon: 'scale', color: '#64748B' },
]

function TablaLineasInscripcion({ lineas, onEditarPerfil, onEditarLinea, mostrarAcademia = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--separator)', textAlign: 'left' }}>
            <th style={{ padding: '8px 6px' }}>Dorsal</th>
            <th style={{ padding: '8px 6px' }}>Participante</th>
            {mostrarAcademia && <th style={{ padding: '8px 6px' }}>Academia</th>}
            <th style={{ padding: '8px 6px' }}>Modalidad</th>
            <th style={{ padding: '8px 6px' }}>Categoría</th>
            <th style={{ padding: '8px 6px' }}>Peso</th>
            <th style={{ padding: '8px 6px' }}>Tarifa</th>
            <th style={{ padding: '8px 6px' }}>Estado</th>
            <th style={{ padding: '8px 6px' }}></th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => {
            const p = l.miembros?.[0]?.perfil
            return (
              <tr key={l.id_linea} style={{ borderBottom: '1px solid var(--separator)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--red)' }}>{l.dorsal_display || '—'}</td>
                <td style={{ padding: '8px 6px' }}>
                  <div>{nombreParticipanteLinea(l)}</div>
                  {p && (
                    <div className="ios-caption" style={{ color: 'var(--label3)', marginTop: 2 }}>
                      {p.documento_tipo} {p.documento_numero} · {p.grado}
                    </div>
                  )}
                </td>
                {mostrarAcademia && (
                  <td style={{ padding: '8px 6px' }}>{l.academia_campeonato?.academia?.nombre || '—'}</td>
                )}
                <td style={{ padding: '8px 6px' }}>{MODALIDADES[l.modalidad]?.label || l.modalidad?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '8px 6px' }}>{l.categoria?.nombre || '—'}</td>
                <td style={{ padding: '8px 6px' }}>{l.peso_declarado ? `${l.peso_declarado} kg` : '—'}</td>
                <td style={{ padding: '8px 6px' }}>S/ {l.precio_aplicado}</td>
                <td style={{ padding: '8px 6px' }}>
                  <span className={`badge ${l.estado === 'aprobado' ? 'badge-green' : l.estado === 'pagado' ? 'badge-blue' : 'badge-yellow'}`} style={{ fontSize: 10 }}>
                    {l.estado?.replace(/_/g, ' ') || '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                  {p && (
                    <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }} onClick={() => onEditarPerfil(l)}>
                      Datos
                    </button>
                  )}
                  <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onEditarLinea(l)}>
                    Editar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {lineas.length === 0 && (
        <p style={{ padding: 16, textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>Sin resultados con ese filtro</p>
      )}
    </div>
  )
}

/** Detalle expandido: líneas de la academia cargadas lazy al abrir. */
function DetalleInscripcionesAcademia({ idCampeonato, acId, reloadKey, onEditarPerfil, onEditarLinea }) {
  const [filtro, setFiltro] = useState({ buscar: '', modalidad: 'todas' })
  const { lineas, loading, error, recargar, pagina, setPagina, totalPaginas, total } =
    useLineasAcademia(idCampeonato, acId, { activo: true, reloadKey })

  if (loading) return <LoadingState mensaje="Cargando inscripciones…" padding={20} />
  if (error) return <ErrorState mensaje={error} onRetry={recargar} />

  const lineasFiltradas = filtrarLineasGrupo(lineas, filtro)
  return (
    <>
      <FiltroLineasAcademia
        filtro={filtro}
        onChange={setFiltro}
        total={lineas.length}
        filtradas={lineasFiltradas.length}
        modalidades={modalidadesEnLineas(lineas)}
      />
      <TablaLineasInscripcion lineas={lineasFiltradas} onEditarPerfil={onEditarPerfil} onEditarLinea={onEditarLinea} />
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} total={total} porPagina={100} />
    </>
  )
}

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
  const [lineasCount, setLineasCount] = useState(0)
  const [recaudacion, setRecaudacion] = useState({ totalEsperado: 0, recaudado: 0, pendiente: 0 })
  const [necesitaActivacion, setNecesitaActivacion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingCats, setLoadingCats] = useState(false)
  const [error, setError] = useState(null)
  const [activando, setActivando] = useState(false)
  const [editPerfil, setEditPerfil] = useState(null)
  const [editLinea, setEditLinea] = useState(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [guardandoLinea, setGuardandoLinea] = useState(false)
  const [expandidasIns, setExpandidasIns] = useState({})
  const [reloadKeyIns, setReloadKeyIns] = useState(0)
  const [buscarGlobal, setBuscarGlobal] = useState('')
  const [busqueda, setBusqueda] = useState({ q: '', lineas: [], loading: false, error: null })

  const cargar = useCallback(async () => {
    if (!idCampeonato) {
      setError('ID de campeonato inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/detalle`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar el campeonato')
      setCampeonato(json.campeonato)
      setCategoriasCount(json.categoriasCount || 0)
      setInscripcionesCount(json.inscripcionesCount || 0)
      setAcademiasCamp(json.academiasCamp || [])
      setLineasCount(json.lineasCount || 0)
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
    if ((tab !== 'categorias' && tab !== 'inscripciones') || categorias.length || !idCampeonato) return
    setLoadingCats(true)
    adminFetch(`/api/admin/campeonatos/${idCampeonato}/categorias`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.categorias) setCategorias(json.categorias)
      })
      .catch(() => {})
      .finally(() => setLoadingCats(false))
  }, [tab, categorias.length, idCampeonato])

  const gruposInscripcion = useMemo(() => {
    return academiasCamp
      .filter((ac) => (ac.lineas_count || 0) > 0)
      .map((ac) => ({
        id: ac.id,
        nombre: ac.academia?.nombre || `Academia #${ac.id}`,
        count: ac.lineas_count || 0,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [academiasCamp])

  // Búsqueda global server-side (dorsal, nombre o academia) con debounce
  useEffect(() => {
    const q = buscarGlobal.trim()
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setBusqueda({ q: '', lineas: [], loading: false, error: null })
        return
      }
      setBusqueda((b) => ({ ...b, q, loading: true, error: null }))
      try {
        const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/buscar-inscripciones?q=${encodeURIComponent(q)}&limit=30`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error en la búsqueda')
        setBusqueda({ q, lineas: json.lineas || [], loading: false, error: null })
      } catch (e) {
        setBusqueda({ q, lineas: [], loading: false, error: e.message })
      }
    }, q.length < 2 ? 0 : 400)
    return () => clearTimeout(t)
  }, [buscarGlobal, idCampeonato, reloadKeyIns])

  async function cambiarEstado(estado) {
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/detalle`, {
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
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/activar`, { method: 'POST' })
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
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}`, { method: 'DELETE' })
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
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/perfil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPerfil: id_perfil, nombres, apellidos, sexo, fecha_nacimiento, grado, documento_tipo, documento_numero }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEditPerfil(null)
      setReloadKeyIns((k) => k + 1)
      await cargar()
    } catch (e) {
      alert(e.message)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  function categoriasParaLinea(linea, perfil) {
    if (!perfil || !campeonato) return []
    const anio = new Date(campeonato.fecha_inicio).getFullYear()
    if (linea.modalidad === 'kyorugi_individual') {
      const kyorugi = categorias.filter((c) => c.modalidad === 'kyorugi')
      return categoriasValidas(kyorugi, perfil, anio, editLinea?.peso_declarado ?? linea.peso_declarado)
    }
    if (linea.modalidad?.startsWith('poomsae')) {
      const poom = categorias.filter((c) => c.modalidad === 'poomsae')
      return categoriasPoomsaeValidas(poom, perfil, anio)
    }
    return []
  }

  function abrirEditarPerfil(l) {
    const p = l.miembros?.[0]?.perfil
    if (!p?.id_perfil) return
    setEditLinea(null)
    setEditPerfil({ ...p, lineas: [l] })
  }

  function abrirEditarLinea(l) {
    const p = l.miembros?.[0]?.perfil
    if (!p) return
    const catActual = categorias.find((c) => c.id_categoria === l.id_categoria)
    setEditPerfil(null)
    setEditLinea({
      id_linea: l.id_linea,
      modalidad: l.modalidad,
      division: catActual?.division || '',
      id_categoria: l.id_categoria ? String(l.id_categoria) : '',
      peso_declarado: l.peso_declarado ?? '',
      perfil: p,
      categoria_nombre: l.categoria?.nombre,
    })
  }

  function divisionesParaLinea(linea, perfil) {
    const cats = categoriasParaLinea(linea, perfil)
    return [...new Set(cats.map((c) => c.division).filter(Boolean))].sort()
  }

  function categoriasPorDivision(linea, perfil, division) {
    const cats = categoriasParaLinea(linea, perfil)
    if (!division) return cats
    return cats.filter((c) => c.division === division)
  }

  async function guardarLineaAdmin(e) {
    e.preventDefault()
    if (!editLinea) return
    setGuardandoLinea(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/linea`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLinea: editLinea.id_linea,
          idCategoria: editLinea.id_categoria || null,
          pesoDeclarado: editLinea.peso_declarado || null,
        }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setEditLinea(null)
      setReloadKeyIns((k) => k + 1)
      await cargar()
    } catch (e) {
      alert(e.message)
    } finally {
      setGuardandoLinea(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Campeonato">
        <LoadingState mensaje="Cargando campeonato…" />
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
      <div className="camp-page">
        <Link href="/admin/campeonatos" className="camp-back">
          <span className="material-symbols-rounded">arrow_back</span>
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
            <div className="camp-stats-grid">
              {[
                { label: 'Categorías', val: categoriasCount, icon: 'category', color: '#007AFF', bg: 'rgba(0,122,255,0.12)' },
                { label: 'Academias', val: academiasCamp.length, icon: 'school', color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
                { label: 'Líneas inscripción', val: lineasCount, icon: 'groups', color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
                { label: 'Recaudado', val: `S/ ${Number(recaudacion.recaudado || 0).toFixed(0)}`, icon: 'payments', color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
                { label: 'Pendiente', val: `S/ ${Number(recaudacion.pendiente || 0).toFixed(0)}`, icon: 'pending', color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
                { label: 'Total esperado', val: `S/ ${Number(recaudacion.totalEsperado || 0).toFixed(0)}`, icon: 'account_balance', color: '#5856D6', bg: 'rgba(88,86,214,0.12)' },
              ].map((k) => (
                <div key={k.label} className="camp-stat-card">
                  <div className="camp-stat-icon" style={{ background: k.bg }}>
                    <span className="material-symbols-rounded" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                  </div>
                  <div>
                    <p className="camp-stat-value">{k.val}</p>
                    <p className="camp-stat-label">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {campeonato.slug && (
              <div className="camp-slug-bar">
                <span className="material-symbols-rounded">link</span>
                <code>{campeonato.slug}</code>
                <a href={`/campeonato/${campeonato.slug}`} target="_blank" rel="noreferrer" className="camp-slug-link">
                  Página pública
                </a>
              </div>
            )}

            <section className="camp-section">
              <p className="app-section-title">
                <span className="material-symbols-rounded">tune</span>
                Gestión del evento
              </p>
              <div className="app-quick-grid">
                {GESTION_LINKS.map((g) => (
                  <Link key={g.href} href={`/admin/campeonatos/${id}/${g.href}`} className={`app-quick-card ${g.primary ? 'app-quick-card--primary' : ''}`}>
                    <div className="app-quick-card-icon" style={{ background: `${g.color}18` }}>
                      <span className="material-symbols-rounded" style={{ color: g.color, fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                    </div>
                    <span className="app-quick-card-label">{g.label}</span>
                  </Link>
                ))}
                {campeonato.slug && (
                  <a href={`/campeonato/${campeonato.slug}/canchas`} target="_blank" rel="noreferrer" className="app-quick-card">
                    <div className="app-quick-card-icon" style={{ background: 'rgba(225,6,0,0.1)' }}>
                      <span className="material-symbols-rounded" style={{ color: 'var(--red)', fontVariationSettings: "'FILL' 1" }}>tv</span>
                    </div>
                    <span className="app-quick-card-label">Pantallas TV</span>
                  </a>
                )}
                <button type="button" className="app-quick-card app-quick-card--danger" onClick={eliminarCampeonato}>
                  <div className="app-quick-card-icon" style={{ background: 'rgba(255,59,48,0.1)' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--red)' }}>delete</span>
                  </div>
                  <span className="app-quick-card-label">Eliminar campeonato</span>
                </button>
              </div>
            </section>
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
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: (editPerfil || editLinea) ? 'minmax(0, 1fr) minmax(300px, 360px)' : '1fr' }}>
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="ios-card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p className="ios-headline">{gruposInscripcion.length} academias · {lineasCount} inscripciones</p>
                  {loadingCats && categorias.length === 0 && (
                    <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: 4 }}>Cargando categorías…</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/admin/campeonatos/${id}/academias`} className="ios-btn ios-btn-secondary">Academias</Link>
                  <Link href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-primary">Pagos</Link>
                  <Link href={`/admin/campeonatos/${id}/llaves`} className="ios-btn ios-btn-secondary">Llaves Kyorugi</Link>
                  <Link href={`/admin/campeonatos/${id}/poomsae`} className="ios-btn ios-btn-secondary">Orden Poomsae</Link>
                  <Link href={`/admin/campeonatos/${id}/podios`} className="ios-btn ios-btn-secondary">Podios</Link>
                  <Link href={`/admin/campeonatos/${id}/credenciales`} className="ios-btn ios-btn-secondary">Credenciales</Link>
                </div>
              </div>

              <div className="ios-card" style={{ padding: 16 }}>
                <input
                  type="search"
                  className="ios-input"
                  placeholder="Buscar en todo el campeonato: dorsal, nombre o academia (mín. 2 letras)…"
                  value={buscarGlobal}
                  onChange={(e) => setBuscarGlobal(e.target.value)}
                  style={{ width: '100%' }}
                />
                {busqueda.q && (
                  <div style={{ marginTop: 12 }}>
                    {busqueda.loading ? (
                      <LoadingState mensaje="Buscando…" padding={16} />
                    ) : busqueda.error ? (
                      <ErrorState mensaje={busqueda.error} />
                    ) : (
                      <>
                        <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 8 }}>
                          {busqueda.lineas.length} resultado(s) para “{busqueda.q}”
                        </p>
                        <TablaLineasInscripcion
                          lineas={busqueda.lineas}
                          onEditarPerfil={abrirEditarPerfil}
                          onEditarLinea={abrirEditarLinea}
                          mostrarAcademia
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {!busqueda.q && gruposInscripcion.map((g) => (
                <AcademiaExpansible
                  key={g.id}
                  nombre={g.nombre}
                  resumen={`${g.count} competidor(es) inscrito(s)`}
                  expandido={Boolean(expandidasIns[g.id])}
                  onToggle={() => setExpandidasIns((e) => ({ ...e, [g.id]: !e[g.id] }))}
                >
                  <DetalleInscripcionesAcademia
                    idCampeonato={idCampeonato}
                    acId={g.id}
                    reloadKey={reloadKeyIns}
                    onEditarPerfil={abrirEditarPerfil}
                    onEditarLinea={abrirEditarLinea}
                  />
                </AcademiaExpansible>
              ))}
              {!busqueda.q && gruposInscripcion.length === 0 && (
                <p style={{ padding: 24, textAlign: 'center', color: 'var(--label3)' }}>Sin inscripciones aún</p>
              )}
            </div>
            {editPerfil && (
              <form className="ios-card" style={{ padding: 18, alignSelf: 'start' }} onSubmit={guardarPerfilAdmin}>
                <p className="ios-headline" style={{ marginBottom: 14 }}>Editar datos personales</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="ios-input" required value={editPerfil.nombres || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, nombres: e.target.value }))} placeholder="Nombres" />
                  <input className="ios-input" required value={editPerfil.apellidos || ''} onChange={(e) => setEditPerfil((p) => ({ ...p, apellidos: e.target.value }))} placeholder="Apellidos" />
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
            {editLinea && (
              <form className="ios-card" style={{ padding: 18, alignSelf: 'start' }} onSubmit={guardarLineaAdmin}>
                <p className="ios-headline" style={{ marginBottom: 6 }}>Editar inscripción</p>
                <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 14 }}>
                  {MODALIDADES[editLinea.modalidad]?.label || editLinea.modalidad}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {editLinea.modalidad === 'kyorugi_individual' && (
                    <>
                      <label className="ios-label">Peso declarado (kg)</label>
                      <input
                        className="ios-input"
                        type="number"
                        step="0.1"
                        value={editLinea.peso_declarado}
                        onChange={(e) => setEditLinea((l) => ({ ...l, peso_declarado: e.target.value }))}
                      />
                    </>
                  )}
                  {editLinea.modalidad === 'kyorugi_individual' && (
                    <>
                      <label className="ios-label">División (A, B, C…)</label>
                      <select
                        className="ios-input"
                        value={editLinea.division || ''}
                        onChange={(e) => {
                          const division = e.target.value
                          const opts = categoriasPorDivision(editLinea, editLinea.perfil, division)
                          setEditLinea((l) => ({
                            ...l,
                            division,
                            id_categoria: opts[0]?.id_categoria ? String(opts[0].id_categoria) : '',
                          }))
                        }}
                      >
                        <option value="">Seleccionar…</option>
                        {divisionesParaLinea(editLinea, editLinea.perfil).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <label className="ios-label">Categoría</label>
                  <select
                    className="ios-input"
                    value={editLinea.id_categoria}
                    onChange={(e) => setEditLinea((l) => ({ ...l, id_categoria: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {(editLinea.modalidad === 'kyorugi_individual'
                      ? categoriasPorDivision(editLinea, editLinea.perfil, editLinea.division)
                      : categoriasParaLinea(editLinea, editLinea.perfil)
                    ).map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                    ))}
                  </select>
                  {editLinea.categoria_nombre && (
                    <p className="ios-caption" style={{ color: 'var(--label3)' }}>Actual: {editLinea.categoria_nombre}</p>
                  )}
                  {categorias.length === 0 && (
                    <p className="ios-caption" style={{ color: '#C0000A' }}>Genera categorías WT primero (pestaña Categorías).</p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="ios-btn ios-btn-primary" disabled={guardandoLinea || categorias.length === 0}>Guardar</button>
                    <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setEditLinea(null)}>Cancelar</button>
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
