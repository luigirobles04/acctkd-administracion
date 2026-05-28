'use client'

const COLOR_STYLE = {
  azul: {
    bg: '#1d4ed8',
    panel: '#dbeafe',
    border: '#2563eb',
    text: '#1e3a8a',
    label: 'AZUL',
  },
  rojo: {
    bg: '#b91c1c',
    panel: '#fee2e2',
    border: '#dc2626',
    text: '#7f1d1d',
    label: 'ROJO',
  },
}

const WINNER = {
  panel: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 45%, #fbbf24 100%)',
  border: '#b45309',
  text: '#78350f',
  badgeBg: '#92400e',
}

function CompetidorBloque({ data, color, lado, esGanador, puedeMarcar, onMarcar, marcando }) {
  const esPlaceholder = !data?.id_linea
  const clickable = puedeMarcar && data?.id_linea && !esPlaceholder && !esGanador
  const c = esGanador ? null : color ? COLOR_STYLE[color] : null

  return (
    <button
      type="button"
      disabled={!clickable || marcando}
      onClick={clickable ? () => onMarcar(data.id_linea) : undefined}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: lado === 'izq' ? 'flex-end' : 'flex-start',
        textAlign: lado === 'izq' ? 'right' : 'left',
        padding: '14px 36px 14px 14px',
        paddingRight: lado === 'izq' ? '36px' : '14px',
        paddingLeft: lado === 'der' ? '36px' : '14px',
        border: 'none',
        borderRadius: lado === 'izq' ? '12px 0 0 12px' : '0 12px 12px 0',
        background: esGanador ? WINNER.panel : c ? c.panel : '#f4f4f5',
        boxShadow: esGanador
          ? `inset 0 0 0 3px ${WINNER.border}, 0 0 12px rgba(251,191,36,0.35)`
          : c
            ? `inset 0 0 0 2px ${c.border}`
            : 'inset 0 0 0 1px var(--separator)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: marcando ? 0.6 : esPlaceholder ? 0.7 : 1,
        minWidth: 0,
      }}
      title={clickable ? 'Marcar ganador' : undefined}
    >
      {esGanador ? (
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#fff', background: WINNER.badgeBg, padding: '3px 8px', borderRadius: 6, marginBottom: 8 }}>
          ★ GANADOR
        </span>
      ) : c ? (
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: '#fff', background: c.bg, padding: '3px 8px', borderRadius: 6, marginBottom: 8 }}>
          {c.label}
        </span>
      ) : null}
      {data?.dorsal ? (
        <span style={{ fontSize: 24, fontWeight: 800, color: esGanador ? WINNER.text : c?.text || '#111', lineHeight: 1.05 }}>
          {data.dorsal}
        </span>
      ) : (
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label3)' }}>Por definir</span>
      )}
      {data?.nombres && (
        <span style={{ fontSize: 15, fontWeight: 700, color: esGanador ? WINNER.text : '#111', marginTop: 5, lineHeight: 1.2 }}>
          {data.nombres}
        </span>
      )}
      {data?.academia && (
        <span style={{ fontSize: 11, color: esGanador ? WINNER.text : 'var(--label2)', marginTop: 3, opacity: 0.85 }}>{data.academia}</span>
      )}
    </button>
  )
}

export default function CombateCard({ combate, compact, marcando, onMarcarGanador, showCancha = true }) {
  const puedeMarcar = combate.estado === 'pendiente' && combate.id_linea1 && combate.id_linea2
  if (combate.estado === 'bye' || combate.estado === 'saltado') return null

  const finalizado = combate.estado === 'finalizado'

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 3px 14px rgba(0,0,0,0.07)',
        marginBottom: compact ? 0 : 12,
        position: 'relative',
        border: finalizado ? '2px solid #fbbf24' : '1px solid var(--separator)',
      }}
    >
      {showCancha && combate.cancha && (
        <div style={{ padding: '5px 12px', background: '#111', color: '#fff', fontSize: 10, fontWeight: 700 }}>
          CANCHA {combate.cancha}
          {combate.orden_pista ? <span style={{ float: 'right', opacity: 0.75 }}>#{combate.orden_pista}</span> : null}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', minHeight: compact ? 88 : 100 }}>
        <CompetidorBloque
          data={combate.competidor1}
          color={combate.color1 || 'azul'}
          lado="izq"
          esGanador={combate.ganador_id_linea === combate.id_linea1}
          puedeMarcar={puedeMarcar}
          onMarcar={onMarcarGanador}
          marcando={marcando}
        />
        <CompetidorBloque
          data={combate.competidor2}
          color={combate.color2 || 'rojo'}
          lado="der"
          esGanador={combate.ganador_id_linea === combate.id_linea2}
          puedeMarcar={puedeMarcar}
          onMarcar={onMarcarGanador}
          marcando={marcando}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid #111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 900,
            pointerEvents: 'none',
          }}
        >
          VS
        </div>
      </div>
    </div>
  )
}

export { COLOR_STYLE, WINNER }
