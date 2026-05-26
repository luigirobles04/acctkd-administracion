'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PortalLayout, { PortalBarraTotales, PortalTabs } from '@/components/campeonatos/PortalLayout'
import {
  MODALIDADES,
  GRADOS_KUP_DAN,
  DOCUMENTO_TIPOS,
  TEXTO_LEGAL_BASES,
  ROLES_OFICIAL,
  whatsappUrl,
} from '@/lib/campeonato/constants'
import { validarFotoCarnet } from '@/lib/campeonato/validar-foto'
import { registerServiceWorker, encolarOffline } from '@/lib/offline/queue'

const TABS = [
  { id: 'competidores', label: 'Competidores' },
  { id: 'parejas', label: 'Parejas' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'oficiales', label: 'Oficiales' },
  { id: 'pagos', label: 'Pagos' },
]

const FORM_PERFIL = {
  documento_tipo: 'DNI',
  documento_numero: '',
  nombres: '',
  apellidos: '',
  sexo: 'M',
  fecha_nacimiento: '',
  grado: '10º kup',
  foto_url: '',
}

export default function PortalAcademiaPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('competidores')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [perfil, setPerfil] = useState(FORM_PERFIL)
  const [buscandoDoc, setBuscandoDoc] = useState(false)
  const [modalidad, setModalidad] = useState('kyorugi_individual')
  const [aceptaBases, setAceptaBases] = useState(false)
  const [voucher, setVoucher] = useState({ monto: '', operacion: '', file: null })

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/inscripcion/academia/${token}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setAceptaBases(!!json.academiaCampeonato?.aceptacion_bases_at)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    registerServiceWorker()
    if (typeof sessionStorage !== 'undefined' && data?.campeonato?.slug) {
      sessionStorage.setItem(`acctkd_token_${data.campeonato.slug}`, token)
    }
    cargar()
  }, [cargar, token, data?.campeonato?.slug])

  async function buscarDocumento() {
    if (!perfil.documento_numero) return
    setBuscandoDoc(true)
    const q = new URLSearchParams({
      documento: perfil.documento_numero,
      tipo: perfil.documento_tipo,
    })
    const res = await fetch(`/api/inscripcion/academia/${token}/perfil?${q}`)
    const json = await res.json()
    if (json.perfil) {
      setPerfil({ ...FORM_PERFIL, ...json.perfil, foto_url: json.perfil.foto_url || '' })
    }
    setBuscandoDoc(false)
  }

  async function guardarPerfil({ fotoUrl } = {}) {
    setError(null)
    const payload = { ...perfil }
    if (fotoUrl) payload.foto_url = fotoUrl
    delete payload._fotoFile
    try {
      const res = await fetch(`/api/inscripcion/academia/${token}/perfil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPerfil({ ...FORM_PERFIL, ...json.perfil })
      return json.perfil
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  async function onFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const val = await validarFotoCarnet(file)
    if (!val.ok) {
      alert(val.error)
      return
    }
    // Preview inmediato
    setPerfil((p) => ({ ...p, foto_url: val.preview, _fotoFile: file }))
  }

  async function subirFotoSiHay() {
    if (!perfil._fotoFile) return perfil.foto_url
    const fd = new FormData()
    fd.append('file', perfil._fotoFile)
    const res = await fetch(`/api/inscripcion/academia/${token}/foto`, { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Error subiendo foto')
    return json.url
  }

  async function inscribirLinea(idPerfiles, mod, extra = {}) {
    if (!aceptaBases) {
      alert('Acepta las bases primero')
      return
    }
    const res = await fetch(`/api/inscripcion/academia/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'crear_linea',
        modalidad: mod,
        idPerfiles,
        ...extra,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      if (!navigator.onLine) {
        await encolarOffline('crear_linea', { modalidad: mod, idPerfiles, ...extra })
        alert('Sin conexión. Guardado en cola offline.')
      } else {
        alert(json.error)
      }
      return
    }
    await cargar()
  }

  async function aceptarBases() {
    const slug = data?.campeonato?.slug
    await fetch(`/api/inscripcion/campeonato/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aceptar_bases', token }),
    })
    setAceptaBases(true)
    cargar()
  }

  async function notificarEnvio() {
    const res = await fetch(`/api/inscripcion/academia/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'notificar' }),
    })
    const json = await res.json()
    alert(json.message || (json.ok ? 'Lista notificada a ACCTKD' : 'Sin cambios'))
    cargar()
  }

  async function subirVoucher(e) {
    e.preventDefault()
    if (!voucher.monto || !voucher.file) return
    const fd = new FormData()
    fd.append('file', voucher.file)
    fd.append('monto_declarado', voucher.monto)
    fd.append('numero_operacion', voucher.operacion)
    const res = await fetch(`/api/inscripcion/academia/${token}/comprobante`, {
      method: 'POST',
      body: fd,
    })
    const json = await res.json()
    if (!res.ok) alert(json.error)
    else {
      setVoucher({ monto: '', operacion: '', file: null })
      cargar()
    }
  }

  if (loading) {
    return (
      <PortalLayout titulo="Portal academia">
        <div className="ios-card" style={{ padding: 32, textAlign: 'center' }}>Cargando plantel…</div>
      </PortalLayout>
    )
  }

  if (error && !data) {
    return (
      <PortalLayout titulo="Error">
        <div className="ios-card" style={{ padding: 20, color: '#C0000A' }}>{error}</div>
      </PortalLayout>
    )
  }

  const ac = data?.academiaCampeonato
  const camp = data?.campeonato
  const perfilesUsados = new Set()
  ;(data?.lineas || []).forEach((l) => l.miembros?.forEach((m) => perfilesUsados.add(m.id_perfil)))

  return (
    <PortalLayout
      titulo={camp?.nombre}
      subtitulo="Portal de inscripción"
      academiaNombre={data?.academia?.nombre}
    >
      {!aceptaBases && (
        <div className="ios-card" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, marginBottom: 12 }}>{TEXTO_LEGAL_BASES}</p>
          <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 12 }}>
            <input type="checkbox" checked={aceptaBases} onChange={() => {}} disabled />
            <span>He leído y acepto las bases del campeonato</span>
          </label>
          <button type="button" className="ios-btn ios-btn-primary" onClick={aceptarBases}>
            Aceptar y continuar
          </button>
          {camp?.bases_pdf_url && (
            <a href={camp.bases_pdf_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 10, color: 'var(--red)', fontSize: 13 }}>
              Ver bases (PDF)
            </a>
          )}
        </div>
      )}

      <PortalTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'competidores' && (
        <>
          <form
            className="ios-card"
            style={{ padding: 16, marginBottom: 16 }}
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              try {
                const fotoUrl = await subirFotoSiHay()
                setPerfil((prev) => ({ ...prev, foto_url: fotoUrl, _fotoFile: null }))
                const p = await guardarPerfil({ ...e, fotoUrl })
                if (p) await inscribirLinea([p.id_perfil], modalidad)
              } catch (err) {
                setError(err.message)
              }
            }}
          >
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Nuevo competidor</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select className="ios-input" value={perfil.documento_tipo} onChange={(e) => setPerfil({ ...perfil, documento_tipo: e.target.value })} style={{ width: 120 }}>
                {DOCUMENTO_TIPOS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <input
                className="ios-input"
                placeholder="Nº documento"
                value={perfil.documento_numero}
                onChange={(e) => setPerfil({ ...perfil, documento_numero: e.target.value })}
                onBlur={buscarDocumento}
                style={{ flex: 1 }}
              />
              <button type="button" className="ios-btn ios-btn-secondary" onClick={buscarDocumento} disabled={buscandoDoc}>
                Buscar
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input className="ios-input" placeholder="Nombres" value={perfil.nombres} onChange={(e) => setPerfil({ ...perfil, nombres: e.target.value })} required />
              <input className="ios-input" placeholder="Apellidos" value={perfil.apellidos} onChange={(e) => setPerfil({ ...perfil, apellidos: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <select className="ios-input" value={perfil.sexo} onChange={(e) => setPerfil({ ...perfil, sexo: e.target.value })}>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
              <input className="ios-input" type="date" value={perfil.fecha_nacimiento} onChange={(e) => setPerfil({ ...perfil, fecha_nacimiento: e.target.value })} required />
              <select className="ios-input" value={perfil.grado} onChange={(e) => setPerfil({ ...perfil, grado: e.target.value })}>
                {GRADOS_KUP_DAN.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <label className="ios-label" style={{ marginTop: 12 }}>Foto carnet (fondo blanco)</label>
            <input type="file" accept="image/jpeg,image/png" onChange={onFotoChange} />
            {perfil.foto_url && (
              <img src={perfil.foto_url} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
            )}
            <label className="ios-label" style={{ marginTop: 12 }}>Modalidad</label>
            <select className="ios-input" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
              {Object.entries(MODALIDADES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>
              Guardar e inscribir
            </button>
          </form>

          <div className="ios-card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Plantel ({data?.lineas?.length || 0} líneas)</h3>
            {(data?.lineas || []).map((l) => (
              <div key={l.id_linea} style={{ borderBottom: '1px solid var(--separator)', padding: '10px 0', fontSize: 14 }}>
                <strong>{MODALIDADES[l.modalidad]?.label || l.modalidad}</strong>
                <span className={`badge ${l.estado === 'aprobado' ? 'badge-green' : 'badge-yellow'}`} style={{ marginLeft: 8, fontSize: 11 }}>
                  {l.estado}
                </span>
                {l.dorsal_display && <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 700 }}>{l.dorsal_display}</span>}
                <div style={{ color: 'var(--label3)', fontSize: 12, marginTop: 4 }}>
                  {l.miembros?.map((m) => `${m.perfil?.nombres} ${m.perfil?.apellidos}`).join(', ')}
                  · S/ {l.precio_aplicado}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'pagos' && (
        <div className="ios-card" style={{ padding: 16 }}>
          {camp?.cuenta_bancaria_info && (
            <div style={{ background: 'var(--red-50)', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              <strong>Depósito:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontFamily: 'inherit' }}>{camp.cuenta_bancaria_info}</pre>
            </div>
          )}
          <form onSubmit={subirVoucher}>
            <label className="ios-label">Monto depositado (S/)</label>
            <input className="ios-input" type="number" step="0.01" value={voucher.monto} onChange={(e) => setVoucher({ ...voucher, monto: e.target.value })} required />
            <label className="ios-label" style={{ marginTop: 8 }}>Nº operación</label>
            <input className="ios-input" value={voucher.operacion} onChange={(e) => setVoucher({ ...voucher, operacion: e.target.value })} />
            <label className="ios-label" style={{ marginTop: 8 }}>Captura voucher</label>
            <input type="file" accept="image/*" onChange={(e) => setVoucher({ ...voucher, file: e.target.files?.[0] })} required />
            <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>Subir comprobante</button>
          </form>
          <h4 style={{ marginTop: 20, marginBottom: 8 }}>Historial</h4>
          {(data?.comprobantes || []).map((c) => (
            <div key={c.id_comprobante} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--separator)' }}>
              S/ {c.monto_declarado} · {c.estado} · {c.numero_operacion || '—'}
            </div>
          ))}
        </div>
      )}

      {(tab === 'parejas' || tab === 'equipos' || tab === 'oficiales') && (
        <div className="ios-card" style={{ padding: 16, color: 'var(--label2)', fontSize: 14 }}>
          Sección <strong>{tab}</strong>: selecciona perfiles ya registrados en Competidores y agrupa desde admin o próxima iteración del formulario de grupo.
          <p style={{ marginTop: 12, fontSize: 13 }}>Usa el tab Competidores para registrar perfiles; las parejas/equipos se arman vinculando 2 o 3 perfiles.</p>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="ios-btn ios-btn-primary" onClick={notificarEnvio}>
          Notificar envío a ACCTKD
        </button>
        <a
          className="ios-btn ios-btn-secondary"
          href={whatsappUrl(
            data?.academia?.telefono || '51999999999',
            `Hola ACCTKD, academia ${data?.academia?.nombre} actualizó inscripción en ${camp?.nombre}.`
          )}
          target="_blank"
          rel="noreferrer"
        >
          Avisar por WhatsApp
        </a>
      </div>

      {ac && (
        <PortalBarraTotales
          total={ac.monto_total}
          pagado={ac.monto_asignado}
          pendiente={ac.saldo ?? ac.monto_total - ac.monto_asignado}
        />
      )}
    </PortalLayout>
  )
}
