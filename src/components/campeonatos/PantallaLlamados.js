'use client'

import { ganadorCombate } from '@/lib/campeonato/canchas-data'
import { RoundsMarcador, inferRoundActual } from '@/components/campeonatos/RoundsMarcador'

function fmtCombateTV(combate, cancha) {
  if (combate?.combate_no) return combate.combate_no
  if (!combate?.orden_pista) return null
  return `${combate.cancha || cancha || 1}/${String(combate.orden_pista).padStart(2, '0')}`
}

function LadoLlamado({ competidor, color, compact }) {
  const vacio = !competidor?.id_linea
  return (
    <div className={`llamados-lado llamados-lado--${color}${compact ? ' llamados-lado--compact' : ''}`}>
      {vacio ? <span className="llamados-vacio">Por definir</span> : <span className="llamados-blanco-linea" />}
    </div>
  )
}

function ListaEnBlanco({ total = 50 }) {
  return (
    <ol className="llamados-blanco">
      {Array.from({ length: total }, (_, i) => (
        <li key={i}>
          <span className="llamados-blanco-num">{i + 1}</span>
          <span className="llamados-blanco-linea" />
        </li>
      ))}
    </ol>
  )
}

function CombateLlamado({ combate, cancha, esActual }) {
  if (!combate) return null
  const combateNo = fmtCombateTV(combate, cancha)
  const enVivo = combate.estado === 'en_curso'
  const p1 = combate.puntaje1 ?? 0
  const p2 = combate.puntaje2 ?? 0
  const roundActual = inferRoundActual(combate)
  const faltaRival = !combate.id_linea1 || !combate.id_linea2
  const apilado = !esActual

  return (
    <div className={`llamados-combate${esActual ? ' llamados-combate--actual' : ' llamados-combate--cola'}${enVivo ? ' llamados-combate--vivo' : ''}${faltaRival && !esActual ? ' llamados-combate--espera' : ''}`}>
      <div className="llamados-combate-meta">
        {combateNo && <em className="llamados-combate-no">{combateNo}</em>}
        <span className="llamados-combate-cat" title={combate.categoria_nombre}>{combate.categoria_nombre}</span>
        <span className="llamados-combate-ronda">{combate.rondaLabel}</span>
        {enVivo && <span className="llamados-badge-vivo">EN CURSO</span>}
      </div>
      {faltaRival && (
        <p className="llamados-espera-rival">
          Nº de combate reservado · rival(es) se confirman al cerrar llaves anteriores
        </p>
      )}
      {esActual && (enVivo || p1 > 0 || p2 > 0) && (
        <div className="llamados-marcador">
          {enVivo && <span className="llamados-marcador-round-tag">ROUND {roundActual}</span>}
          <strong className={`llamados-punto llamados-punto--azul${p1 > p2 ? ' llamados-punto--lider' : ''}`}>{p1}</strong>
          <span className="llamados-marcador-sep">—</span>
          <strong className={`llamados-punto llamados-punto--rojo${p2 > p1 ? ' llamados-punto--lider' : ''}`}>{p2}</strong>
        </div>
      )}
      {esActual && enVivo && (
        <RoundsMarcador combate={combate} prefix="llamados" showWhenEmpty />
      )}
      <div className={`llamados-vs${apilado ? ' llamados-vs--stack' : ''}`}>
        <LadoLlamado competidor={combate.competidor1} color="azul" compact={apilado} />
        <span className="llamados-vs-label">VS</span>
        <LadoLlamado competidor={combate.competidor2} color="rojo" compact={apilado} />
      </div>
    </div>
  )
}

function UltimoResultado({ combate }) {
  const ganador = ganadorCombate(combate)
  if (!ganador) return null
  return (
    <div className="llamados-resultado">
      <span className="llamados-resultado-star">★</span>
      <div className="llamados-resultado-info">
        <span className="llamados-resultado-cat">{combate.categoria_nombre} · {combate.rondaLabel}</span>
        <span className="llamados-resultado-ganador">
          {combate.motivo_resultado === 'walkover' ? 'W/O' : ''}
        </span>
      </div>
    </div>
  )
}

function ColumnaArea({ area }) {
  const { cancha, actual, proximos, recientes, stats } = area
  const enCola = proximos

  return (
    <section className="llamados-col">
      <header className="llamados-col-header">
        <span>ÁREA</span>
        <strong>{cancha}</strong>
        {stats && (
          <span className="llamados-col-stats">
            {stats.terminados}/{stats.total}
          </span>
        )}
      </header>

      <div className="llamados-col-body">
        <p className="llamados-seccion-titulo">{actual?.estado === 'en_curso' ? 'EN PISTA' : 'LLAMADO ACTUAL'}</p>
        {actual ? (
          <CombateLlamado combate={actual} cancha={cancha} esActual />
        ) : (
          <div className="llamados-sin-combate">
            {stats?.total > 0 && stats?.pendientes === 0 ? 'Área completada' : 'Sin combates en cola'}
          </div>
        )}

        <p className="llamados-seccion-titulo">SIGUIENTES</p>
        {enCola?.length ? (
          <div className="llamados-lista-siguientes">
            {enCola.slice(0, 5).map((c) => (
              <CombateLlamado key={c.id_llave} combate={c} cancha={cancha} esActual={false} />
            ))}
          </div>
        ) : (
          <div className="llamados-sin-combate llamados-sin-combate--mini">Sin combates en cola</div>
        )}

        {recientes?.[0] && (
          <>
            <p className="llamados-seccion-titulo">ÚLTIMO RESULTADO</p>
            <UltimoResultado combate={recientes[0]} />
          </>
        )}
      </div>
    </section>
  )
}

function ColumnaAreaPoomsae({ area, categorias = [] }) {
  const { cancha, forma, stats } = area

  return (
    <section className="llamados-col llamados-col--poomsae">
      <header className="llamados-col-header llamados-col-header--poomsae">
        <span>ÁREA</span>
        <strong>{cancha}</strong>
        {stats?.total > 0 && (
          <span className="llamados-col-stats">
            {stats.terminados}/{stats.total}
          </span>
        )}
      </header>

      <div className="llamados-col-body">
        {forma ? (
          <>
            <p className="llamados-seccion-titulo">FORMA EN LLAMADO</p>
            <h3 className="llamados-poomsae-forma-titulo">
              {forma.nombre}
            </h3>
            <p className="llamados-poomsae-progress">
              Toda la forma (niños→adultos) · {forma.pendientes} pendientes
            </p>

            {categorias.map((cat) => (
              <section key={cat.grupo_key || cat.nombre}>
                <p className="llamados-seccion-titulo">{cat.nombre}</p>
                <ListaEnBlanco />
              </section>
            ))}
          </>
        ) : (
          <div className="llamados-sin-combate">Sin forma asignada a esta área</div>
        )}
      </div>
    </section>
  )
}

function VistaPoomsae({ poomsae }) {
  const areas = poomsae?.areas || []
  const stats = poomsae?.stats

  return (
    <>
      <div className="llamados-poomsae-banner">
        Llamado por <strong>FORMA</strong> (toda la edad junta). Podios siguen por edad y sexo.
        {stats ? ` · ${stats.pendientes} pendientes · ${stats.abiertas} formas abiertas` : ''}
      </div>
      <main className="llamados-grid">
        {areas.map((area) => {
          const detalle = (poomsae?.formas || []).find((f) => f.forma === area.forma?.key)
          return (
            <ColumnaAreaPoomsae
              key={area.cancha}
              area={area}
              categorias={detalle?.categorias || []}
            />
          )
        })}
      </main>
      {poomsae?.formasPendientes?.length > 0 && (
        <aside className="llamados-poomsae-otros">
          <p className="llamados-seccion-titulo">OTRAS FORMAS PENDIENTES</p>
          <div className="llamados-poomsae-chips">
            {poomsae.formasPendientes.map((f) => (
              <div key={f.forma} className="llamados-poomsae-chip">
                <strong>{f.titulo || f.forma}</strong>
                <span>{f.pendientes} pendientes</span>
              </div>
            ))}
          </div>
        </aside>
      )}
      {(poomsae?.formas || [])
        .filter((f) => !areas.some((a) => a.forma?.key === f.forma))
        .map((f) => (
          <section key={f.forma} className="llamados-poomsae-grupos">
            <h2 className="llamados-poomsae-grupos-titulo">{f.forma}</h2>
            {(f.categorias || []).map((cat) => (
              <div key={cat.grupo_key || cat.nombre}>
                <p className="llamados-seccion-titulo">{cat.nombre}</p>
                <ListaEnBlanco />
              </div>
            ))}
          </section>
        ))}
      {(poomsae?.gruposLlamado || []).map((bloque) => (
        <section key={bloque.banner} className="llamados-poomsae-grupos">
          <h2 className="llamados-poomsae-grupos-titulo">{bloque.banner}</h2>
          <div className="llamados-poomsae-grupos-grid">
            {[...new Map((bloque.items || []).map((item) => [item.categoria_nombre, item])).values()].map((item) => (
              <article key={item.categoria_nombre} className="llamados-poomsae-grupo-card">
                <p className="llamados-poomsae-grupo-forma">{item.categoria_nombre}</p>
                <ListaEnBlanco />
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export default function PantallaLlamados({ data, loading, modo = 'kyorugi', onModoChange }) {
  const camp = data?.campeonato
  const areas = data?.areas || []
  const poomsae = data?.poomsae
  const setModo = onModoChange || (() => {})

  return (
    <div className="pantalla-llamados">
      <header className="llamados-header">
        <div>
          <span className="llamados-marca">ACCTKD · ZONA DE LLAMADOS</span>
          <h1>{camp?.nombre || 'Campeonato'}</h1>
        </div>
        <div className="llamados-header-right">
          <div className="llamados-tabs" role="tablist" aria-label="Modalidad">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'kyorugi'}
              className={`llamados-tab${modo === 'kyorugi' ? ' llamados-tab--active' : ''}`}
              onClick={() => setModo('kyorugi')}
            >
              KYORUGI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'poomsae'}
              className={`llamados-tab${modo === 'poomsae' ? ' llamados-tab--active' : ''}`}
              onClick={() => setModo('poomsae')}
            >
              POOMSAE
            </button>
          </div>
          <span className={loading ? 'llamados-live llamados-live--sync' : 'llamados-live'}>● EN VIVO</span>
        </div>
      </header>

      {modo === 'kyorugi' ? (
        <main className="llamados-grid">
          {areas.map((area) => (
            <ColumnaArea key={area.cancha} area={area} />
          ))}
        </main>
      ) : (
        <VistaPoomsae poomsae={poomsae} />
      )}
    </div>
  )
}
