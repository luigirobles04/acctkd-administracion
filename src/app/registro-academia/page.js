import { Suspense } from 'react'
import RegistroAcademiaPage from './RegistroAcademiaClient'
import { PRODUCTION_SITE_URL } from '@/lib/site-config'

export const metadata = {
  title: 'Registro de academia',
  description: 'Registra tu academia e inscríbete al FestCup ACCTKD.',
  alternates: { canonical: `${PRODUCTION_SITE_URL}/registro-academia` },
  openGraph: {
    title: 'Registro de academia · FestCup',
    description: 'Registra tu academia e inscríbete al FestCup ACCTKD.',
    url: `${PRODUCTION_SITE_URL}/registro-academia`,
  },
}

export default function RegistroAcademiaWrapper() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>Cargando…</div>}>
      <RegistroAcademiaPage />
    </Suspense>
  )
}
