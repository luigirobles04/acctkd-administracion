'use client'

import { ganadorCombate } from '@/lib/campeonato/canchas-data'

const COLOR = {
  azul: { bg: '#1d4ed8', panel: '#dbeafe', text: '#1e3a8a', label: 'AZUL' },
  rojo: { bg: '#b91c1c', panel: '#fee2e2', text: '#7f1d1d', label: 'ROJO' },
}

function CompetidorTV({ data, color, lado, esGanador, grande }) {
  const c = esGanador ? null : COLOR[color] || null
  const vacio = !data?.id_linea

  return (
    <div
      className={`pantalla-competidor pantalla-competidor--${lado}${grande ? ' pantalla-competidor--grande' : ''}${esGanador ? ' pantalla-competidor--ganador' : ''}`}
      style={
        esGanador
          ? undefined
          : c
            ? { background: c.panel, borderColor: c.bg }
            : undefined
      }
    >
      {esGanador ? (
        <span className="pantalla-badge pantalla-badge--oro">★ GANADOR</span>
      ) : c ? (
        <span className="pantalla-badge" style={{ background: c.bg }}>
          {c.label}
        </span>
      ) : null}

      {vacio ? (
        <span className="pantalla-vacio">Por definir</span>
      ) : (
        <>
          <span className="pantalla-dorsal" style={c && !esGanador ? { color: c.text } : undefined}>
            {data.dorsal}
          </span>
          <span className="pantalla-nombre">{data.nombres}</span>
          {data.academia && <span className="pantalla-academia">{data.academia}</span>}
        </>
      )}
    </div>
  )
}

function CombateTV({ combate, grande = false, showMeta = true }) {
  if (!combate) return null
  const g1 = combate.ganador_id_linea === combate.id_linea1
  const g2 = combate.ganador_id_linea === combate.id_linea2

  return (
    <div className={`pantalla-combate${grande ? ' pantalla-combate--grande' : ''}`}>
      {showMeta && (
        <div className="pantalla-combate-meta">
          <span>{combate.categoria_nombre}</span>
          <span>{combate.rondaLabel}</span>
        </div>
      )}
      <div className="pantalla-combate-vs">
        <CompetidorTV
          data={combate.competidor1}
          color={combate.color1 || 'azul'}
          lado="izq"
          esGanador={g1}
          grande={grande}
        />
        <div className="pantalla-vs">VS</div>
        <CompetidorTV
          data={combate.competidor2}
          color={combate.color2 || 'rojo'}
          lado="der"
          esGanador={g2}
          grande={grande}
        />
      </div>
    </div>
  )
}

function ResultadoMini({ combate }) {
  const ganador = ganadorCombate(combate)
  if (!ganador) return null
  return (
    <div className="pantalla-resultado-mini">
      <div className="pantalla-resultado-mini-meta">
        <span>{combate.categoria_nombre}</span>
        <span>{combate.rondaLabel}</span>
      </div>
      <div className="pantalla-resultado-mini-ganador">
        <span className="pantalla-resultado-oro">★</span>
        <span className="pantalla-resultado-dorsal">{ganador.dorsal}</span>
        <span className="pantalla-resultado-nombre">{ganador.nombres}</span>
      </div>
    </div>
  )
}

function ProximoMini({ combate, index }) {
  return (
    <div className="pantalla-proximo-mini">
      <span className="pantalla-proximo-num">{index + 1}</span>
      <div className="pantalla-proximo-info">
        <span className="pantalla-proximo-cat">{combate.categoria_nombre}</span>
        <span className="pantalla-proximo-vs">
          {combate.competidor1?.dorsal || '—'} vs {combate.competidor2?.dorsal || '—'}
        </span>
      </div>
    </div>
  )
}

export default function PantallaCancha({ data, loading }) {
  const camp = data?.campeonato
  const cancha = data?.cancha || 1
  const { actual, proximos, recientes, stats } = data || {}

  return (
    <div className="pantalla-cancha">
      <header className="pantalla-header">
        <div className="pantalla-header-left">
          <span className="pantalla-marca">ACCTKD</span>
          <h1>{camp?.nombre || 'Campeonato'}</h1>
          {(camp?.lugar || camp?.ciudad) && (
            <p>{[camp?.lugar, camp?.ciudad].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="pantalla-header-cancha">
          <span>ÁREA</span>
          <strong>{cancha}</strong>
        </div>
        <div className="pantalla-header-stats">
          {stats && (
            <>
              <span>{stats.terminados}/{stats.total} combates</span>
              <span className={loading ? 'pantalla-live pantalla-live--sync' : 'pantalla-live'}>● EN VIVO</span>
            </>
          )}
        </div>
      </header>

      <main className="pantalla-main">
        <section className="pantalla-actual">
          <h2>{actual ? 'En pista' : stats?.pendientes === 0 && stats?.total > 0 ? 'Completado' : 'Esperando combates'}</h2>
          {actual ? (
            <CombateTV combate={actual} grande showMeta />
          ) : (
            <div className="pantalla-espera">
              {proximos?.[0] ? (
                <>
                  <p>Próximo combate</p>
                  <CombateTV combate={proximos[0]} grande showMeta />
                </>
              ) : (
                <p>No hay combates programados en esta área.</p>
              )}
            </div>
          )}
        </section>

        <aside className="pantalla-lateral">
          <section className="pantalla-bloque">
            <h3>Siguientes</h3>
            {!proximos?.length || (actual && proximos.length === 0) ? (
              <p className="pantalla-vacio-lista">Sin combates en cola</p>
            ) : (
              <div className="pantalla-lista">
                {(actual ? proximos : proximos.slice(1)).map((c, i) => (
                  <ProximoMini key={c.id_llave} combate={c} index={i} />
                ))}
              </div>
            )}
          </section>

          <section className="pantalla-bloque">
            <h3>Últimos resultados</h3>
            {!recientes?.length ? (
              <p className="pantalla-vacio-lista">Aún no hay resultados</p>
            ) : (
              <div className="pantalla-lista">
                {recientes.map((c) => (
                  <ResultadoMini key={c.id_llave} combate={c} />
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  )
}

export { CombateTV }
