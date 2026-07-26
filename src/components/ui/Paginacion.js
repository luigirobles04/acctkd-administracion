'use client'

import { useMemo, useState } from 'react'

/** Hook de paginación client-side. Resetea a página 1 si cambia el total. */
export function usePaginacion(items, porPagina = 50) {
  const [pagina, setPagina] = useState(1)
  const total = items?.length || 0
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)

  const visibles = useMemo(
    () => (items || []).slice((paginaActual - 1) * porPagina, paginaActual * porPagina),
    [items, paginaActual, porPagina]
  )

  return { visibles, pagina: paginaActual, setPagina, totalPaginas, total, porPagina }
}

/** Barra de paginación compacta. No se muestra si hay una sola página. */
export default function Paginacion({ pagina, totalPaginas, setPagina, total, porPagina }) {
  if (totalPaginas <= 1) return null
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  const btn = (disabled) => ({
    padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
    border: '1px solid var(--separator, #e5e5ea)', cursor: disabled ? 'default' : 'pointer',
    background: 'var(--bg-elevated, #fff)', color: disabled ? 'var(--label3, #aeaeb2)' : 'var(--label, #1c1c1e)',
    opacity: disabled ? 0.6 : 1,
  })

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '12px 4px', flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--label3, #8e8e93)' }}>
        {desde}–{hasta} de {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" style={btn(pagina <= 1)} disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
          ← Anterior
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label, #1c1c1e)' }}>
          {pagina} / {totalPaginas}
        </span>
        <button
          type="button"
          style={btn(pagina >= totalPaginas)}
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina(pagina + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
