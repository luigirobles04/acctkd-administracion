import { Suspense } from 'react'
import RegistroAcademiaPage from './RegistroAcademiaClient'

export default function RegistroAcademiaWrapper() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>Cargando…</div>}>
      <RegistroAcademiaPage />
    </Suspense>
  )
}
