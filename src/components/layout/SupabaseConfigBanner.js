'use client'

import { isSupabaseConfigured } from '@/lib/supabase'

export default function SupabaseConfigBanner() {
  if (isSupabaseConfigured()) return null

  return (
    <div
      role="alert"
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,149,0,0.14)',
        border: '1px solid rgba(255,149,0,0.35)',
        color: '#8A5700',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>Supabase no está configurado en este entorno</p>
      <p style={{ marginBottom: 8 }}>
        En <strong>Vercel</strong>: Project → Settings → Environment Variables. Agrega{' '}
        <code style={{ fontSize: 12 }}>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
        <code style={{ fontSize: 12 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (copia desde tu{' '}
        <code style={{ fontSize: 12 }}>.env.local</code> o Supabase → Settings → API).
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>
        Marca <strong>Production</strong> y <strong>Preview</strong>, guarda y luego{' '}
        <strong>Redeploy</strong> el último deployment (las variables <code style={{ fontSize: 12 }}>NEXT_PUBLIC_*</code>{' '}
        se aplican en el build).
      </p>
    </div>
  )
}
