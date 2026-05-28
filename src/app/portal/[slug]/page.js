'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PortalLayout, { PortalBarraTotales, PortalTabs, PortalWizardSteps } from '@/components/campeonatos/PortalLayout'
import PortalStatusChips from '@/components/campeonatos/PortalStatusChips'
import {
  PortalField,
  PortalCategoriaPicker,
  PortalModalityCard,
  MODALIDADES_PORTAL,
  modalidadRequiereCategoriaPoomsae,
} from '@/components/campeonatos/PortalInscripcion'
import {
  MODALIDADES,
  GRADOS_KUP_DAN,
  DOCUMENTO_TIPOS,
  TEXTO_LEGAL_BASES,
  ROLES_OFICIAL,
  ESTADOS_LINEA,
  edadWT,
  whatsappUrl,
} from '@/lib/campeonato/constants'
import { categoriasValidas, categoriasPoomsaeValidas, parseGrado, nombreCategoria, poomsaeCategoriaSugerida } from '@/lib/campeonato/validar-categoria'
import { validarFotoCarnet } from '@/lib/campeonato/validar-foto'
import PortalGrupoForm from '@/components/campeonatos/PortalGrupoForm'
import { esModalidadGrupo } from '@/lib/campeonato/validar-grupo'
import { getCurrentUser, isRepresentante } from '@/lib/services/auth.service'
import { portalFetch } from '@/lib/portal-client'

const TABS = [
  { id: 'inscribir', label: 'Inscribir' },
  { id: 'plantel', label: 'Plantel' },
  { id: 'pagos', label: 'Pagos' },
]

const STEPS = ['Documento', 'Datos', 'Modalidades', 'Confirmar']

const FORM = {
  documento_tipo: 'DNI',
  documento_numero: '',
  nombres: '',
  apellidos: '',
  sexo: 'M',
  fecha_nacimiento: '',
  grado: '10º kup',
  foto_url: '',
}

function modalidadLabel(key) {
  if (key === 'oficial') return 'Oficial'
  return MODALIDADES[key]?.label || MODALIDADES_PORTAL.find((m) => m.key === key)?.label || key
}

function resumenCategoria(key, sel, catsKyorugi, catsPoomsae, allCats) {
  const id = sel?.idCategoria
  if (!id) return null
  if (key === 'kyorugi_individual') {
    return catsKyorugi.find((c) => String(c.id_categoria) === String(id))?.nombre
  }
  if (modalidadRequiereCategoriaPoomsae(key)) {
    return catsPoomsae.find((c) => String(c.id_categoria) === String(id))?.nombre || nombreCategoria(id, allCats)
  }
  return nombreCategoria(id, allCats)
}

export default function PortalCampeonatoPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('inscribir')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [perfil, setPerfil] = useState(FORM)
  const [modalidadesSel, setModalidadesSel] = useState({})
  const [voucher, setVoucher] = useState({ monto: '', operacion: '', file: null })
  const [submitting, setSubmitting] = useState(false)
  const [showGrupoForm, setShowGrupoForm] = useState(false)
  const [editPerfilId, setEditPerfilId] = useState(null)

  const cargar = useCallback(async () => {
    if (!slug) return
    const user = getCurrentUser()
    if (!user || !isRepresentante(user)) {
      router.replace('/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await portalFetch(`/api/portal/campeonato/${slug}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    cargar()
  }, [cargar])

  const anio = data?.campeonato?.anioCampeonato || new Date().getFullYear()
  const edad = edadWT(perfil.fecha_nacimiento, anio)
  const gradoInfo = parseGrado(perfil.grado)
  const esDan = gradoInfo?.tipo === 'dan'

  const catsKyorugi = useMemo(() => {
    try {
      return categoriasValidas(
        (data?.categorias || []).filter((c) => c.modalidad === 'kyorugi'),
        perfil,
        anio,
        modalidadesSel.kyorugi_individual?.peso || ''
      )
    } catch {
      return []
    }
  }, [data?.categorias, perfil, anio, modalidadesSel.kyorugi_individual?.peso])

  const catsPoomsae = useMemo(() => {
    try {
      return categoriasPoomsaeValidas(
        (data?.categorias || []).filter((c) => c.modalidad === 'poomsae'),
        perfil,
        anio
      )
    } catch {
      return []
    }
  }, [data?.categorias, perfil, anio])

  function toggleModalidad(key) {
    const mod = MODALIDADES_PORTAL.find((m) => m.key === key)
    if (mod?.disabled) return
    setModalidadesSel((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
        return next
      }
      if (key === 'kyorugi_individual') next[key] = { peso: '', idCategoria: '' }
      else if (key === 'oficial') next[key] = { tipoOficial: 'coach' }
      else if (modalidadRequiereCategoriaPoomsae(key)) {
        const sugerida = poomsaeCategoriaSugerida(data?.categorias || [], perfil, anio)
        next[key] = { idCategoria: sugerida || '' }
      } else next[key] = {}
      return next
    })
  }

  useEffect(() => {
    if (!data?.categorias?.length) return
    setModalidadesSel((prev) => {
      let changed = false
      const next = { ...prev }
      for (const modKey of Object.keys(next)) {
        if (modalidadRequiereCategoriaPoomsae(modKey) && !next[modKey]?.idCategoria) {
          const sugerida = poomsaeCategoriaSugerida(data.categorias, perfil, anio)
          if (sugerida) {
            next[modKey] = { ...next[modKey], idCategoria: sugerida }
            changed = true
          }
        }
        if (
          modKey === 'kyorugi_individual' &&
          next.kyorugi_individual?.peso &&
          !next.kyorugi_individual?.idCategoria &&
          catsKyorugi.length === 1
        ) {
          next.kyorugi_individual = {
            ...next.kyorugi_individual,
            idCategoria: String(catsKyorugi[0].id_categoria),
          }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [data?.categorias, perfil, anio, catsKyorugi])

  function updateModalidad(key, patch) {
    setModalidadesSel((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const modalidadesActivas = Object.keys(modalidadesSel)

  const step2Valid = modalidadesActivas.length > 0 && modalidadesActivas.every((key) => {
    const sel = modalidadesSel[key]
    if (key === 'kyorugi_individual') return sel.peso && sel.idCategoria
    if (modalidadRequiereCategoriaPoomsae(key)) return sel.idCategoria
    if (key === 'oficial') return sel.tipoOficial
    return true
  })

  async function buscarDocumento() {
    if (!perfil.documento_numero) return
    const q = new URLSearchParams({ documento: perfil.documento_numero, tipo: perfil.documento_tipo })
    const res = await portalFetch(`/api/portal/campeonato/${slug}/perfil?${q}`)
    const json = await res.json()
    if (json.perfil) setPerfil({ ...FORM, ...json.perfil, foto_url: json.perfil.foto_url || '' })
  }

  async function subirFoto() {
    if (!perfil._fotoFile) return perfil.foto_url
    const fd = new FormData()
    fd.append('file', perfil._fotoFile, perfil._fotoFile.name || 'foto.jpg')
    const res = await portalFetch(`/api/portal/campeonato/${slug}/foto`, { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    return json.url
  }

  async function guardarPerfil(fotoUrl) {
    const payload = { ...perfil, foto_url: fotoUrl || perfil.foto_url }
    delete payload._fotoFile
    const res = await portalFetch(`/api/portal/campeonato/${slug}/perfil`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    return json.perfil
  }

  async function confirmarInscripcion() {
    setSubmitting(true)
    setError(null)
    try {
      let fotoUrl = perfil.foto_url || ''
      if (perfil._fotoFile) {
        fotoUrl = await subirFoto()
      }
      const p = await guardarPerfil(fotoUrl)
      const lineas = modalidadesActivas.map((key) => ({
        modalidad: key,
        idCategoria: modalidadesSel[key]?.idCategoria ? Number(modalidadesSel[key].idCategoria) : null,
        pesoDeclarado: key === 'kyorugi_individual' ? Number(modalidadesSel[key].peso) : null,
        tipoOficial: key === 'oficial' ? modalidadesSel[key].tipoOficial : null,
      }))

      const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ accion: 'crear_lineas', idPerfil: p.id_perfil, lineas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setPerfil(FORM)
      setModalidadesSel({})
      setStep(0)
      setEditPerfilId(null)
      setTab('plantel')
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function aceptarBases() {
    await portalFetch(`/api/portal/campeonato/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ accion: 'aceptar_bases' }),
    })
    cargar()
  }

  async function enviarLista() {
    const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ accion: 'notificar' }),
    })
    const json = await res.json()
    alert(json.message || (json.ok ? 'Lista enviada' : json.error))
    cargar()
  }

  async function anularLinea(idLinea) {
    if (!confirm('¿Anular esta inscripción?')) return
    const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ accion: 'anular_linea', idLinea }),
    })
    const json = await res.json()
    if (!res.ok) alert(json.error)
    else cargar()
  }

  function editarCompetidor(p) {
    setPerfil({ ...FORM, ...p, foto_url: p.foto_url || '' })
    setModalidadesSel({})
    setStep(1)
    setEditPerfilId(p.id_perfil)
    setTab('inscribir')
  }

  async function eliminarCompetidor(idPerfil) {
    if (!confirm('¿Eliminar este competidor del plantel?')) return
    const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ accion: 'eliminar_perfil', idPerfil }),
    })
    const json = await res.json()
    if (!res.ok) alert(json.error)
    else cargar()
  }

  async function subirVoucher(e) {
    e.preventDefault()
    if (!voucher.file) return alert('Selecciona el comprobante')
    const fd = new FormData()
    fd.append('file', voucher.file, voucher.file.name || 'voucher.jpg')
    fd.append('monto_declarado', voucher.monto)
    fd.append('numero_operacion', voucher.operacion)
    const res = await portalFetch(`/api/portal/campeonato/${slug}/comprobante`, { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) alert(json.error)
    else {
      setVoucher({ monto: '', operacion: '', file: null })
      cargar()
    }
  }

  if (loading) {
    return (
      <PortalLayout titulo="Cargando…" backHref={null}>
        <div className="portal-card portal-empty">Un momento…</div>
      </PortalLayout>
    )
  }

  if (error && !data) {
    return (
      <PortalLayout titulo="Error">
        <div className="portal-card">
          <p className="portal-error">{error}</p>
          <button type="button" className="ios-btn ios-btn-secondary portal-btn-block" onClick={() => router.push('/portal')}>
            ← Mis campeonatos
          </button>
        </div>
      </PortalLayout>
    )
  }

  if (!data?.academiaCampeonato || !data?.campeonato) {
    return (
      <PortalLayout titulo="Error">
        <div className="portal-card"><p className="portal-error">No se pudo cargar el campeonato.</p></div>
      </PortalLayout>
    )
  }

  const ac = data.academiaCampeonato
  const camp = data.campeonato
  const aprobada = ac.estado_aprobacion === 'aprobada'
  const rechazada = ac.estado_aprobacion === 'rechazada'
  const allCats = data.categorias || []

  return (
    <PortalLayout titulo={camp.nombre} subtitulo="Inscripción en línea" academiaNombre={data.academia?.nombre}>
      <div className="portal-card portal-card--flat">
        {rechazada ? (
          <div className="portal-alert portal-alert--warn">
            Rechazada: {ac.motivo_rechazo || 'Contacta a ACCTKD para más información.'}
          </div>
        ) : (
          <PortalStatusChips
            estado_aprobacion={ac.estado_aprobacion}
            estado_lista={ac.estado_lista}
            estado_pago={ac.estado_pago}
            monto_total={ac.monto_total}
            showPago={Number(ac.monto_total) > 0}
          />
        )}
      </div>

      {!ac.aceptacion_bases_at && (
        <div className="portal-card">
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--label2)', margin: 0 }}>{TEXTO_LEGAL_BASES}</p>
          <button type="button" className="ios-btn ios-btn-primary portal-btn-block" onClick={aceptarBases}>
            Acepto las bases y continúo
          </button>
        </div>
      )}

      <PortalTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'inscribir' && ac.aceptacion_bases_at && !rechazada && (
        <div className="portal-card">
          {editPerfilId && (
            <p className="portal-field-hint portal-field-hint--info" style={{ marginBottom: 12 }}>
              Editando competidor — completa modalidades y confirma para agregar nuevas inscripciones, o solo actualiza datos en paso 2.
            </p>
          )}
          <PortalWizardSteps steps={STEPS} current={step} />

          {step === 0 && (
            <>
              <h3 className="portal-section-title">Buscar competidor</h3>
              <p className="portal-section-lead">Ingresa el documento para recuperar datos si ya fue inscrito antes.</p>
              <div className="portal-field-grid portal-field-grid--doc">
                <PortalField label="Tipo">
                  <select className="ios-input" value={perfil.documento_tipo} onChange={(e) => setPerfil({ ...perfil, documento_tipo: e.target.value })}>
                    {DOCUMENTO_TIPOS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </PortalField>
                <PortalField label="Número">
                  <input className="ios-input" placeholder="12345678" value={perfil.documento_numero} onChange={(e) => setPerfil({ ...perfil, documento_numero: e.target.value })} />
                </PortalField>
                <button type="button" className="ios-btn ios-btn-secondary" onClick={buscarDocumento}>Buscar</button>
              </div>
              <div className="portal-actions">
                <button type="button" className="ios-btn ios-btn-primary" disabled={!perfil.documento_numero} onClick={() => setStep(1)}>
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="portal-section-title">Datos del competidor</h3>
              <p className="portal-section-lead">Verifica nombre, edad WT y grado — definen las categorías disponibles.</p>
              <div className="portal-field-grid portal-field-grid--2">
                <PortalField label="Nombres">
                  <input className="ios-input" value={perfil.nombres} onChange={(e) => setPerfil({ ...perfil, nombres: e.target.value })} required />
                </PortalField>
                <PortalField label="Apellidos">
                  <input className="ios-input" value={perfil.apellidos} onChange={(e) => setPerfil({ ...perfil, apellidos: e.target.value })} required />
                </PortalField>
              </div>
              <div className="portal-field-grid portal-field-grid--3">
                <PortalField label="Sexo">
                  <select className="ios-input" value={perfil.sexo} onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value })}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </PortalField>
                <PortalField label="Nacimiento">
                  <input className="ios-input" type="date" value={perfil.fecha_nacimiento} onChange={(e) => setPerfil({ ...perfil, fecha_nacimiento: e.target.value })} />
                </PortalField>
                <PortalField label="Grado">
                  <select className="ios-input" value={perfil.grado} onChange={(e) => { setPerfil({ ...perfil, grado: e.target.value }); setModalidadesSel({}) }}>
                    {GRADOS_KUP_DAN.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </PortalField>
              </div>
              {edad != null && (
                <p className="portal-field-hint">
                  Edad WT al 31-dic-{anio}: <strong>{edad} años</strong>
                  {esDan && ' · Cinturón negro compite en Ranking G3 (no en cintas de color)'}
                  {gradoInfo?.tipo === 'kup' && gradoInfo.nivel === 1 && ' · 1er kup puede elegir cintas (Pal Jang) o Ranking G3'}
                </p>
              )}
              <PortalField label="Foto carnet">
                <div className="portal-photo-box">
                  {perfil.foto_url && <img src={perfil.foto_url} alt="" className="portal-photo-preview" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="portal-photo-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const val = await validarFotoCarnet(file)
                      if (!val.ok) { alert(val.error); return }
                      setPerfil((p) => ({ ...p, foto_url: val.preview, _fotoFile: file }))
                    }}
                  />
                </div>
              </PortalField>
              <div className="portal-actions">
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(0)}>Atrás</button>
                <button type="button" className="ios-btn ios-btn-primary" disabled={!perfil.nombres || !perfil.apellidos || !perfil.fecha_nacimiento} onClick={() => setStep(2)}>
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="portal-section-title">Modalidades y categorías</h3>
              <p className="portal-section-lead">Activa las modalidades deseadas. En kyorugi y poomsae debes elegir la categoría concreta.</p>
              <div className="portal-mod-list">
                {MODALIDADES_PORTAL.map(({ key, label, desc, icon, disabled }) => {
                  const active = Boolean(modalidadesSel[key])
                  return (
                    <PortalModalityCard
                      key={key}
                      active={active}
                      icon={icon}
                      title={label}
                      desc={desc}
                      disabled={disabled}
                      onToggle={() => toggleModalidad(key)}
                    >
                      {key === 'kyorugi_individual' && modalidadesSel[key] && (
                        <>
                          <PortalField label="Peso declarado (kg)">
                            <input
                              className="ios-input"
                              type="number"
                              step="0.1"
                              placeholder="Ej. 45.5"
                              value={modalidadesSel[key]?.peso || ''}
                              onChange={(e) => updateModalidad(key, { peso: e.target.value, idCategoria: '' })}
                            />
                          </PortalField>
                          <PortalField label="Categoría kyorugi">
                            <PortalCategoriaPicker
                              categorias={catsKyorugi}
                              value={modalidadesSel[key]?.idCategoria || ''}
                              onChange={(v) => updateModalidad(key, { idCategoria: v })}
                              emptyMessage="No hay categorías válidas. Revisa edad, sexo o peso."
                            />
                          </PortalField>
                        </>
                      )}

                      {modalidadRequiereCategoriaPoomsae(key) && modalidadesSel[key] && (
                        <PortalField
                          label="División poomsae"
                          hint={
                            esDan
                              ? 'Ranking G3 según edad WT — todas las divisiones dan compiten juntas por categoría.'
                              : gradoInfo?.tipo === 'kup' && gradoInfo.nivel === 1
                                ? 'Puedes inscribirte en Cintas (Pal Jang) o en Ranking G3.'
                                : undefined
                          }
                        >
                          <PortalCategoriaPicker
                            categorias={catsPoomsae}
                            value={modalidadesSel[key]?.idCategoria || ''}
                            onChange={(v) => updateModalidad(key, { idCategoria: v })}
                            emptyMessage="No hay divisiones poomsae para esta edad, sexo o grado."
                            grouped
                          />
                        </PortalField>
                      )}

                      {key === 'oficial' && modalidadesSel[key] && (
                        <PortalField label="Rol">
                          <select className="ios-input" value={modalidadesSel[key]?.tipoOficial || 'coach'} onChange={(e) => updateModalidad(key, { tipoOficial: e.target.value })}>
                            {ROLES_OFICIAL.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </PortalField>
                      )}
                    </PortalModalityCard>
                  )
                })}
              </div>
              <div className="portal-actions">
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(1)}>Atrás</button>
                <button type="button" className="ios-btn ios-btn-primary" disabled={!step2Valid} onClick={() => setStep(3)}>
                  Revisar
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="portal-section-title">Confirmar inscripción</h3>
              <div className="portal-summary">
                <p className="portal-summary-athlete">{perfil.nombres} {perfil.apellidos}</p>
                <p className="portal-summary-meta">
                  {perfil.documento_tipo} {perfil.documento_numero} · {edad} años · {perfil.grado}
                </p>
                <div style={{ marginTop: 14 }}>
                  {modalidadesActivas.map((key) => (
                    <div key={key} className="portal-summary-row">
                      <div>
                        <div className="portal-summary-mod">
                          {modalidadLabel(key)}
                          {key === 'oficial' && ` · ${modalidadesSel[key].tipoOficial}`}
                        </div>
                        {key === 'kyorugi_individual' && modalidadesSel[key].peso && (
                          <div className="portal-line-meta">{modalidadesSel[key].peso} kg</div>
                        )}
                      </div>
                      <div className="portal-summary-cat">
                        {resumenCategoria(key, modalidadesSel[key], catsKyorugi, catsPoomsae, allCats) || (key === 'oficial' ? 'Gratis' : '—')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <p className="portal-error">{error}</p>}
              <div className="portal-actions">
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(2)}>Atrás</button>
                <button type="button" className="ios-btn ios-btn-primary" disabled={submitting} onClick={confirmarInscripcion}>
                  {submitting ? 'Inscribiendo…' : `Confirmar ${modalidadesActivas.length} inscripción(es)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'plantel' && (
        <>
          <div className="portal-card">
            <h3 className="portal-section-title">Competidores · {(data.perfiles || []).length}</h3>
            {(data.perfiles || []).length === 0 ? (
              <p className="portal-empty">Sin competidores registrados.</p>
            ) : (
              (data.perfiles || []).map((p) => (
                <div key={p.id_perfil} className="portal-line-item">
                  <div className="portal-line-top">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="portal-line-name">{p.nombres} {p.apellidos}</div>
                      <div className="portal-line-meta">{p.documento_tipo} {p.documento_numero} · {p.grado} · {p.sexo}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={() => editarCompetidor(p)}>
                        Editar
                      </button>
                      <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 12, color: 'var(--red)' }} onClick={() => eliminarCompetidor(p.id_perfil)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {ac.aceptacion_bases_at && !rechazada && !data.inscripcion?.soloPago && (
            <div className="portal-card">
              {!showGrupoForm ? (
                <>
                  <h3 className="portal-section-title">Pareja y equipo poomsae</h3>
                  <p className="portal-section-lead">
                    Arma parejas reconocidas, freestyle (mixta) o equipos WT con competidores ya registrados en tu academia.
                  </p>
                  <button
                    type="button"
                    className="ios-btn ios-btn-primary portal-btn-block"
                    onClick={() => setShowGrupoForm(true)}
                    disabled={(data.perfiles || []).length < 2}
                  >
                    Armar pareja o equipo
                  </button>
                  {(data.perfiles || []).length < 2 && (
                    <p className="portal-field-hint" style={{ marginTop: 10 }}>
                      Necesitas al menos 2 competidores en el plantel.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="portal-section-title">Nueva pareja / equipo</h3>
                  <PortalGrupoForm
                    slug={slug}
                    perfiles={data.perfiles || []}
                    categorias={data.categorias || []}
                    anioCampeonato={anio}
                    disabled={data.inscripcion?.soloPago}
                    onCancel={() => setShowGrupoForm(false)}
                    onSuccess={async () => {
                      setShowGrupoForm(false)
                      await cargar()
                    }}
                  />
                </>
              )}
            </div>
          )}

          <div className="portal-card">
            <h3 className="portal-section-title">Plantel · {data.lineas?.length || 0}</h3>
            {(data.lineas || []).length === 0 ? (
              <p className="portal-empty">Sin inscripciones aún. Ve a la pestaña Inscribir.</p>
            ) : (
              data.lineas.map((l) => {
                const est = ESTADOS_LINEA[l.estado] || { label: l.estado, cls: 'badge-gray' }
                const catNombre = l.categoria?.nombre
                const miembrosCount = l.miembros?.length || 0
                return (
                  <div key={l.id_linea} className="portal-line-item">
                    <div className="portal-line-top">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="portal-line-name">
                          {modalidadLabel(l.modalidad)}
                          {esModalidadGrupo(l.modalidad) && miembrosCount > 0 && (
                            <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--label3)' }}>
                              ({miembrosCount} integrantes)
                            </span>
                          )}
                          <span className={`badge ${est.cls}`} style={{ marginLeft: 8, fontSize: 11 }}>{est.label}</span>
                          {l.dorsal_display && <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 700 }}>{l.dorsal_display}</span>}
                        </div>
                        {catNombre && <div className="portal-line-meta"><strong>{catNombre}</strong></div>}
                        <div className="portal-line-meta">
                          {l.miembros?.map((m) => `${m.perfil?.nombres} ${m.perfil?.apellidos}`).join(' · ')}
                        </div>
                        {l.peso_declarado && <div className="portal-line-meta">{l.peso_declarado} kg</div>}
                        <div className="portal-line-meta">S/ {l.precio_aplicado}</div>
                      </div>
                      {l.estado !== 'aprobado' && (
                        <button type="button" onClick={() => anularLinea(l.id_linea)} className="ios-btn ios-btn-ghost" style={{ fontSize: 12, color: 'var(--red)', flexShrink: 0 }}>
                          {l.estado === 'pagado' ? 'Anular (pagado)' : 'Anular'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <div className="portal-card">
          {!ac.aceptacion_bases_at || rechazada ? (
            <p className="portal-empty">Acepta las bases y completa al menos una inscripción para subir vouchers.</p>
          ) : (
            <>
              {ac.estado_aprobacion !== 'aprobada' && (
                <p className="portal-field-hint portal-field-hint--info" style={{ marginBottom: 14 }}>
                  Puedes pagar en cualquier momento. La aprobación de ACCTKD es independiente del pago.
                </p>
              )}
              {camp.cuenta_bancaria_info && (
                <div style={{ background: '#f8f8fa', padding: 16, borderRadius: 12, marginBottom: 18, fontSize: 13, border: '1px solid var(--separator)' }}>
                  <strong>Cuenta para depósito</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontFamily: 'inherit', wordBreak: 'break-word', fontSize: 13 }}>{camp.cuenta_bancaria_info}</pre>
                </div>
              )}
              <form onSubmit={subirVoucher}>
                <PortalField label="Monto (S/)">
                  <input className="ios-input" type="number" step="0.01" value={voucher.monto} onChange={(e) => setVoucher({ ...voucher, monto: e.target.value })} required />
                </PortalField>
                <PortalField label="Nº operación">
                  <input className="ios-input" value={voucher.operacion} onChange={(e) => setVoucher({ ...voucher, operacion: e.target.value })} />
                </PortalField>
                <PortalField label="Captura del voucher">
                  <input type="file" accept="image/*" onChange={(e) => setVoucher({ ...voucher, file: e.target.files?.[0] || null })} required />
                </PortalField>
                <button type="submit" className="ios-btn ios-btn-primary portal-btn-block">Subir comprobante</button>
              </form>
              {(data.comprobantes || []).length > 0 && (
                <>
                  <h4 className="portal-section-title" style={{ marginTop: 24, fontSize: 15 }}>Historial</h4>
                  {data.comprobantes.map((c) => (
                    <div key={c.id_comprobante} className="portal-line-meta" style={{ padding: '10px 0', borderBottom: '1px solid var(--separator)' }}>
                      S/ {c.monto_declarado} · {c.estado}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {aprobada && ac.estado_lista !== 'enviada' && (
        <button type="button" className="ios-btn ios-btn-primary portal-btn-block" onClick={enviarLista}>
          Enviar lista a ACCTKD
        </button>
      )}

      <a
        className="ios-btn ios-btn-secondary portal-btn-block"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        href={whatsappUrl(data.academia?.telefono || '51999999999', `Hola ACCTKD, ${data.academia?.nombre} — ${camp.nombre}`)}
        target="_blank"
        rel="noreferrer"
      >
        Contactar ACCTKD
      </a>

      <PortalBarraTotales total={ac.monto_total} pagado={ac.monto_asignado} pendiente={ac.saldo ?? ac.monto_total - ac.monto_asignado} />
    </PortalLayout>
  )
}
