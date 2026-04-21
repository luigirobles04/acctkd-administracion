'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isAdmin, isMaestro } from '@/lib/services/auth.service'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }
    if (isAdmin(user)) router.push('/admin/dashboard')
    else if (isMaestro(user)) router.push('/maestro/clases')
    else router.push('/alumno/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A1A' }}>
      <div className="text-white text-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm opacity-70">Cargando...</p>
      </div>
    </div>
  )
}
