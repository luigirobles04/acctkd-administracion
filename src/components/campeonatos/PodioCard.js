'use client'

import { MEDALLA_EMOJI } from '@/lib/campeonato/podio-kyorugi'

function Medallista({ tipo, competidor, compact }) {
  if (!competidor) {
    return (
      <div className={`podio-puesto podio-puesto--${tipo} podio-puesto--vacio${compact ? ' podio-puesto--compact' : ''}`}>
        <span className="podio-medalla">{MEDALLA_EMOJI[tipo]}</span>
        <span className="podio-vacio-text">—</span>
      </div>
    )
  }

  return (
    <div className={`podio-puesto podio-puesto--${tipo}${compact ? ' podio-puesto--compact' : ''}`}>
      <span className="podio-medalla">{MEDALLA_EMOJI[tipo]}</span>
      <span className="podio-dorsal">{competidor.dorsal}</span>
      <span className="podio-nombre">{competidor.nombres}</span>
      {competidor.academia && <span className="podio-academia">{competidor.academia}</span>}
    </div>
  )
}

export default function PodioCard({ categoria, compact = false }) {
  const { nombre, estado, podio } = categoria

  if (estado !== 'completo' || !podio) {
    return (
      <article className={`podio-card podio-card--${estado}${compact ? ' podio-card--compact' : ''}`}>
        <h3 className="podio-cat-nombre">{nombre}</h3>
        <p className="podio-estado">
          {estado === 'en_curso' && 'En curso — falta la final'}
          {estado === 'sin_llave' && 'Sin llave generada'}
          {estado === 'sin_final' && 'Llave incompleta'}
        </p>
      </article>
    )
  }

  return (
    <article className={`podio-card podio-card--completo${compact ? ' podio-card--compact' : ''}`}>
      <h3 className="podio-cat-nombre">{nombre}</h3>
      <div className="podio-plataforma">
        <div className="podio-col podio-col--bronce">
          {(podio.bronce?.length ? podio.bronce : [null]).map((c, i) => (
            <Medallista key={c?.id_linea || `b${i}`} tipo="bronce" competidor={c} compact={compact} />
          ))}
        </div>
        <div className="podio-col podio-col--centro">
          <Medallista tipo="plata" competidor={podio.plata} compact={compact} />
          <Medallista tipo="oro" competidor={podio.oro} compact={compact} />
        </div>
      </div>
    </article>
  )
}

export function PodioListaImpresion({ podios, campeonato }) {
  const completos = podios.filter((p) => p.estado === 'completo')
  return (
    <div className="podios-print-sheet">
      <header className="podios-print-header">
        <span className="podios-print-marca">ACCTKD</span>
        <h1>{campeonato?.nombre}</h1>
        <p>Podios Kyorugi · {[campeonato?.lugar, campeonato?.ciudad].filter(Boolean).join(' · ')}</p>
      </header>
      {completos.map((cat) => (
        <section key={cat.id_categoria} className="podios-print-row">
          <h2>{cat.nombre}</h2>
          <div className="podios-print-medallas">
            <div>
              <strong>🥇 Oro</strong>
              <span>{cat.podio.oro?.dorsal} — {cat.podio.oro?.nombres}</span>
              <small>{cat.podio.oro?.academia}</small>
            </div>
            <div>
              <strong>🥈 Plata</strong>
              <span>{cat.podio.plata?.dorsal} — {cat.podio.plata?.nombres}</span>
              <small>{cat.podio.plata?.academia}</small>
            </div>
            {(cat.podio.bronce || []).map((b, i) => (
              <div key={b.id_linea || i}>
                <strong>🥉 Bronce</strong>
                <span>{b.dorsal} — {b.nombres}</span>
                <small>{b.academia}</small>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
