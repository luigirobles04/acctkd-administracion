'use client'

import CombateCard from '@/components/campeonatos/CombateCard'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }

export function combateVisible(m) {
  return m.estado !== 'vacío' && m.estado !== 'bye' && m.estado !== 'saltado'
}

export default function BracketVisual({ porRonda, marcando, onMarcarGanador }) {
  const rondas = Object.keys(porRonda)
    .map(Number)
    .sort((a, b) => b - a)

  if (!rondas.length) return null

  const visiblesPorRonda = rondas.map((r) => (porRonda[r] || []).filter(combateVisible))
  const maxCombates = Math.max(1, ...visiblesPorRonda.map((c) => c.length))

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 16, minWidth: rondas.length * 300, alignItems: 'stretch' }}>
        {rondas.map((ronda, colIdx) => {
          const combates = visiblesPorRonda[colIdx]
          if (!combates.length) return null
          const gap = maxCombates > 1 ? Math.max(20, (maxCombates / combates.length) * 28) : 16

          return (
            <div key={ronda} style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap, padding: '0 4px' }}>
                {combates.map((m) => (
                  <div key={m.id_llave} style={{ position: 'relative' }}>
                    {colIdx < rondas.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -12,
                          top: '50%',
                          width: 12,
                          height: 2,
                          background: 'var(--separator)',
                        }}
                      />
                    )}
                    <CombateCard
                      combate={m}
                      compact
                      marcando={marcando === m.id_llave}
                      onMarcarGanador={(idLinea) => onMarcarGanador(m.id_llave, idLinea, m)}
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
