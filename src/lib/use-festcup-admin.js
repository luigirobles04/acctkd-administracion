'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/services/auth.service'
import { isFestcupEventAdmin } from '@/lib/festcup-event-admin'

export function useFestcupAdmin() {
  const [festcup, setFestcup] = useState(() => {
    if (typeof window === 'undefined') return false
    return isFestcupEventAdmin(getCurrentUser())
  })

  useEffect(() => {
    setFestcup(isFestcupEventAdmin(getCurrentUser()))
  }, [])

  return festcup
}
