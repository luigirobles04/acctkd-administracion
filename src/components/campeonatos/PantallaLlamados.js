'use client'

import { ganadorCombate } from '@/lib/campeonato/canchas-data'
import { fotoCompetidorProxyUrl } from '@/lib/campeonato/foto-competidor'

function fmtCombateTV(orden, cancha) {
  if (!orden) return null
  return `${cancha || 1}/${String(orden).padStart(2, '0')}`
}

function LogoAcademia({ competidor, size = 44 }) {
  const inicial = (competidor?.academia || competidor?.nombres || '?').trim().charAt(0).toUpperCase()
  const logoSrc = fotoCompetidorProxyUrl(competidor?.academia_logo)
  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={competidor.academia || ''}
        className="llamados-logo"
        style={{ width: size, height: size }}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="llamados-logo llamados-logo--placeholder" style={{ width: size, height: size }}>
      {inicial}
    </div>
  )
}

function LadoLlamado({ competidor, color }) {
  const vacio = !competidor?.id_linea
  return (
    <div className={`llamados-lado llamados-lado--${color}`}>
      {vacio ? (
        <span className="llamados-vacio">Por definir</span>
      ) : (
        <>
          <LogoAcademia competidor={competidor} />
          <div className="llamados-lado-info">
            <span className="llamados-dorsal">{competidor.dorsal}</span>
            <span className="llamados-nombre">{competidor.nombres}</span>
            <span className="llamados-academia">{competidor.academia}</span>
          </div>
        </>
      )}
    </div>
  )
}

function CombateLlamado({ combate, cancha, esActual }) {
  if (!combate) return null
  const combateNo = fmtCombateTV(combate.orden_pista, combate.cancha || cancha)
  const enVivo = combate.estado === 'en_curso'
  const p1 = combate.puntaje1 ?? 0
  const p2 = combate.puntaje2 ?? 0

  return (
    <div className={`llamados-combate${esActual ? ' llamados-combate--actual' : ''}${enVivo ? ' llamados-combate--vivo' : ''}`}>
      <div className="llamados-combate-meta">
        {combateNo && <em className="llamados-combate-no">{combateNo}</em>}
        <span className="llamados-combate-cat">{combate.categoria_nombre}</span>
        <span className="llamados-combate-ronda">{combate.rondaLabel}</span>
        {enVivo && <span className="llamados-badge-vivo">EN CURSO</span>}
      </div>
      {esActual && (enVivo || p1 > 0 || p2 > 0) && (
        <div className="llamados-marcador">
          <strong className={`llamados-punto llamados-punto--azul${p1 > p2 ? ' llamados-punto--lider' : ''}`}>{p1}</strong>
          <span className="llamados-marcador-sep">—</span>
          <strong className={`llamados-punto llamados-punto--rojo${p2 > p1 ? ' llamados-punto--lider' : ''}`}>{p2}</strong>
        </div>
      )}
      <div className="llamados-vs">
        <LadoLlamado competidor={combate.competidor1} color="azul" />
        <span className="llamados-vs-label">VS</span>
        <LadoLlamado competidor={combate.competidor2} color="rojo" />
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
          {ganador.dorsal} {ganador.nombres}
          {combate.motivo_resultado === 'walkover' ? ' · W/O' : ''}
        </span>
      </div>
    </div>
  )
}

function ColumnaArea({ area }) {
  const { cancha, actual, proximos, recientes, stats } = area
  const enCola = actual ? proximos : proximos?.slice(1)

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
            {enCola.slice(0, 3).map((c) => (
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

export default function PantallaLlamados({ data, loading }) {
  const camp = data?.campeonato
  const areas = data?.areas || []

  return (
    <div className="pantalla-llamados">
      <header className="llamados-header">
        <div>
          <span className="llamados-marca">ACCTKD · ZONA DE LLAMADOS</span>
          <h1>{camp?.nombre || 'Campeonato'}</h1>
        </div>
        <span className={loading ? 'llamados-live llamados-live--sync' : 'llamados-live'}>● EN VIVO</span>
      </header>
      <main className="llamados-grid">
        {areas.map((area) => (
          <ColumnaArea key={area.cancha} area={area} />
        ))}
      </main>
    </div>
  )
}
