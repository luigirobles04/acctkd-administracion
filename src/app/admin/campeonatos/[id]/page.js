'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  actualizarCampeonato,
  crearCompetidorDesdeAlumno,
  crearInscripcion,
  eliminarCompetidor,
  listarAlumnosParaCompetir,
  listarCategorias,
  listarCompetidores,
  listarInscripciones,
  obtenerCampeonato,
  actualizarInscripcion,
} from '@/lib/services/campeonato.service'
import { formatFecha } from '@/lib/utils/format'

const ESTADOS = {
  planificado: { label: 'Planificado', cls: 'badge-blue' },
  inscripciones: { label: 'Inscripciones', cls: 'badge-yellow' },
  en_curso: { label: 'En curso', cls: 'badge-green' },
  finalizado: { label: 'Finalizado', cls: 'badge-gray' },
  cancelado: { label: 'Cancelado', cls: 'badge-red' },
}

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: 'info' },
  { id: 'categorias', label: 'Categorías', icon: 'category' },
  { id: 'inscripciones', label: 'Inscripciones', icon: 'groups' },
  { id: 'competidores', label: 'Competidores', icon: 'sports_martial_arts' },
]

const MODALIDADES = [
  { id: 'kyorugi', label: 'Kyorugi' },
  { id: 'poomsae_individual', label: 'Poomsae individual' },
]

export default function CampeonatoDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const idCampeonato = Number(id)

  const [tab, setTab] = useState('resumen')
  const [campeonato, setCampeonato] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [competidores, setCompetidores] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activando, setActivando] = useState(false)
  const [autoReparado, setAutoReparado] = useState(false)

  const [formIns, setFormIns] = useState({ nombre_academia: 'Christopher Cabrera Taekwondo', coach_nombres: '', coach_apellidos: '', coach_telefono: '', cantidad_competidores: 1 })
  const [formComp, setFormComp] = useState({ id_alumno: '', id_categoria: '', id_inscripcion: '', modalidad: 'kyorugi' })

  const cargar = useCallback(async () => {
    if (!idCampeonato) return
    setLoading(true)
    setError(null)
    try {
      const [camp, cats, ins, comps, alu] = await Promise.all([
        obtenerCampeonato(idCampeonato),
        listarCategorias(idCampeonato),
        listarInscripciones(idCampeonato),
        listarCompetidores(idCampeonato),
        listarAlumnosParaCompetir(),
      ])
      setCampeonato(camp)
      setCategorias(cats)
      setInscripciones(ins)
      setCompetidores(comps)
      setAlumnos(alu)
    } catch (e) {
      setError(e.message || 'Error al cargar el campeonato')
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function cambiarEstado(estado) {
    try {
      await actualizarCampeonato(idCampeonato, { estado })
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  async function activarParaPortal(silent = false) {
    setActivando(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/activar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (!silent) alert(json.mensaje || `Listo: ${json.categorias_creadas} categorías`)
      await cargar()
      return true
    } catch (e) {
      if (!silent) alert(e.message)
      return false
    } finally {
      setActivando(false)
    }
  }

  const catalogoViejo =
    categorias.length < 480
    || !categorias.some((c) => String(c.nombre || '').includes('Infantil A'))
    || categorias.some((c) => String(c.nombre || '').includes('Poomsae Cadete B'))
    || !categorias.some((c) => String(c.nombre || '').includes('Poomsae Il Jang · Cadete'))
  const necesitaActivacion = !campeonato?.slug || !campeonato?.publicado || catalogoViejo

  useEffect(() => {
    if (loading || autoReparado || activando || !campeonato) return
    if (necesitaActivacion) {
      setAutoReparado(true)
      activarParaPortal(true)
    }
  }, [loading, campeonato, categorias.length, autoReparado, activando, necesitaActivacion])

  async function guardarInscripcion(e) {
    e.preventDefault()
    try {
      await crearInscripcion({
        id_campeonato: idCampeonato,
        ...formIns,
        cantidad_competidores: Number(formIns.cantidad_competidores) || 0,
        estado: 'pendiente',
      })
      setFormIns({ nombre_academia: 'Christopher Cabrera Taekwondo', coach_nombres: '', coach_apellidos: '', coach_telefono: '', cantidad_competidores: 1 })
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  async function aprobarInscripcion(ins) {
    try {
      await actualizarInscripcion(ins.id_inscripcion, { estado: 'aprobada', fecha_aprobacion: new Date().toISOString() })
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  async function guardarCompetidor(e) {
    e.preventDefault()
    if (!formComp.id_alumno) return alert('Selecciona un alumno')
    try {
      await crearCompetidorDesdeAlumno({
        idCampeonato,
        idAlumno: Number(formComp.id_alumno),
        idCategoria: formComp.id_categoria ? Number(formComp.id_categoria) : null,
        idInscripcion: formComp.id_inscripcion ? Number(formComp.id_inscripcion) : null,
        modalidad: formComp.modalidad,
      })
      setFormComp({ id_alumno: '', id_categoria: '', id_inscripcion: '', modalidad: 'kyorugi' })
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  async function quitarCompetidor(idComp) {
    if (!confirm('¿Eliminar competidor del evento?')) return
    try {
      await eliminarCompetidor(idComp)
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading && !campeonato) {
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
        <button type="button" className="ios-btn ios-btn-secondary" style={{ marginLeft: 24 }} onClick={() => router.push('/admin/campeonatos')}>
          Volver
        </button>
      </AdminLayout>
    )
  }

  const st = ESTADOS[campeonato.estado] || { label: campeonato.estado, cls: 'badge-gray' }
  const catsKyorugi = categorias.filter((c) => c.modalidad === 'kyorugi')
  const catsPoomsae = categorias.filter((c) => c.modalidad === 'poomsae')

  return (
    <AdminLayout title={campeonato.nombre} subtitle={`${formatFecha(campeonato.fecha_inicio)} — ${formatFecha(campeonato.fecha_fin)}`}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 8px 32px' }}>
        <button type="button" className="ios-btn ios-btn-ghost" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={() => router.push('/admin/campeonatos')}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Campeonatos
        </button>

        {necesitaActivacion && (
          <div className="ios-card" style={{ padding: 16, marginBottom: 16, background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.35)' }}>
            <p className="ios-headline" style={{ marginBottom: 6 }}>Este campeonato no está listo para el portal</p>
            <p className="ios-caption" style={{ color: 'var(--label2)', marginBottom: 12, lineHeight: 1.5 }}>
              Falta publicarlo, asignar enlace (slug) o generar categorías WT. Las academias no lo verán en registro ni en el portal hasta activarlo.
            </p>
            <button type="button" className="ios-btn ios-btn-primary" disabled={activando} onClick={() => activarParaPortal(false)}>
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
            <button
              key={t.id}
              type="button"
              className={`ios-segment-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Categorías', val: categorias.length, icon: 'category', color: '#007AFF' },
                { label: 'Inscripciones', val: inscripciones.length, icon: 'groups', color: '#FF9500' },
                { label: 'Competidores', val: competidores.length, icon: 'sports_martial_arts', color: 'var(--red)' },
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
              <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 16, maxWidth: 560 }}>
                Las academias inscriben desde el portal con DNI. Aprueba solicitudes, revisa pagos y gestiona el pesaje.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href={`/admin/campeonatos/${id}/academias`} className="ios-btn ios-btn-primary">Academias inscritas</a>
                <a href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-secondary">Pagos y aprobación</a>
                <a href={`/admin/campeonatos/${id}/pesaje`} className="ios-btn ios-btn-secondary">Pesaje</a>
                {campeonato.slug && (
                  <a href={`/campeonato/${campeonato.slug}`} className="ios-btn ios-btn-secondary" target="_blank" rel="noreferrer">Página pública</a>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'categorias' && (
          <div className="ios-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <p className="ios-headline">Categorías WT</p>
                <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: 6, maxWidth: 520 }}>
                  Generadas automáticamente al crear el campeonato. No es necesario agregarlas manualmente.
                </p>
              </div>
              <span className="ios-badge badge-blue">{categorias.length} categorías</span>
            </div>

            {categorias.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p className="ios-body" style={{ color: 'var(--label3)', marginBottom: 14 }}>
                  Sin categorías generadas aún.
                </p>
                <button type="button" className="ios-btn ios-btn-primary" disabled={activando} onClick={() => activarParaPortal(false)}>
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
                          <span className="ios-caption" style={{ color: 'var(--label3)' }}>
                            {cat.genero === 'M' ? 'Masculino' : cat.genero === 'F' ? 'Femenino' : 'Mixto'}
                            {cat.edad_min != null && ` · ${cat.edad_min}–${cat.edad_max} años`}
                            {cat.peso_min != null && ` · ${cat.peso_min}–${cat.peso_max} kg`}
                          </span>
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
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)' }}>
            <div className="ios-group">
              {inscripciones.length === 0 ? (
                <p className="ios-body" style={{ padding: 20, color: 'var(--label3)', textAlign: 'center' }}>Sin inscripciones</p>
              ) : (
                inscripciones.map((ins) => (
                  <div key={ins.id_inscripcion} className="ios-group-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ios-headline">{ins.nombre_academia}</span>
                      <span className={`ios-badge ${ins.estado === 'aprobada' ? 'badge-green' : ins.estado === 'rechazada' ? 'badge-red' : 'badge-yellow'}`}>{ins.estado}</span>
                    </div>
                    <span className="ios-caption" style={{ color: 'var(--label3)' }}>
                      Coach: {ins.coach_nombres} {ins.coach_apellidos} · {ins.cantidad_competidores} comp. · {ins.coach_telefono || '—'}
                    </span>
                    {ins.estado === 'pendiente' && (
                      <button type="button" className="ios-btn ios-btn-secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={() => aprobarInscripcion(ins)}>Aprobar</button>
                    )}
                  </div>
                ))
              )}
            </div>
            <form className="ios-card" style={{ padding: 18 }} onSubmit={guardarInscripcion}>
              <p className="ios-headline" style={{ marginBottom: 14 }}>Nueva inscripción</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Academia *</span><input className="ios-input" required value={formIns.nombre_academia} onChange={(e) => setFormIns((p) => ({ ...p, nombre_academia: e.target.value }))} /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Coach nombres</span><input className="ios-input" value={formIns.coach_nombres} onChange={(e) => setFormIns((p) => ({ ...p, coach_nombres: e.target.value }))} /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Coach apellidos</span><input className="ios-input" value={formIns.coach_apellidos} onChange={(e) => setFormIns((p) => ({ ...p, coach_apellidos: e.target.value }))} /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Teléfono coach</span><input className="ios-input" value={formIns.coach_telefono} onChange={(e) => setFormIns((p) => ({ ...p, coach_telefono: e.target.value }))} /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Cant. competidores</span><input className="ios-input" type="number" min={1} value={formIns.cantidad_competidores} onChange={(e) => setFormIns((p) => ({ ...p, cantidad_competidores: e.target.value }))} /></label>
                <button type="submit" className="ios-btn ios-btn-primary">Registrar inscripción</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'competidores' && (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)' }}>
            <div className="ios-group">
              {competidores.length === 0 ? (
                <p className="ios-body" style={{ padding: 20, color: 'var(--label3)', textAlign: 'center' }}>Sin competidores inscritos</p>
              ) : (
                competidores.map((c) => (
                  <div key={c.id_competidor} className="ios-group-row">
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {c.dorsal ?? '—'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="ios-headline">{c.nombre_completo || `${c.nombres} ${c.apellidos}`}</p>
                      <p className="ios-caption" style={{ color: 'var(--label3)' }}>
                        {c.categoria_campeonato?.nombre || 'Sin categoría'} · {c.modalidad} · {c.grado || '—'}
                      </p>
                    </div>
                    <button type="button" className="ios-btn ios-btn-ghost" style={{ height: 36, width: 36, padding: 0 }} onClick={() => quitarCompetidor(c.id_competidor)} aria-label="Quitar">
                      <span className="material-symbols-rounded" style={{ color: 'var(--red)' }}>person_remove</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <form className="ios-card" style={{ padding: 18 }} onSubmit={guardarCompetidor}>
              <p className="ios-headline" style={{ marginBottom: 14 }}>Inscribir alumno ACCTKD</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label>
                  <span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Alumno *</span>
                  <select className="ios-input" required value={formComp.id_alumno} onChange={(e) => setFormComp((p) => ({ ...p, id_alumno: e.target.value }))}>
                    <option value="">Seleccionar…</option>
                    {alumnos.map((a) => (
                      <option key={a.id_alumno} value={a.id_alumno}>{a.apellidos}, {a.nombres}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Categoría</span>
                  <select className="ios-input" value={formComp.id_categoria} onChange={(e) => setFormComp((p) => ({ ...p, id_categoria: e.target.value }))}>
                    <option value="">Sin asignar</option>
                    {categorias.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Inscripción (opcional)</span>
                  <select className="ios-input" value={formComp.id_inscripcion} onChange={(e) => setFormComp((p) => ({ ...p, id_inscripcion: e.target.value }))}>
                    <option value="">—</option>
                    {inscripciones.map((ins) => (
                      <option key={ins.id_inscripcion} value={ins.id_inscripcion}>{ins.nombre_academia}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Modalidad</span>
                  <select className="ios-input" value={formComp.modalidad} onChange={(e) => setFormComp((p) => ({ ...p, modalidad: e.target.value }))}>
                    {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
                <button type="submit" className="ios-btn ios-btn-primary">Asignar dorsal automático</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
