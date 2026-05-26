'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PortalLayout from '@/components/campeonatos/PortalLayout'
import { TEXTO_LEGAL_BASES } from '@/lib/campeonato/constants'
import { registerServiceWorker } from '@/lib/offline/queue'

export default function InscripcionGenericaPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [modo, setModo] = useState('elegir')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [telRecuperar, setTelRecuperar] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    registerServiceWorker()
    fetch(`/api/inscripcion/campeonato/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  async function registrar(e) {
    e.preventDefault()
    setError(null)
    const res = await fetch(`/api/inscripcion/campeonato/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'registrar', nombre, telefono, confirmarNombre: confirmar }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
      return
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`acctkd_token_${slug}`, json.token)
    }
    router.push(json.linkPropio)
  }

  async function recuperar(e) {
    e.preventDefault()
    setError(null)
    const res = await fetch(`/api/inscripcion/campeonato/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'recuperar', telefono: telRecuperar }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
      return
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`acctkd_token_${slug}`, json.token)
    }
    router.push(`/inscripcion/a/${json.token}`)
  }

  if (loading) {
    return (
      <PortalLayout titulo="Inscripción">
        <div className="ios-card" style={{ padding: 32, textAlign: 'center' }}>Cargando…</div>
      </PortalLayout>
    )
  }

  const camp = data?.campeonato

  return (
    <PortalLayout titulo={camp?.nombre || 'Inscripción'} subtitulo="Registro de academias">
      {error && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 12, background: 'rgba(255,59,48,0.12)', color: '#C0000A', fontSize: 14 }}>
          {error}
        </div>
      )}

      {!data?.inscripcion?.ok && (
        <div className="ios-card" style={{ padding: 20 }}>
          <p>{data?.inscripcion?.reason || 'Inscripciones no disponibles'}</p>
        </div>
      )}

      {data?.inscripcion?.ok && modo === 'elegir' && (
        <div className="ios-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--label2)' }}>
            ¿Primera vez o ya tienes inscripción?
          </p>
          <button type="button" className="ios-btn ios-btn-primary" onClick={() => setModo('nueva')}>
            Registrar mi academia
          </button>
          <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setModo('recuperar')}>
            Recuperar mi link (teléfono)
          </button>
        </div>
      )}

      {modo === 'nueva' && (
        <form className="ios-card" style={{ padding: 20 }} onSubmit={registrar}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Nueva academia</h2>
          <label className="ios-label">Nombre de la academia</label>
          <input className="ios-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <label className="ios-label" style={{ marginTop: 12 }}>Teléfono coach (+51)</label>
          <input className="ios-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="999 888 777" required />
          <label style={{ display: 'flex', gap: 8, marginTop: 16, fontSize: 13, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} />
            <span>Confirmo que somos la academia «{nombre || '…'}»</span>
          </label>
          <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 12 }}>{TEXTO_LEGAL_BASES}</p>
          <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={!confirmar}>
            Crear inscripción
          </button>
        </form>
      )}

      {modo === 'recuperar' && (
        <form className="ios-card" style={{ padding: 20 }} onSubmit={recuperar}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Recuperar acceso</h2>
          <label className="ios-label">Teléfono registrado</label>
          <input className="ios-input" value={telRecuperar} onChange={(e) => setTelRecuperar(e.target.value)} required />
          <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>
            Enviar a mi portal
          </button>
        </form>
      )}

      {camp?.bases_pdf_url && (
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <a href={camp.bases_pdf_url} target="_blank" rel="noreferrer" style={{ color: 'var(--red)', fontSize: 14 }}>
            Ver bases completas (PDF)
          </a>
        </p>
      )}
    </PortalLayout>
  )
}
