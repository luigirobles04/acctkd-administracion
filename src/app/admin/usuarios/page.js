'use client'
import { adminFetch } from '@/lib/admin-client'
import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState from '@/components/ui/LoadingState'

const ROL_LABEL = {
  admin: { label: 'Administrador', color: '#7C3AED' },
  admin_campeonato: { label: 'Admin. Campeonato', color: '#0EA5E9' },
  organizador: { label: 'Organizador', color: '#F59E0B' },
  arbitro_mesa: { label: 'Árbitro / Mesa', color: '#DC2626' },
  maestro: { label: 'Maestro', color: '#16A34A' },
  representante: { label: 'Representante', color: '#64748B' },
  alumno: { label: 'Alumno', color: '#94A3B8' },
}

const FORM_INICIAL = { username: '', password: '', nombre_completo: '', email: '', id_rol: '' }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [copiado, setCopiado] = useState(null)

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin/usuarios')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setUsuarios(json.usuarios || [])
      setRoles(json.roles || [])
    } catch (e) {
      setError(e.message || 'No se pudo cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const rolesUtiles = useMemo(
    () => roles.filter((r) => ['admin_campeonato', 'arbitro_mesa', 'organizador'].includes(r.nombre)),
    [roles]
  )

  async function crear(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setForm(FORM_INICIAL)
      setShowForm(false)
      await cargar()
    } catch (e) {
      setError(e.message || 'No se pudo crear el usuario')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(u) {
    setBusy(u.id_usuario)
    try {
      await adminFetch(`/api/admin/usuarios/${u.id_usuario}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo }),
      })
      await cargar()
    } finally {
      setBusy(null)
    }
  }

  async function resetPassword(u) {
    const pass = prompt(`Nueva contraseña para "${u.username}" (mín. 6 caracteres):`)
    if (!pass) return
    setBusy(u.id_usuario)
    try {
      const res = await adminFetch(`/api/admin/usuarios/${u.id_usuario}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCopiado(u.id_usuario)
      setTimeout(() => setCopiado(null), 2500)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function eliminar(u) {
    if (!confirm(`¿Eliminar el usuario "${u.username}"?`)) return
    setBusy(u.id_usuario)
    try {
      await adminFetch(`/api/admin/usuarios/${u.id_usuario}`, { method: 'DELETE' })
      await cargar()
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminLayout
      title="Usuarios y Roles"
      subtitle={`${usuarios.length} cuentas · admin, admin de campeonato, árbitros y más`}
      actions={
        <button className="ios-btn ios-btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 14 }}
          onClick={() => setShowForm((v) => !v)}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
          <span className="hidden sm:inline">Nuevo usuario</span>
        </button>
      }>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {error && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
            color: '#DC2626', fontSize: 13, fontWeight: 500,
          }}>{error}</div>
        )}

        {showForm && (
          <form onSubmit={crear} className="ios-form-section" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Crear nuevo usuario</h3>
            <p style={{ fontSize: 12, color: 'var(--label3)', margin: 0 }}>
              Úsalo para dar acceso a un <strong>Administrador de Campeonato</strong> (mismos permisos que admin,
              acotado al módulo de campeonatos) o a un <strong>Árbitro/Operario de mesa</strong> (registra
              resultados en vivo desde /arbitro).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="ios-label">Usuario (login)</label>
                <input className="ios-input" required value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="ej. arbitro.cancha1" />
              </div>
              <div>
                <label className="ios-label">Contraseña</label>
                <input className="ios-input" required type="text" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="mín. 6 caracteres" />
              </div>
              <div>
                <label className="ios-label">Nombre completo</label>
                <input className="ios-input" value={form.nombre_completo}
                  onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                  placeholder="Nombre y apellido" />
              </div>
              <div>
                <label className="ios-label">Email (opcional)</label>
                <input className="ios-input" type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="ios-label">Rol</label>
                <select className="ios-input" required value={form.id_rol}
                  onChange={(e) => setForm((f) => ({ ...f, id_rol: e.target.value }))}>
                  <option value="">Selecciona un rol...</option>
                  {rolesUtiles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>
                      {ROL_LABEL[r.nombre]?.label || r.nombre}
                    </option>
                  ))}
                  {roles.filter((r) => !rolesUtiles.includes(r)).map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>{ROL_LABEL[r.nombre]?.label || r.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="ios-btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="ios-btn ios-btn-primary" disabled={saving}>
                {saving ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}

        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <LoadingState mensaje="Cargando usuarios…" />
          ) : usuarios.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">manage_accounts</span>
              <p style={{ fontSize: 15, color: 'var(--label2)', fontWeight: 500 }}>Aún no hay usuarios</p>
            </div>
          ) : (
            usuarios.map((u) => {
              const rolInfo = ROL_LABEL[u.rol?.nombre] || { label: u.rol?.nombre || '—', color: '#94A3B8' }
              return (
                <div key={u.id_usuario} className="ios-data-row" style={{ cursor: 'default' }}>
                  <div className="ios-avatar" style={{ background: rolInfo.color }}>
                    {(u.nombre_completo || u.username)[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                      {u.nombre_completo || u.username}
                      {!u.activo && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#DC2626' }}>INACTIVO</span>}
                    </p>
                    <p className="truncate-1" style={{ fontSize: 12, color: 'var(--label3)', marginTop: 2 }}>
                      @{u.username} · <span style={{ color: rolInfo.color, fontWeight: 600 }}>{rolInfo.label}</span>
                      {u.email ? ` · ${u.email}` : ''}
                    </p>
                    {copiado === u.id_usuario && (
                      <p style={{ fontSize: 11, color: '#16A34A', marginTop: 2, fontWeight: 600 }}>
                        ✓ Contraseña actualizada
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="ios-btn" style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                      disabled={busy === u.id_usuario} onClick={() => resetPassword(u)}>
                      Reset pass
                    </button>
                    <button className="ios-btn" style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                      disabled={busy === u.id_usuario} onClick={() => toggleActivo(u)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="ios-btn" style={{ height: 32, padding: '0 10px', fontSize: 12, color: '#DC2626' }}
                      disabled={busy === u.id_usuario} onClick={() => eliminar(u)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
