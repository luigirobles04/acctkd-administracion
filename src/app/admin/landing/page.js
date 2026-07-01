'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'

const CAMPOS = [
  { key: 'heroBadge', label: 'Etiqueta superior', tipo: 'text' },
  { key: 'heroTitulo', label: 'Título (línea 1)', tipo: 'text' },
  { key: 'heroTituloAccent', label: 'Título (línea 2, resaltado)', tipo: 'text' },
  { key: 'heroSubtitulo', label: 'Subtítulo / descripción', tipo: 'textarea' },
  { key: 'ctaPrimario', label: 'Botón principal', tipo: 'text' },
  { key: 'ctaSecundario', label: 'Botón secundario', tipo: 'text' },
  { key: 'ctaTitulo', label: 'Título de la sección final (CTA)', tipo: 'text' },
  { key: 'ctaTexto', label: 'Texto de la sección final (CTA)', tipo: 'textarea' },
]

export default function LandingCmsPage() {
  const [cfg, setCfg] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [subiendoGal, setSubiendoGal] = useState(false)
  const [galCaption, setGalCaption] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/landing', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCfg(json.config || {})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function guardar() {
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/landing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCfg(json.config)
      setMsg('Cambios guardados. Ya se ven en el landing público.')
      setTimeout(() => setMsg(''), 3500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function subirGaleria(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoGal(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file, file.name || 'galeria.jpg')
      fd.append('slot', 'galeria')
      fd.append('caption', galCaption || 'FestCup')
      const res = await fetch('/api/landing/imagen', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCfg(json.config)
      setGalCaption('')
      setMsg('Foto añadida a la galería del landing.')
      setTimeout(() => setMsg(''), 3500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubiendoGal(false)
      e.target.value = ''
    }
  }

  function quitarGaleria(idx) {
    setCfg((p) => ({ ...p, galeria: (p.galeria || []).filter((_, i) => i !== idx) }))
  }

  const galeria = cfg.galeria || []

  async function subirImagen(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file, file.name || 'hero.jpg')
      fd.append('slot', 'hero')
      const res = await fetch('/api/landing/imagen', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCfg(json.config)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  return (
    <AdminLayout
      title="Landing Page"
      subtitle="Edita los textos e imagen principal de la página pública"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/" target="_blank" rel="noreferrer" className="ios-btn" style={{ height: 38, padding: '0 14px', fontSize: 13 }}>
            Ver landing ↗
          </a>
          <button className="ios-btn ios-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 14 }} disabled={saving} onClick={guardar}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      }>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}
        {msg && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: '#16A34A', fontSize: 13, fontWeight: 500 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--label3)' }}>Cargando...</p>
        ) : (
          <>
            <div className="ios-form-section" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 120, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cfg.heroImagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/fotos/competidor?path=${encodeURIComponent(cfg.heroImagen)}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#64748b', fontSize: 11 }}>Flyer por defecto</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Imagen principal (hero)</p>
                <p style={{ fontSize: 12, color: 'var(--label3)', margin: '4px 0 10px' }}>
                  El flyer o foto destacada que se ve al entrar al landing público.
                </p>
                <label className="ios-btn" style={{ height: 34, padding: '0 12px', fontSize: 12, cursor: 'pointer', display: 'inline-flex' }}>
                  {subiendo ? 'Subiendo...' : 'Cambiar imagen'}
                  <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendo} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="ios-form-section" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Galería FestCup</p>
              <p style={{ fontSize: 12, color: 'var(--label3)', margin: '0 0 12px' }}>
                Sube fotos de ediciones pasadas. Si no hay fotos subidas, se muestran las imágenes por defecto del landing.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  className="ios-input"
                  placeholder="Descripción de la foto (ej. FestCup 2024 — Podio)"
                  value={galCaption}
                  onChange={(e) => setGalCaption(e.target.value)}
                  style={{ flex: 1, minWidth: 180 }}
                />
                <label className="ios-btn ios-btn-primary" style={{ height: 38, padding: '0 14px', fontSize: 13, cursor: 'pointer', display: 'inline-flex' }}>
                  {subiendoGal ? 'Subiendo...' : '+ Añadir foto'}
                  <input type="file" accept="image/*" onChange={subirGaleria} disabled={subiendoGal} style={{ display: 'none' }} />
                </label>
              </div>
              {galeria.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {galeria.map((g, i) => (
                    <div key={g.path || i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#111827' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/fotos/competidor?path=${encodeURIComponent(g.path)}`}
                        alt={g.alt || g.caption}
                        style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--label2)' }}>{g.caption}</div>
                      <button
                        type="button"
                        onClick={() => quitarGaleria(i)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: 12, cursor: 'pointer' }}
                        title="Quitar (guardar cambios después)"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ios-form-section" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CAMPOS.map((c) => (
                <div key={c.key}>
                  <label className="ios-label">{c.label}</label>
                  {c.tipo === 'textarea' ? (
                    <textarea
                      className="ios-input"
                      rows={3}
                      style={{ height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical' }}
                      value={cfg[c.key] || ''}
                      onChange={(e) => setCfg((p) => ({ ...p, [c.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="ios-input"
                      value={cfg[c.key] || ''}
                      onChange={(e) => setCfg((p) => ({ ...p, [c.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
