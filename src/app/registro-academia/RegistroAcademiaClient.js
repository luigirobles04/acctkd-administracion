'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { registerAcademia, isRepresentante } from '@/lib/services/auth.service'

export default function RegistroAcademiaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSlug = searchParams.get('slug') || ''

  const [campeonatos, setCampeonatos] = useState([])
  const [form, setForm] = useState({
    slug: preSlug,
    nombre_academia: '',
    telefono: '',
    ciudad: '',
    representante_nombre: '',
    representante_dni: '',
    password: '',
    password_confirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/registro-academia')
      .then((r) => r.json())
      .then((j) => {
        setCampeonatos(j.campeonatos || [])
        if (!preSlug && j.campeonatos?.[0]) {
          setForm((f) => ({ ...f, slug: j.campeonatos[0].slug }))
        }
      })
      .catch(() => {})
  }, [preSlug])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await registerAcademia(form)
      if (isRepresentante(result.user)) {
        router.push(`/portal/${result.campeonato.slug}`)
      } else {
        router.push('/portal')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <Link href="/login" className="portal-topbar-brand">
            <Image src="/logo-dark.png" alt="ACCTKD" width={28} height={28} className="portal-topbar-logo" />
            <span>ACCTKD</span>
          </Link>
        </div>
      </header>

      <div className="portal-page-head">
        <div className="portal-page-head-inner">
          <Link href="/login" className="portal-hero-back">← Volver al login</Link>
          <h1 className="portal-page-title">Registro de academia</h1>
          <p className="portal-page-sub">
            Crea tu cuenta y arma tu lista. ACCTKD aprueba antes de enviar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="portal-main portal-register-form">
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="ios-label">Campeonato</label>
            <select className="ios-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} required>
              <option value="">Selecciona un campeonato</option>
              {campeonatos.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nombre} · {c.ciudad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-label">Nombre de la academia</label>
            <input className="ios-input" value={form.nombre_academia} onChange={(e) => set('nombre_academia', e.target.value)} required placeholder="Ej. Guerreros Trujillo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="ios-label">Teléfono</label>
              <input className="ios-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} required placeholder="987654321" />
            </div>
            <div>
              <label className="ios-label">Ciudad</label>
              <input className="ios-input" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} required placeholder="Trujillo" />
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--separator)', margin: '4px 0' }} />
          <div>
            <label className="ios-label">DNI del representante (será tu usuario)</label>
            <input className="ios-input" inputMode="numeric" value={form.representante_dni} onChange={(e) => set('representante_dni', e.target.value.replace(/\D/g, ''))} required placeholder="12345678" maxLength={12} />
          </div>
          <div>
            <label className="ios-label">Nombre del representante</label>
            <input className="ios-input" value={form.representante_nombre} onChange={(e) => set('representante_nombre', e.target.value)} required placeholder="Nombre completo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="ios-label">Contraseña</label>
              <input className="ios-input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} placeholder="Mín. 8 caracteres" />
            </div>
            <div>
              <label className="ios-label">Confirmar</label>
              <input className="ios-input" type="password" value={form.password_confirm} onChange={(e) => set('password_confirm', e.target.value)} required />
            </div>
          </div>
          {error && (
            <div style={{ background: 'var(--red-50)', color: 'var(--red-dark)', padding: 12, borderRadius: 10, fontSize: 13 }}>{error}</div>
          )}
          <button type="submit" className="ios-btn ios-btn-primary" disabled={loading} style={{ width: '100%', height: 48, marginTop: 4 }}>
            {loading ? 'Registrando…' : 'Crear cuenta y continuar'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--label3)', textAlign: 'center', lineHeight: 1.5 }}>
            Podrás inscribir competidores de inmediato. El envío de lista y pagos se habilita tras la aprobación de ACCTKD.
          </p>
        </div>
      </form>
    </div>
  )
}
