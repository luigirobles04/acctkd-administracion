'use client'

import CombateCard from '@/components/campeonatos/CombateCard'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }

export default function BracketVisual({ porRonda, marcando, onMarcarGanador }) {
  const rondas = Object.keys(porRonda)
    .map(Number)
    .sort((a, b) => b - a)

  if (!rondas.length) return null

  const maxCombates = Math.max(...rondas.map((r) => (porRonda[r] || []).filter((m) => m.estado !== 'vacío').length))

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          gap: 0,
          minWidth: rondas.length * 300,
          alignItems: 'stretch',
        }}
      >
        {rondas.map((ronda, colIdx) => {
          const combates = (porRonda[ronda] || []).filter((m) => m.estado !== 'vacío')
          const gap = maxCombates > 1 ? Math.max(16, (maxCombates / combates.length) * 24) : 16

          return (
            <div
              key={ronda}
              style={{
                flex: '0 0 290px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {colIdx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: -12,
                    top: 0,
                    bottom: 0,
                    width: 24,
                    pointerEvents: 'none',
                  }}
                />
              )}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--label2)',
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'var(--fill2, rgba(0,0,0,0.04))',
                  borderRadius: 8,
                }}
              >
                {RONDA_LABEL[ronda] || `Ronda ${ronda}`}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  gap,
                  padding: '0 8px',
                }}
              >
                {combates.map((m) => (
                  <div key={m.id_llave} style={{ position: 'relative' }}>
                    {colIdx < rondas.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -16,
                          top: '50%',
                          width: 16,
                          height: 2,
                          background: 'var(--separator)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    <CombateCard
                      combate={m}
                      compact
                      marcando={marcando === m.id_llave}
                      onMarcarGanador={(idLinea) => onMarcarGanador(m.id_llave, idLinea)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
