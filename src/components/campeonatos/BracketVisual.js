'use client'

import CombateCard from '@/components/campeonatos/CombateCard'

const RONDA_LABEL = { 1: 'Final', 2: 'Semifinal', 3: 'Cuartos de final', 4: 'Octavos de final', 5: 'Dieciseisavos de final' }

export function combateVisible(m) {
  return m.estado !== 'vacío' && m.estado !== 'bye' && m.estado !== 'saltado'
}

function BracketConnectors({ count, cellH, gap }) {
  if (count < 2) return null
  const h = cellH + gap
  const totalH = count * h - gap
  const lines = []
  for (let i = 0; i < count; i += 2) {
    if (i + 1 >= count) break
    const y1 = i * h + cellH / 2
    const y2 = (i + 1) * h + cellH / 2
    const yMid = (y1 + y2) / 2
    lines.push(
      <g key={i}>
        <line x1={0} y1={y1} x2={16} y2={y1} stroke="#94a3b8" strokeWidth={2} />
        <line x1={0} y1={y2} x2={16} y2={y2} stroke="#94a3b8" strokeWidth={2} />
        <line x1={16} y1={y1} x2={16} y2={y2} stroke="#94a3b8" strokeWidth={2} />
        <line x1={16} y1={yMid} x2={32} y2={yMid} stroke="#94a3b8" strokeWidth={2} />
      </g>
    )
  }
  return (
    <svg width={32} height={totalH} style={{ flexShrink: 0, marginTop: 36 }} aria-hidden>
      {lines}
    </svg>
  )
}

export default function BracketVisual({ porRonda, marcando, onMarcarGanador }) {
  const rondas = Object.keys(porRonda)
    .map(Number)
    .sort((a, b) => b - a)

  if (!rondas.length) return null

  const visiblesPorRonda = rondas.map((r) => (porRonda[r] || []).filter(combateVisible))
  const CELL_H = 100
  const GAP = 24

  return (
    <div style={{ overflowX: 'auto', padding: '8px 0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: rondas.length * 340 }}>
        {rondas.map((ronda, colIdx) => {
          const combates = visiblesPorRonda[colIdx]
          if (!combates.length) return null
          const maxPrev = colIdx > 0 ? visiblesPorRonda[colIdx - 1].length : combates.length
          const gap = combates.length > 1 ? Math.max(GAP, ((maxPrev * (CELL_H + GAP)) / combates.length) - CELL_H) : GAP

          return (
            <div key={ronda} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 280px' }}>
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 12,
                    color: '#374151',
                    marginBottom: 10,
                    padding: '6px 10px',
                    background: '#f3f4f6',
                    borderRadius: 8,
                    letterSpacing: 0.3,
                  }}
                >
                  {RONDA_LABEL[ronda] || `Ronda ${ronda}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap }}>
                  {combates.map((m) => (
                    <div key={m.id_llave} style={{ minHeight: CELL_H }}>
                      <CombateCard
                        combate={m}
                        compact
                        showCancha={false}
                        marcando={marcando === m.id_llave}
                        onMarcarGanador={(idLinea) => onMarcarGanador(m.id_llave, idLinea)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {colIdx < rondas.length - 1 && (
                <BracketConnectors count={combates.length} cellH={CELL_H} gap={gap} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
