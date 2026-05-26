'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PortalLayout, { PortalBarraTotales, PortalTabs } from '@/components/campeonatos/PortalLayout'
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
import { categoriasValidas } from '@/lib/campeonato/validar-categoria'
import { validarFotoCarnet } from '@/lib/campeonato/validar-foto'
import { portalFetch } from '@/lib/portal-client'
import { getCurrentUser, isRepresentante } from '@/lib/services/auth.service'

const TABS = [
  { id: 'inscribir', label: '+ Inscribir' },
  { id: 'plantel', label: 'Plantel' },
  { id: 'pagos', label: 'Pagos' },
]

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

const STEPS = ['Documento', 'Datos', 'Modalidad', 'Confirmar']

export default function PortalCampeonatoPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('inscribir')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [perfil, setPerfil] = useState(FORM)
  const [modalidad, setModalidad] = useState('kyorugi_individual')
  const [peso, setPeso] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [tipoOficial, setTipoOficial] = useState('coach')
  const [voucher, setVoucher] = useState({ monto: '', operacion: '', file: null })
  const [submitting, setSubmitting] = useState(false)

  const cargar = useCallback(async () => {
    const user = getCurrentUser()
    if (!user || !isRepresentante(user)) {
      router.replace('/login')
      return
    }
    try {
      const res = await portalFetch(`/api/portal/campeonato/${slug}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    cargar()
  }, [cargar])

  const anio = data?.campeonato?.anioCampeonato || new Date().getFullYear()
  const catsKyorugi = useMemo(
    () => categoriasValidas(
      (data?.categorias || []).filter((c) => c.modalidad === 'kyorugi'),
      perfil,
      anio,
      peso
    ),
    [data?.categorias, perfil, anio, peso]
  )

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
    fd.append('file', perfil._fotoFile)
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
      const fotoUrl = await subirFoto()
      const p = await guardarPerfil(fotoUrl)
      const res = await portalFetch(`/api/portal/campeonato/${slug}`, {
        method: 'POST',
        body: JSON.stringify({
          accion: 'crear_linea',
          modalidad,
          idPerfiles: [p.id_perfil],
          idCategoria: modalidad === 'kyorugi_individual' ? Number(idCategoria) || null : null,
          pesoDeclarado: modalidad === 'kyorugi_individual' ? Number(peso) : null,
          tipoOficial: modalidad === 'oficial' ? tipoOficial : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPerfil(FORM)
      setStep(0)
      setPeso('')
      setIdCategoria('')
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
    await portalFetch(`/api/portal/campeonato/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ accion: 'anular_linea', idLinea }),
    })
    cargar()
  }

  async function subirVoucher(e) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('file', voucher.file)
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
      <PortalLayout titulo="Cargando…">
        <div className="ios-card" style={{ padding: 32, textAlign: 'center' }}>Un momento…</div>
      </PortalLayout>
    )
  }

  if (error && !data) {
    return (
      <PortalLayout titulo="Error">
        <div className="ios-card" style={{ padding: 20 }}>
          <p style={{ color: 'var(--red)' }}>{error}</p>
          <Link href="/portal" className="ios-btn ios-btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }}>Mis campeonatos</Link>
        </div>
      </PortalLayout>
    )
  }

  const ac = data.academiaCampeonato
  const camp = data.campeonato
  const aprobada = ac.estado_aprobacion === 'aprobada'
  const rechazada = ac.estado_aprobacion === 'rechazada'
  const edad = edadWT(perfil.fecha_nacimiento, anio)

  return (
    <PortalLayout titulo={camp.nombre} subtitulo="Portal de inscripción" academiaNombre={data.academia?.nombre}>
      <Link href="/portal" style={{ fontSize: 13, color: 'var(--red)', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>
        ← Mis campeonatos
      </Link>

      {/* Estado academia */}
      <div className="ios-card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {rechazada ? (
          <span className="badge badge-red">Rechazada: {ac.motivo_rechazo || 'Contacta ACCTKD'}</span>
        ) : aprobada ? (
          <span className="badge badge-green">Academia aprobada — puedes enviar lista y pagar</span>
        ) : (
          <span className="badge badge-yellow">Pendiente de aprobación — puedes armar tu lista</span>
        )}
        {ac.estado_lista === 'enviada' && <span className="badge badge-blue">Lista enviada</span>}
      </div>

      {!ac.aceptacion_bases_at && (
        <div className="ios-card" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{TEXTO_LEGAL_BASES}</p>
          <button type="button" className="ios-btn ios-btn-primary" onClick={aceptarBases}>
            Acepto las bases y continúo
          </button>
        </div>
      )}

      <PortalTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'inscribir' && ac.aceptacion_bases_at && !rechazada && (
        <div className="ios-card" style={{ padding: 16 }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: i <= step ? 'var(--red)' : 'var(--separator)',
                  marginBottom: 6,
                }} />
                <span style={{ fontSize: 10, color: i <= step ? 'var(--red)' : 'var(--label3)', fontWeight: i === step ? 700 : 400 }}>{s}</span>
              </div>
            ))}
          </div>

          {step === 0 && (
            <>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Buscar competidor</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="ios-input" style={{ width: 100 }} value={perfil.documento_tipo} onChange={(e) => setPerfil({ ...perfil, documento_tipo: e.target.value })}>
                  {DOCUMENTO_TIPOS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <input className="ios-input" style={{ flex: 1 }} placeholder="Nº documento" value={perfil.documento_numero} onChange={(e) => setPerfil({ ...perfil, documento_numero: e.target.value })} />
                <button type="button" className="ios-btn ios-btn-secondary" onClick={buscarDocumento}>Buscar</button>
              </div>
              <button type="button" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={!perfil.documento_numero} onClick={() => setStep(1)}>
                Continuar
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Datos del competidor</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="ios-input" placeholder="Nombres" value={perfil.nombres} onChange={(e) => setPerfil({ ...perfil, nombres: e.target.value })} required />
                <input className="ios-input" placeholder="Apellidos" value={perfil.apellidos} onChange={(e) => setPerfil({ ...perfil, apellidos: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <select className="ios-input" value={perfil.sexo} onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value })}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                <input className="ios-input" type="date" value={perfil.fecha_nacimiento} onChange={(e) => setPerfil({ ...perfil, fecha_nacimiento: e.target.value })} />
                <select className="ios-input" value={perfil.grado} onChange={(e) => setPerfil({ ...perfil, grado: e.target.value })}>
                  {GRADOS_KUP_DAN.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {edad != null && <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 8 }}>Edad WT al 31-dic-{anio}: <strong>{edad} años</strong></p>}
              <label className="ios-label" style={{ marginTop: 12 }}>Foto carnet</label>
              <input type="file" accept="image/jpeg,image/png" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const val = await validarFotoCarnet(file)
                if (!val.ok) { alert(val.error); return }
                setPerfil((p) => ({ ...p, foto_url: val.preview, _fotoFile: file }))
              }} />
              {perfil.foto_url && <img src={perfil.foto_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, marginTop: 8 }} />}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(0)}>Atrás</button>
                <button type="button" className="ios-btn ios-btn-primary" style={{ flex: 1 }} disabled={!perfil.nombres || !perfil.apellidos || !perfil.fecha_nacimiento} onClick={() => setStep(2)}>Continuar</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Modalidad y categoría</h3>
              <select className="ios-input" value={modalidad} onChange={(e) => { setModalidad(e.target.value); setIdCategoria('') }}>
                {Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                <option value="oficial">Oficial (gratis, máx. 3)</option>
              </select>

              {modalidad === 'oficial' && (
                <select className="ios-input" style={{ marginTop: 8 }} value={tipoOficial} onChange={(e) => setTipoOficial(e.target.value)}>
                  {ROLES_OFICIAL.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              )}

              {modalidad === 'kyorugi_individual' && (
                <>
                  <label className="ios-label" style={{ marginTop: 12 }}>Peso declarado (kg)</label>
                  <input className="ios-input" type="number" step="0.1" value={peso} onChange={(e) => { setPeso(e.target.value); setIdCategoria('') }} placeholder="Ej. 45.5" />
                  <label className="ios-label" style={{ marginTop: 12 }}>Categoría (filtrada por edad, sexo y peso)</label>
                  {catsKyorugi.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--red)', marginTop: 8 }}>No hay categorías válidas. Revisa edad, sexo o peso.</p>
                  ) : (
                    <select className="ios-input" value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}>
                      <option value="">Selecciona categoría</option>
                      {catsKyorugi.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                    </select>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(1)}>Atrás</button>
                <button
                  type="button"
                  className="ios-btn ios-btn-primary"
                  style={{ flex: 1 }}
                  disabled={modalidad === 'kyorugi_individual' && (!peso || !idCategoria)}
                  onClick={() => setStep(3)}
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Confirmar inscripción</h3>
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, fontSize: 14 }}>
                <p><strong>{perfil.nombres} {perfil.apellidos}</strong></p>
                <p style={{ color: 'var(--label3)', marginTop: 4 }}>{perfil.documento_tipo} {perfil.documento_numero} · {edad} años · {perfil.grado}</p>
                <p style={{ marginTop: 8 }}>{MODALIDADES[modalidad]?.label || (modalidad === 'oficial' ? `Oficial (${tipoOficial})` : modalidad)}</p>
                {idCategoria && <p style={{ color: 'var(--label3)' }}>{catsKyorugi.find((c) => String(c.id_categoria) === idCategoria)?.nombre}</p>}
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 10 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setStep(2)}>Atrás</button>
                <button type="button" className="ios-btn ios-btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={confirmarInscripcion}>
                  {submitting ? 'Inscribiendo…' : 'Confirmar inscripción'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'plantel' && (
        <div className="ios-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Plantel ({data.lineas?.length || 0})</h3>
          {(data.lineas || []).length === 0 ? (
            <p style={{ color: 'var(--label3)', fontSize: 14 }}>Sin inscripciones aún. Ve a + Inscribir.</p>
          ) : (
            data.lineas.map((l) => {
              const est = ESTADOS_LINEA[l.estado] || { label: l.estado, cls: 'badge-gray' }
              return (
                <div key={l.id_linea} style={{ borderBottom: '1px solid var(--separator)', padding: '12px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{MODALIDADES[l.modalidad]?.label || l.modalidad}</strong>
                      <span className={`badge ${est.cls}`} style={{ marginLeft: 8, fontSize: 11 }}>{est.label}</span>
                      {l.dorsal_display && <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 700 }}>{l.dorsal_display}</span>}
                      <div style={{ fontSize: 13, color: 'var(--label3)', marginTop: 4 }}>
                        {l.miembros?.map((m) => `${m.perfil?.nombres} ${m.perfil?.apellidos}`).join(', ')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--label3)' }}>S/ {l.precio_aplicado}</div>
                    </div>
                    {l.estado !== 'aprobado' && (
                      <button type="button" onClick={() => anularLinea(l.id_linea)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Anular</button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'pagos' && (
        <div className="ios-card" style={{ padding: 16 }}>
          {!aprobada ? (
            <p style={{ fontSize: 14, color: 'var(--label3)' }}>Los pagos se habilitan cuando ACCTKD apruebe tu academia.</p>
          ) : (
            <>
              {camp.cuenta_bancaria_info && (
                <div style={{ background: 'var(--red-50)', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                  <strong>Cuenta para depósito</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontFamily: 'inherit' }}>{camp.cuenta_bancaria_info}</pre>
                </div>
              )}
              <form onSubmit={subirVoucher}>
                <label className="ios-label">Monto (S/)</label>
                <input className="ios-input" type="number" step="0.01" value={voucher.monto} onChange={(e) => setVoucher({ ...voucher, monto: e.target.value })} required />
                <label className="ios-label" style={{ marginTop: 8 }}>Nº operación</label>
                <input className="ios-input" value={voucher.operacion} onChange={(e) => setVoucher({ ...voucher, operacion: e.target.value })} />
                <label className="ios-label" style={{ marginTop: 8 }}>Captura del voucher</label>
                <input type="file" accept="image/*" onChange={(e) => setVoucher({ ...voucher, file: e.target.files?.[0] })} required />
                <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>Subir comprobante</button>
              </form>
              <h4 style={{ marginTop: 20, marginBottom: 8 }}>Historial</h4>
              {(data.comprobantes || []).map((c) => (
                <div key={c.id_comprobante} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--separator)' }}>
                  S/ {c.monto_declarado} · {c.estado}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {aprobada && ac.estado_lista !== 'enviada' && (
        <button type="button" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={enviarLista}>
          Enviar lista a ACCTKD
        </button>
      )}

      <a
        className="ios-btn ios-btn-secondary"
        style={{ width: '100%', marginTop: 10, textAlign: 'center' }}
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
