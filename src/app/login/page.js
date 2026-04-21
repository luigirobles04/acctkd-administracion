'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, isAdmin, isMaestro } from '@/lib/services/auth.service'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      if (isAdmin(user)) router.push('/admin/dashboard')
      else if (isMaestro(user)) router.push('/maestro/clases')
      else router.push('/alumno/dashboard')
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-5"
      style={{ background: '#0A0A0B' }}
    >
      {/* Fondo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          style={{
            position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
            width: 680, height: 680, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192,0,0,0.18) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-30%', right: '-10%',
            width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(192,0,0,0.10) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Contenedor */}
      <div className="relative w-full max-w-sm anim-fade-up">
        {/* Logo suelto, sin caja */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <Image
            src="/logo-dark.png"
            alt="Christopher Cabrera Tae Kwon Do"
            width={88}
            height={88}
            priority
            style={{
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 24px rgba(192,0,0,0.35))',
            }}
          />
          <h1
            style={{
              fontSize: 20, fontWeight: 700, letterSpacing: -0.4,
              color: '#FFFFFF', marginTop: 20,
            }}
          >
            ACCTK<span style={{ color: '#E53935' }}>D</span>MINISTRACIÓN
          </h1>
          <p style={{
            fontSize: 13, color: 'rgba(235,235,245,0.45)', marginTop: 4,
            letterSpacing: -0.1, fontWeight: 400,
          }}>
            Christopher Cabrera Tae Kwon Do
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <FieldLabel>Usuario</FieldLabel>
          <InputField
            icon={
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V21"/>
                <circle cx="12" cy="7.5" r="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            type="text"
            value={form.username}
            onChange={v => setForm(p => ({ ...p, username: v }))}
            placeholder="Ingresa tu usuario"
            autoComplete="username"
            required
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <FieldLabel style={{ margin: 0 }}>Contraseña</FieldLabel>
            <button
              type="button"
              style={{
                background: 'none', border: 'none', color: 'rgba(235,235,245,0.50)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0,
              }}
            >
              ¿Olvidaste?
            </button>
          </div>
          <InputField
            icon={
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="4" y="11" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7.5a4 4 0 0 1 8 0V11"/>
              </svg>
            }
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={v => setForm(p => ({ ...p, password: v }))}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            required
            right={
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                style={{
                  background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                  color: 'rgba(235,235,245,0.40)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? (
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.584 10.587a2 2 0 0 0 2.828 2.83M9.363 5.365A9.466 9.466 0 0 1 12 5c4.478 0 8.268 2.943 9.542 7a9.973 9.973 0 0 1-1.563 3.029M6.1 6.1C3.934 7.514 2.313 9.577 1.458 12c1.274 4.057 5.064 7 9.542 7 1.772 0 3.434-.46 4.885-1.267"/>
                  </svg>
                ) : (
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12Z"/>
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            }
          />

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(255,69,58,0.08)',
                border: '0.5px solid rgba(255,69,58,0.25)',
                borderRadius: 12, padding: '11px 14px', marginTop: 2,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#FF6961" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 8v4m0 3.5v.5"/>
              </svg>
              <p style={{ fontSize: 13, color: '#FF8A84', fontWeight: 500, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.username || !form.password}
            style={{
              marginTop: 10,
              width: '100%', height: 48,
              background: loading || !form.username || !form.password
                ? 'rgba(192,0,0,0.35)'
                : 'var(--red)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              letterSpacing: -0.2,
              cursor: (loading || !form.username || !form.password) ? 'not-allowed' : 'pointer',
              boxShadow: (loading || !form.username || !form.password) ? 'none' : '0 1px 2px rgba(0,0,0,0.2), 0 6px 20px rgba(192,0,0,0.30)',
              transition: 'background 0.18s, transform 0.12s, box-shadow 0.18s',
            }}
            onMouseDown={e => !loading && (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  width: 15, height: 15,
                  border: '2px solid rgba(255,255,255,0.35)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Iniciando sesión
              </span>
            ) : 'Iniciar sesión'}
          </button>
        </form>

        {/* Pie */}
        <div style={{
          marginTop: 32, paddingTop: 20,
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(235,235,245,0.28)', letterSpacing: 0.2 }}>
            © 2026 Christopher Cabrera Tae Kwon Do · Trujillo, Perú
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff;
          -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset !important;
          box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  )
}

function FieldLabel({ children, style }) {
  return (
    <label style={{
      fontSize: 12, fontWeight: 500, color: 'rgba(235,235,245,0.60)',
      letterSpacing: -0.1, marginBottom: 6, display: 'block',
      ...style,
    }}>
      {children}
    </label>
  )
}

function InputField({ icon, right, value, onChange, ...rest }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
      }}
      onFocus={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(192,0,0,0.6)'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,0,0,0.14)'
      }}
      onBlur={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {icon && (
        <span style={{
          paddingLeft: 13, paddingRight: 10,
          color: 'rgba(235,235,245,0.40)',
          display: 'inline-flex', alignItems: 'center',
        }}>
          {icon}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, height: 46, paddingLeft: icon ? 0 : 14,
          paddingRight: right ? 4 : 14,
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: 15, color: '#fff', fontFamily: 'inherit', letterSpacing: -0.1,
        }}
        {...rest}
      />
      {right && <span style={{ paddingRight: 10 }}>{right}</span>}
    </div>
  )
}
