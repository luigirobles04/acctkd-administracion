'use client'

const COLOR_STYLE = {
  azul: { bg: '#1e3a8a', light: '#dbeafe', border: '#2563eb', label: 'AZUL' },
  rojo: { bg: '#991b1b', light: '#fee2e2', border: '#dc2626', label: 'ROJO' },
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
        padding: '14px 24px',
        paddingLeft: lado === 'izq' ? '14px' : '32px',
        paddingRight: lado === 'der' ? '14px' : '32px',
        border: 'none',
        borderRadius: lado === 'izq' ? '12px 0 0 12px' : '0 12px 12px 0',
        background: esGanador ? (c?.light || '#fff8e1') : '#fff',
        borderTop: `3px solid ${c?.border || 'var(--separator)'}`,
        borderBottom: `3px solid ${c?.border || 'var(--separator)'}`,
        borderLeft: lado === 'izq' ? `4px solid ${c?.border || 'var(--separator)'}` : '1px solid var(--separator)',
        borderRight: lado === 'der' ? `4px solid ${c?.border || 'var(--separator)'}` : '1px solid var(--separator)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: marcando ? 0.6 : 1,
        minWidth: 0,
      }}
      title={clickable ? 'Marcar ganador' : undefined}
    >
      {c && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1,
            color: c.bg,
            marginBottom: 6,
          }}
        >
          {c.label}
        </span>
      )}
      {data?.dorsal ? (
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', lineHeight: 1.1, letterSpacing: -0.5 }}>
          {data.dorsal}
        </span>
      ) : (
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--label3)' }}>Por definir</span>
      )}
      {data?.nombres && (
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111', marginTop: 4, lineHeight: 1.25 }}>
          {data.nombres}
        </span>
      )}
      {data?.academia && (
        <span style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3 }}>{data.academia}</span>
      )}
      {esGanador && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginTop: 6 }}>★ Ganador</span>
      )}
    </button>
  )
}

export default function CombateCard({ combate, compact, marcando, onMarcarGanador }) {
  const puedeMarcar = combate.estado === 'pendiente' && combate.id_linea1 && combate.id_linea2
  const esBye = combate.estado === 'bye'

  if (esBye) {
    const data = combate.competidor1?.id_linea ? combate.competidor1 : combate.competidor2
    const color = combate.color1 || combate.color2 || 'azul'
    return (
      <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: compact ? 8 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: '#f8f9fa' }}>
          <CompetidorBloque data={data} color={color} lado="izq" esGanador={false} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 8px',
              background: '#eef0f3',
              minWidth: 56,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--label3)' }}>BYE</span>
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderTop: '1px solid #bfdbfe' }}>
          <span className="badge badge-blue" style={{ fontSize: 10 }}>Pase directo</span>
          {combate.cancha && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--label3)' }}>Cancha {combate.cancha}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: compact ? 8 : 12,
        position: 'relative',
      }}
    >
      {(combate.cancha || combate.orden_pista) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: '#1a1a1a',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {combate.cancha ? <span>CANCHA {combate.cancha}</span> : <span />}
          {combate.orden_pista ? <span>Pista #{combate.orden_pista}</span> : null}
          {combate.estado === 'finalizado' && <span style={{ color: '#86efac' }}>Finalizado</span>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', minHeight: compact ? 88 : 100 }}>
        <CompetidorBloque
          data={combate.competidor1}
          color={combate.color1}
          lado="izq"
          esGanador={combate.ganador_id_linea === combate.id_linea1}
          puedeMarcar={puedeMarcar}
          onMarcar={onMarcarGanador}
          marcando={marcando}
        />
        <CompetidorBloque
          data={combate.competidor2}
          color={combate.color2}
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
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid var(--separator)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--label2)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
          }}
        >
          VS
        </div>
      </div>

      {puedeMarcar && !compact && (
        <p style={{ margin: 0, padding: '8px 12px', fontSize: 11, color: 'var(--label3)', background: '#fafafa', textAlign: 'center' }}>
          Toca el nombre del ganador para avanzarlo
        </p>
      )}
    </div>
  )
}
