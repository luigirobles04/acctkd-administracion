'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/credenciales.css'

export default function CredencialesPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [academias, setAcademias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/credenciales`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setAcademias(json.academias || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const academiasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return academias
    return academias
      .map((a) => ({
        ...a,
        competidores: a.competidores.filter((c) =>
          [c.dorsal, c.nombres, c.categoria, a.nombre, c.codigo_academia].join(' ').toLowerCase().includes(q)
        ),
      }))
      .filter((a) => a.competidores.length > 0)
  }, [academias, filtro])

  const totalCredenciales = academiasFiltradas.reduce((n, a) => n + a.competidores.length, 0)

  function imprimir(scope) {
    const sheets = document.querySelectorAll('.credencial-sheet')
    sheets.forEach((el) => {
      if (scope === 'all') el.classList.remove('print-hide')
      else el.classList.toggle('print-hide', String(el.dataset.academia) !== String(scope))
    })
    window.print()
    sheets.forEach((el) => el.classList.remove('print-hide'))
  }

  return (
    <AdminLayout title="Credenciales" subtitle={campeonato?.nombre}>
      <div className="credenciales-root">
        <div className="no-print credenciales-toolbar">
          <Link href={`/admin/campeonatos/${id}`} className="credenciales-back">
            ← Campeonato
          </Link>

          <div className="credenciales-actions">
            <input
              className="ios-input"
              placeholder="Buscar academia, dorsal, nombre…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <button type="button" className="ios-btn ios-btn-primary" onClick={() => imprimir('all')}>
              Imprimir todas ({totalCredenciales})
            </button>
          </div>

          <p className="credenciales-hint">
            Plantilla FESTCUP · 54×86 mm. Márgenes <strong>Ninguno</strong> + gráficos de fondo. Próximamente podrás subir tu plantilla y marcar en pantalla dónde va la foto (círculo/cuadrado) y los datos del participante.
          </p>
        </div>

        {loading ? (
          <p className="no-print">Cargando credenciales…</p>
        ) : academiasFiltradas.length === 0 ? (
          <p className="no-print">No hay competidores con dorsal aprobado.</p>
        ) : (
          academiasFiltradas.map((academia) => (
            <section
              key={academia.id_academia_campeonato}
              className="credenciales-academia"
              data-academia={academia.id_academia_campeonato}
            >
              <header className="no-print credenciales-academia-head">
                <div>
                  <h2>{academia.nombre}</h2>
                  <p>
                    {academia.codigo_academia ? `${academia.codigo_academia} · ` : ''}
                    {academia.competidores.length} credencial{academia.competidores.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="ios-btn ios-btn-secondary"
                  onClick={() => imprimir(String(academia.id_academia_campeonato))}
                >
                  Imprimir academia
                </button>
              </header>

              <div className="credenciales-stack">
                {academia.competidores.map((c) => (
                  <CredencialCard key={c.id_linea} competidor={c} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </AdminLayout>
  )
}
