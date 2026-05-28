'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BracketVisual from '@/components/campeonatos/BracketVisual'
import { readJsonResponse } from '@/lib/public-app-url'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import '@/components/campeonatos/bracket-print.css'

export default function ImprimirLlavesClient() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const idCampeonato = Number(id)
  const idCategoria = searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null
  const todas = searchParams.get('todas') === '1'
  const autoPrint = searchParams.get('auto') !== '0'

  const [campeonato, setCampeonato] = useState(null)
  const [brackets, setBrackets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const resCats = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves`, { cache: 'no-store' })
      const jsonCats = await readJsonResponse(resCats)
      if (!resCats.ok) throw new Error(jsonCats.error)

      let cats = (jsonCats.categorias || []).filter((c) => c.tiene_llave && c.inscritos >= 2)
      if (idCategoria) cats = cats.filter((c) => c.id_categoria === idCategoria)
      if (!idCategoria && !todas && cats.length) cats = [cats[0]]

      const loaded = []
      for (const cat of cats) {
        const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/${cat.id_categoria}`, {
          cache: 'no-store',
        })
        const json = await readJsonResponse(res)
        if (!res.ok) continue
        loaded.push({
          categoria: cat,
          porRonda: json.porRonda || {},
        })
      }
      setBrackets(loaded)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato, idCategoria, todas])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!autoPrint || loading || !brackets.length) return
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [autoPrint, loading, brackets.length])

  return (
    <div className="bracket-print-page">
      <div className="no-print bracket-print-toolbar">
        <Link href={`/admin/campeonatos/${id}/llaves`} style={{ color: '#c0000a', fontSize: 13 }}>
          ← Volver a llaves
        </Link>
        <button type="button" className="ios-btn ios-btn-primary" onClick={() => window.print()}>
          Imprimir / PDF
        </button>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {brackets.length} bracket{brackets.length !== 1 ? 's' : ''} · horizontal A4
        </span>
      </div>

      {loading && <p>Cargando brackets…</p>}
      {error && <p style={{ color: '#c0000a' }}>{error}</p>}

      {!loading &&
        brackets.map(({ categoria, porRonda }) => (
          <section key={categoria.id_categoria} className="bracket-print-sheet">
            <header className="bracket-print-head">
              <h1>Llaves Kyorugi · ACCTKD</h1>
              <h2>{categoria.nombre}</h2>
              <p>
                {campeonato?.nombre} · {categoria.inscritos} inscritos
              </p>
            </header>
            <BracketVisual porRonda={porRonda} marcando={null} onMarcarGanador={() => {}} />
          </section>
        ))}

      {!loading && !error && brackets.length === 0 && (
        <p>No hay llaves generadas para imprimir.</p>
      )}
    </div>
  )
}
