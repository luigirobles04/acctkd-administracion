'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PodioCard from '@/components/campeonatos/PodioCard'
import { readJsonResponse } from '@/lib/public-app-url'
import '@/components/campeonatos/resultados.css'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'kyorugi', label: 'Kyorugi' },
  { id: 'poomsae', label: 'Poomsae' },
  { id: 'academias', label: 'Academias' },
  { id: 'atletas', label: 'Atletas' },
]

function RankCard({ rank, title, subtitle, puntos, medallas }) {
  return (
    <article className="resultados-rank-card">
      <span className="resultados-rank-pos">#{rank}</span>
      <div className="resultados-rank-body">
        <strong>{title}</strong>
        {subtitle && <span className="resultados-rank-sub">{subtitle}</span>}
        {medallas != null && (
          <span className="resultados-rank-medallas">
            🥇 {medallas.oro} · 🥈 {medallas.plata} · 🥉 {medallas.bronce}
          </span>
        )}
      </div>
      <span className="resultados-rank-pts">{puntos} pts</span>
    </article>
  )
}

function AcademiasPanel({ medallero }) {
  const { puntos, academias } = medallero || {}
  const blocks = [
    { key: 'global', title: 'Top 3 global', list: academias?.global },
    { key: 'kyorugi', title: 'Top 3 Kyorugi', list: academias?.kyorugi },
    { key: 'poomsae', title: 'Top 3 Poomsae', list: academias?.poomsae },
  ]

  return (
    <div className="resultados-panel">
      <p className="resultados-hint">
        Puntos: oro {puntos?.oro} · plata {puntos?.plata} · bronce {puntos?.bronce}
      </p>
      <div className="resultados-rank-grid">
        {blocks.map((b) => (
          <section key={b.key} className="resultados-rank-block">
            <h3>{b.title}</h3>
            {!b.list?.length ? (
              <p className="resultados-vacio">Sin datos aún</p>
            ) : (
              b.list.map((a, i) => (
                <RankCard
                  key={a.nombre}
                  rank={i + 1}
                  title={a.nombre}
                  puntos={b.key === 'kyorugi' ? a.puntos_kyorugi : b.key === 'poomsae' ? a.puntos_poomsae : a.puntos_total}
                  medallas={{ oro: a.oro, plata: a.plata, bronce: a.bronce }}
                />
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function AtletasPanel({ medallero }) {
  const blocks = [
    { key: 'global', title: 'Mejores atletas (global)', list: medallero?.atletas?.global },
    { key: 'kyorugi', title: 'Kyorugi', list: medallero?.atletas?.kyorugi },
    { key: 'poomsae', title: 'Poomsae', list: medallero?.atletas?.poomsae },
  ]

  return (
    <div className="resultados-panel">
      <div className="resultados-rank-grid">
        {blocks.map((b) => (
          <section key={b.key} className="resultados-rank-block">
            <h3>{b.title}</h3>
            {!b.list?.length ? (
              <p className="resultados-vacio">Sin medallas registradas</p>
            ) : (
              b.list.map((a, i) => (
                <RankCard
                  key={a.id_linea}
                  rank={i + 1}
                  title={`${a.dorsal} · ${a.nombres}`}
                  subtitle={a.academia}
                  puntos={b.key === 'kyorugi' ? a.kyorugi : b.key === 'poomsae' ? a.poomsae : a.puntos}
                  medallas={{ oro: a.oro, plata: a.plata, bronce: a.bronce }}
                />
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function ResumenPanel({ data }) {
  const m = data?.medallero
  const k = data?.kyorugi?.resumen
  const p = data?.poomsae?.resumen

  return (
    <div className="resultados-panel">
      <div className="resultados-stats">
        <div className="resultados-stat">
          <span className="resultados-stat-val">{k?.completos ?? 0}</span>
          <span className="resultados-stat-lbl">Podios Kyorugi</span>
        </div>
        <div className="resultados-stat">
          <span className="resultados-stat-val">{p?.completos ?? 0}</span>
          <span className="resultados-stat-lbl">Podios Poomsae</span>
        </div>
        <div className="resultados-stat">
          <span className="resultados-stat-val">{m?.academias?.totalAcademias ?? 0}</span>
          <span className="resultados-stat-lbl">Academias</span>
        </div>
      </div>

      {m?.academias?.global?.[0] && (
        <section className="resultados-hero-card">
          <span className="resultados-hero-badge">🏆 Academia líder</span>
          <h3>{m.academias.global[0].nombre}</h3>
          <p>{m.academias.global[0].puntos_total} puntos en el medallero</p>
        </section>
      )}

      <div className="resultados-rank-grid resultados-rank-grid--2">
        <section className="resultados-rank-block">
          <h3>Top Kyorugi</h3>
          {(m?.academias?.kyorugi || []).slice(0, 3).map((a, i) => (
            <RankCard key={a.nombre} rank={i + 1} title={a.nombre} puntos={a.puntos_kyorugi} />
          ))}
        </section>
        <section className="resultados-rank-block">
          <h3>Top Poomsae</h3>
          {(m?.academias?.poomsae || []).slice(0, 3).map((a, i) => (
            <RankCard key={a.nombre} rank={i + 1} title={a.nombre} puntos={a.puntos_poomsae} />
          ))}
        </section>
      </div>
    </div>
  )
}

export default function ResultadosPublicosPage() {
  const { slug } = useParams()
  const [tab, setTab] = useState('resumen')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/campeonato/${slug}/resultados`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 20000)
    return () => clearInterval(t)
  }, [cargar])

  const camp = data?.campeonato

  return (
    <div className="resultados-page">
      <div className="resultados-wrap">
        <header className="resultados-header">
          <span className="resultados-marca">ACCTKD · FESTCUP</span>
          <h1>{camp?.nombre || 'Resultados'}</h1>
          <p>{[camp?.lugar, camp?.ciudad].filter(Boolean).join(' · ') || 'Medallero en vivo'}</p>
          <span className="resultados-live">● Actualización automática</span>
        </header>

        <nav className="resultados-tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`resultados-tab${tab === t.id ? ' resultados-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="resultados-loading">Cargando resultados…</p>
        ) : !data ? (
          <p className="resultados-loading">No se pudieron cargar los resultados.</p>
        ) : (
          <>
            {tab === 'resumen' && <ResumenPanel data={data} />}
            {tab === 'kyorugi' && (
              <div className="resultados-panel">
                {!data.kyorugi?.podios?.length ? (
                  <p className="resultados-vacio">Aún no hay podios kyorugi completos.</p>
                ) : (
                  <div className="podios-grid">
                    {data.kyorugi.podios.map((cat) => (
                      <PodioCard key={cat.id_categoria} categoria={cat} modalidad="kyorugi" />
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'poomsae' && (
              <div className="resultados-panel">
                {!data.poomsae?.podios?.length && !data.poomsae?.enCurso?.length ? (
                  <p className="resultados-vacio">Aún no hay categorías poomsae calificadas.</p>
                ) : (
                  <>
                    {!!data.poomsae?.enCurso?.length && (
                      <p className="resultados-hint">
                        {data.poomsae.enCurso.length} categoría(s) en calificación…
                      </p>
                    )}
                    <div className="podios-grid">
                      {data.poomsae.podios.map((cat) => (
                        <PodioCard key={cat.id_categoria} categoria={cat} modalidad="poomsae" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {tab === 'academias' && <AcademiasPanel medallero={data.medallero} />}
            {tab === 'atletas' && <AtletasPanel medallero={data.medallero} />}
          </>
        )}

        <footer className="resultados-footer">
          <Link href={`/campeonato/${slug}`}>← Campeonato</Link>
          <Link href={`/campeonato/${slug}/canchas`}>Pantallas en vivo</Link>
        </footer>
      </div>
    </div>
  )
}
