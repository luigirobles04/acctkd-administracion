'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import {
  actualizarCampeonato,
  crearCategoria,
  crearCompetidorDesdeAlumno,
  crearInscripcion,
  eliminarCategoria,
  eliminarCompetidor,
  listarAlumnosParaCompetir,
  listarCategorias,
  listarCompetidores,
  listarInscripciones,
  obtenerCampeonato,
  actualizarInscripcion,
} from '@/lib/services/campeonato.service'
import { formatFecha, formatMoney } from '@/lib/utils/format'

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

  const [formCat, setFormCat] = useState({ nombre: '', genero: 'X', modalidad: 'kyorugi', edad_min: '', edad_max: '', peso_min: '', peso_max: '' })
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

  async function guardarCategoria(e) {
    e.preventDefault()
    try {
      await crearCategoria({
        id_campeonato: idCampeonato,
        nombre: formCat.nombre,
        genero: formCat.genero,
        modalidad: formCat.modalidad,
        edad_min: formCat.edad_min ? Number(formCat.edad_min) : null,
        edad_max: formCat.edad_max ? Number(formCat.edad_max) : null,
        peso_min: formCat.peso_min ? Number(formCat.peso_min) : null,
        peso_max: formCat.peso_max ? Number(formCat.peso_max) : null,
      })
      setFormCat({ nombre: '', genero: 'X', modalidad: 'kyorugi', edad_min: '', edad_max: '', peso_min: '', peso_max: '' })
      await cargar()
    } catch (e) {
      alert(e.message)
    }
  }

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

  return (
    <AdminLayout title={campeonato.nombre} subtitle={`${formatFecha(campeonato.fecha_inicio)} — ${formatFecha(campeonato.fecha_fin)}`}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 8px 32px' }}>
        <button type="button" className="ios-btn ios-btn-ghost" style={{ marginBottom: 16, paddingLeft: 0 }} onClick={() => router.push('/admin/campeonatos')}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Campeonatos
        </button>

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
                { label: 'Inscripción S/', val: formatMoney(campeonato.monto_inscripcion), icon: 'payments', color: '#34C759' },
              ].map((k) => (
                <div key={k.label} className="ios-card" style={{ padding: 16 }}>
                  <span className="material-symbols-rounded" style={{ color: k.color, fontSize: 22 }}>{k.icon}</span>
                  <p style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{k.val}</p>
                  <p className="ios-caption" style={{ color: 'var(--label3)' }}>{k.label}</p>
                </div>
              ))}
            </div>
            <div className="ios-card" style={{ padding: 18 }}>
              <p className="ios-headline" style={{ marginBottom: 12 }}>Módulo inscripciones F1</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a href={`/admin/campeonatos/${id}/academias`} className="ios-btn ios-btn-primary">Academias y links</a>
                <a href={`/admin/campeonatos/${id}/pagos`} className="ios-btn ios-btn-secondary">Pagos y aprobación</a>
                <a href={`/admin/campeonatos/${id}/pesaje`} className="ios-btn ios-btn-secondary">Pesaje offline</a>
                {campeonato.slug && (
                  <>
                    <a href={`/campeonato/${campeonato.slug}`} className="ios-btn ios-btn-secondary" target="_blank" rel="noreferrer">Página pública</a>
                    <a href={`/inscripcion/${campeonato.slug}`} className="ios-btn ios-btn-secondary" target="_blank" rel="noreferrer">Link genérico</a>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'categorias' && (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)' }}>
            <div className="ios-group">
              {categorias.length === 0 ? (
                <p className="ios-body" style={{ padding: 20, color: 'var(--label3)', textAlign: 'center' }}>Sin categorías aún</p>
              ) : (
                categorias.map((cat) => (
                  <div key={cat.id_categoria} className="ios-group-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ios-headline">{cat.nombre}</span>
                      <button type="button" className="ios-btn ios-btn-ghost" style={{ height: 32, width: 32, padding: 0 }} onClick={() => eliminarCategoria(cat.id_categoria).then(cargar).catch((e) => alert(e.message))} aria-label="Eliminar">
                        <span className="material-symbols-rounded" style={{ color: 'var(--red)', fontSize: 18 }}>delete</span>
                      </button>
                    </div>
                    <span className="ios-caption" style={{ color: 'var(--label3)' }}>
                      {cat.modalidad} · {cat.genero === 'M' ? 'Masculino' : cat.genero === 'F' ? 'Femenino' : 'Mixto'}
                      {cat.edad_min != null && ` · ${cat.edad_min}-${cat.edad_max || '∞'} años`}
                      {cat.peso_min != null && ` · ${cat.peso_min}-${cat.peso_max || '∞'} kg`}
                      · {cat.competidor?.[0]?.count ?? 0} comp.
                    </span>
                  </div>
                ))
              )}
            </div>
            <form className="ios-card" style={{ padding: 18, height: 'fit-content' }} onSubmit={guardarCategoria}>
              <p className="ios-headline" style={{ marginBottom: 14 }}>Nueva categoría</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Nombre *</span><input className="ios-input" required value={formCat.nombre} onChange={(e) => setFormCat((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Infantil -32 kg" /></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Modalidad</span><select className="ios-input" value={formCat.modalidad} onChange={(e) => setFormCat((p) => ({ ...p, modalidad: e.target.value }))}>{MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
                <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Género</span><select className="ios-input" value={formCat.genero} onChange={(e) => setFormCat((p) => ({ ...p, genero: e.target.value }))}><option value="X">Mixto</option><option value="M">Masculino</option><option value="F">Femenino</option></select></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Edad mín</span><input className="ios-input" type="number" value={formCat.edad_min} onChange={(e) => setFormCat((p) => ({ ...p, edad_min: e.target.value }))} /></label>
                  <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Edad máx</span><input className="ios-input" type="number" value={formCat.edad_max} onChange={(e) => setFormCat((p) => ({ ...p, edad_max: e.target.value }))} /></label>
                  <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Peso mín (kg)</span><input className="ios-input" type="number" step="0.1" value={formCat.peso_min} onChange={(e) => setFormCat((p) => ({ ...p, peso_min: e.target.value }))} /></label>
                  <label><span className="ios-caption" style={{ display: 'block', marginBottom: 6 }}>Peso máx (kg)</span><input className="ios-input" type="number" step="0.1" value={formCat.peso_max} onChange={(e) => setFormCat((p) => ({ ...p, peso_max: e.target.value }))} /></label>
                </div>
                <button type="submit" className="ios-btn ios-btn-primary">Agregar categoría</button>
              </div>
            </form>
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
