'use client'

const COLOR_STYLE = {
  azul: {
    bg: '#1d4ed8',
    panel: '#dbeafe',
    panelStrong: '#bfdbfe',
    border: '#2563eb',
    text: '#1e3a8a',
    label: 'CHUNG · AZUL',
  },
  rojo: {
    bg: '#b91c1c',
    panel: '#fee2e2',
    panelStrong: '#fecaca',
    border: '#dc2626',
    text: '#7f1d1d',
    label: 'HONG · ROJO',
  },
}

function CompetidorBloque({ data, color, lado, esGanador, puedeMarcar, onMarcar, marcando }) {
  const esPlaceholder = !data?.id_linea
  const clickable = puedeMarcar && data?.id_linea && !esPlaceholder
  const c = color ? COLOR_STYLE[color] : null

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
        padding: '16px 36px 16px 16px',
        paddingRight: lado === 'izq' ? '36px' : '16px',
        paddingLeft: lado === 'der' ? '36px' : '16px',
        border: 'none',
        borderRadius: lado === 'izq' ? '14px 0 0 14px' : '0 14px 14px 0',
        background: c ? (esGanador ? c.panelStrong : c.panel) : '#f4f4f5',
        boxShadow: c ? `inset 0 0 0 2px ${c.border}` : 'inset 0 0 0 1px var(--separator)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: marcando ? 0.6 : 1,
        minWidth: 0,
        transition: 'transform 0.12s',
      }}
      title={clickable ? 'Marcar ganador' : undefined}
    >
      {c && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.8,
            color: '#fff',
            background: c.bg,
            padding: '3px 8px',
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          {c.label}
        </span>
      )}
      {data?.dorsal ? (
        <span style={{ fontSize: 26, fontWeight: 800, color: c?.text || '#111', lineHeight: 1.05 }}>
          {data.dorsal}
        </span>
      ) : (
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--label3)' }}>Por definir</span>
      )}
      {data?.nombres && (
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111', marginTop: 6, lineHeight: 1.2 }}>
          {data.nombres}
        </span>
      )}
      {data?.academia && (
        <span style={{ fontSize: 12, color: 'var(--label2)', marginTop: 4, fontWeight: 500 }}>{data.academia}</span>
      )}
      {esGanador && (
        <span style={{ fontSize: 12, fontWeight: 800, color: c?.bg || 'var(--red)', marginTop: 8 }}>★ GANADOR</span>
      )}
    </button>
  )
}

export default function CombateCard({ combate, compact, marcando, onMarcarGanador }) {
  const puedeMarcar = combate.estado === 'pendiente' && combate.id_linea1 && combate.id_linea2
  const esBye = combate.estado === 'bye'

  if (esBye) return null

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        marginBottom: compact ? 10 : 14,
        position: 'relative',
      }}
    >
      {(combate.cancha || combate.orden_pista) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 14px',
            background: '#111',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          {combate.cancha ? <span>🥋 CANCHA {combate.cancha}</span> : <span />}
          {combate.orden_pista ? <span>Pista #{combate.orden_pista}</span> : null}
          {combate.estado === 'finalizado' && <span style={{ color: '#86efac' }}>✓ Finalizado</span>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', minHeight: compact ? 96 : 112 }}>
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
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fff',
            border: '3px solid #111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 900,
            color: '#111',
            boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}
        >
          VS
        </div>
      </div>

      {puedeMarcar && !compact && (
        <p style={{ margin: 0, padding: '8px 12px', fontSize: 11, color: 'var(--label3)', background: '#fafafa', textAlign: 'center' }}>
          Toca el competidor ganador (azul o rojo) para avanzarlo
        </p>
      )}
    </div>
  )
}

export { COLOR_STYLE }
