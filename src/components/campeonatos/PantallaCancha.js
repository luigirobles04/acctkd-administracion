'use client'

import { ganadorCombate } from '@/lib/campeonato/canchas-data'
import { RoundsMarcador, inferRoundActual } from '@/components/campeonatos/RoundsMarcador'

const COLOR = {
  azul: { bg: '#1d4ed8', panel: '#dbeafe', text: '#1e3a8a', sub: '#1e40af', label: 'AZUL' },
  rojo: { bg: '#b91c1c', panel: '#fee2e2', text: '#7f1d1d', sub: '#991b1b', label: 'ROJO' },
}

function fmtCombateTV(combate, cancha) {
  if (combate?.combate_no) return combate.combate_no
  if (!combate?.orden_pista) return null
  return `${combate.cancha || cancha || 1}/${String(combate.orden_pista).padStart(2, '0')}`
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
          <div className="pantalla-competidor-top">
            {data.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.foto} alt={data.nombres} className="pantalla-foto" />
            ) : (
              <div className="pantalla-foto pantalla-foto--placeholder">
                {(data.nombres || data.dorsal || '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <span className="pantalla-dorsal" style={c && !esGanador ? { color: c.text } : undefined}>
              {data.dorsal}
            </span>
          </div>
          <span className="pantalla-nombre" style={c && !esGanador ? { color: c.text } : undefined}>
            {data.nombres}
          </span>
          {data.academia && (
            <span className="pantalla-academia" style={c && !esGanador ? { color: c.sub } : undefined}>
              {data.academia}
            </span>
          )}
        </>
      )}
    </div>
  )
}

function CombateTV({ combate, grande = false, showMeta = true, cancha = 1 }) {
  if (!combate) return null
  const g1 = combate.ganador_id_linea === combate.id_linea1
  const g2 = combate.ganador_id_linea === combate.id_linea2
  const combateNo = fmtCombateTV(combate, cancha)
  const enVivo = combate.estado === 'en_curso'
  const roundActual = inferRoundActual(combate)
  const p1 = combate.puntaje1 ?? 0
  const p2 = combate.puntaje2 ?? 0
  const showMarcador = enVivo || combate.estado === 'finalizado' || p1 > 0 || p2 > 0

  return (
    <div className={`pantalla-combate${grande ? ' pantalla-combate--grande' : ''}${enVivo ? ' pantalla-combate--vivo' : ''}`}>
      {showMeta && (
        <div className="pantalla-combate-meta">
          <span className="pantalla-combate-meta-cat">{combate.categoria_nombre}</span>
          <span className="pantalla-combate-meta-ronda">
            {combateNo && <em className="pantalla-combate-no">{combateNo}</em>}
            {combate.rondaLabel}
            {combate.es_exhibicion && <span className="pantalla-en-vivo-badge" style={{ background: '#6366f1' }}>EXHIBICIÓN</span>}
            {enVivo && <span className="pantalla-en-vivo-badge">EN CURSO</span>}
            {combate.motivo_resultado === 'walkover' && combate.estado === 'finalizado' && (
              <span className="pantalla-en-vivo-badge" style={{ background: '#d97706' }}>W/O</span>
            )}
          </span>
        </div>
      )}
      {showMarcador && (
        <div className="pantalla-marcador-live" aria-live="polite">
          {enVivo && (
            <span className="pantalla-marcador-round-tag">ROUND {roundActual}</span>
          )}
          <div className="pantalla-marcador-puntos pantalla-marcador-puntos--azul">
            <span className="pantalla-marcador-label">AZUL</span>
            <strong className={p1 > p2 ? 'pantalla-marcador--lider' : ''}>{p1}</strong>
          </div>
          <span className="pantalla-marcador-sep">—</span>
          <div className="pantalla-marcador-puntos pantalla-marcador-puntos--rojo">
            <span className="pantalla-marcador-label">ROJO</span>
            <strong className={p2 > p1 ? 'pantalla-marcador--lider' : ''}>{p2}</strong>
          </div>
        </div>
      )}
      {enVivo && <RoundsMarcador combate={combate} prefix="pantalla" />}
      <div className="pantalla-combate-vs">
        <CompetidorTV
          data={combate.competidor1}
          color="azul"
          lado="izq"
          esGanador={g1}
          grande={grande}
        />
        <div className="pantalla-vs-col" aria-hidden>
          <div className="pantalla-vs">VS</div>
        </div>
        <CompetidorTV
          data={combate.competidor2}
          color="rojo"
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

function ProximoMini({ combate, index, cancha = 1 }) {
  const combateNo = fmtCombateTV(combate, cancha)
  return (
    <div className="pantalla-proximo-mini">
      <span className="pantalla-proximo-num">{index + 1}</span>
      <div className="pantalla-proximo-info">
        <span className="pantalla-proximo-cat">
          {combateNo && <em className="pantalla-proximo-badge">{combateNo}</em>}
          {combate.categoria_nombre}
        </span>
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
  const pct = stats?.total ? Math.round((stats.terminados / stats.total) * 100) : 0

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
              <span className="pantalla-stats-line">
                {stats.terminados}/{stats.total} combates
                <span className="pantalla-stats-pct">{pct}%</span>
              </span>
              <div className="pantalla-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="pantalla-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className={loading ? 'pantalla-live pantalla-live--sync' : 'pantalla-live'}>● EN VIVO</span>
            </>
          )}
        </div>
      </header>

      <main className="pantalla-main">
        <section className="pantalla-actual">
          <h2>{actual ? 'En pista' : stats?.pendientes === 0 && stats?.total > 0 ? 'Completado' : 'Esperando combates'}</h2>
          {actual ? (
            <CombateTV combate={actual} grande showMeta cancha={cancha} />
          ) : (
            <div className="pantalla-espera">
              {proximos?.[0] ? (
                <>
                  <p>Próximo combate</p>
                  <CombateTV combate={proximos[0]} grande showMeta cancha={cancha} />
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
                  <ProximoMini key={c.id_llave} combate={c} index={i} cancha={cancha} />
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
