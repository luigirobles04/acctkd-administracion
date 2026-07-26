'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin-client'

/**
 * Lazy load de líneas de una academia (se dispara solo al expandir).
 * Devuelve estado de carga/error, líneas paginadas y controles de página.
 */
export function useLineasAcademia(idCampeonato, acId, { activo = false, conPagos = false, porPagina = 100, reloadKey = 0 } = {}) {
  const [lineas, setLineas] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cargado, setCargado] = useState(false)

  const cargar = useCallback(async () => {
    if (!idCampeonato || !acId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(pagina), limit: String(porPagina) })
      if (conPagos) params.set('pagos', '1')
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/academias/${acId}/lineas?${params}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las inscripciones')
      setLineas(json.lineas || [])
      setTotal(json.total || 0)
      setTotalPaginas(json.totalPaginas || 1)
      setCargado(true)
    } catch (e) {
      setError(e.message)
      setLineas([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato, acId, pagina, porPagina, conPagos])

  useEffect(() => {
    if (!activo) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch lazy al expandir; el setState relevante ocurre tras await
    cargar()
  }, [activo, cargar, reloadKey])

  return { lineas, total, totalPaginas, pagina, setPagina, loading, error, cargado, recargar: cargar }
}
