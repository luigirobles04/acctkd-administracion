import { Suspense } from 'react'
import ImprimirLlavesClient from './ImprimirLlavesClient'

export default function ImprimirLlavesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Cargando brackets…</p>}>
      <ImprimirLlavesClient />
    </Suspense>
  )
}
