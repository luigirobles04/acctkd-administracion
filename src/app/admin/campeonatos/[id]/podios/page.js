'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import PodioCard, { PodioListaImpresion } from '@/components/campeonatos/PodioCard'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/podios.css'

const FILTROS = [
  { id: 'con_llave', label: 'Con llave' },
  { id: 'completo', label: 'Completos' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'todos', label: 'Todos' },
]

export default function CampeonatoPodiosPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [podios, setPodios] = useState([])
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('con_llave')
  const [buscar, setBuscar] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/podios`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setPodios(json.podios || [])
      setResumen(json.resumen || null)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const lista = useMemo(() => {
    let items = podios
    if (filtro === 'con_llave') items = items.filter((p) => p.tiene_llave)
    else if (filtro === 'completo') items = items.filter((p) => p.estado === 'completo')
    else if (filtro === 'en_curso') items = items.filter((p) => p.estado === 'en_curso')

    const q = buscar.trim().toLowerCase()
    if (q) {
      items = items.filter((p) => {
        const text = [
          p.nombre,
          p.podio?.oro?.nombres,
          p.podio?.plata?.nombres,
          ...(p.podio?.bronce || []).map((b) => b.nombres),
          p.podio?.oro?.academia,
          p.podio?.plata?.academia,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return text.includes(q)
      })
    }
    return items
  }, [podios, filtro, buscar])

  return (
    <AdminLayout title="Podios Kyorugi" subtitle={campeonato?.nombre}>
      <div className="podios-root">
        <div className="no-print podios-toolbar">
          <Link href={`/admin/campeonatos/${id}`} className="podios-back">
            ← Campeonato
          </Link>

          {resumen && (
            <div className="podios-resumen">
              <span><strong>{resumen.completos}</strong> completos</span>
              <span><strong>{resumen.enCurso}</strong> en curso</span>
              <span><strong>{resumen.sinLlave}</strong> sin llave</span>
              <span><strong>{resumen.total}</strong> categorías</span>
            </div>
          )}

          <div className="podios-actions">
            <input
              className="ios-input"
              placeholder="Buscar categoría o competidor…"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
            <div className="ios-segment" style={{ display: 'flex', gap: 4 }}>
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`ios-segment-item ${filtro === f.id ? 'active' : ''}`}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button type="button" className="ios-btn ios-btn-primary" onClick={() => window.print()}>
              Imprimir podios
            </button>
            {campeonato?.slug && (
              <a
                href={`/campeonato/${campeonato.slug}/podios`}
                target="_blank"
                rel="noreferrer"
                className="ios-btn ios-btn-secondary"
              >
                Vista pública
              </a>
            )}
          </div>
        </div>

        {loading ? (
          <p>Cargando podios…</p>
        ) : lista.length === 0 ? (
          <p className="ios-body" style={{ color: 'var(--label3)' }}>No hay categorías que coincidan.</p>
        ) : (
          <div className="podios-grid">
            {lista.map((cat) => (
              <PodioCard key={cat.id_categoria} categoria={cat} />
            ))}
          </div>
        )}

        <PodioListaImpresion podios={podios} campeonato={campeonato} />
      </div>
    </AdminLayout>
  )
}
