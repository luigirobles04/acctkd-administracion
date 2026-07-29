/** Ganadores por round (1 = chung/slot1, 2 = hong/slot2) — TV llamados y cancha. */
export function roundWinnerLabel(ganador, combate) {
  if (ganador === 1) return combate.color1 === 'rojo' ? 'ROJO' : 'AZUL'
  if (ganador === 2) return combate.color2 === 'rojo' ? 'ROJO' : 'AZUL'
  return null
}

export function inferRoundActual(combate) {
  if (combate.round2_ganador) return 3
  if (combate.round1_ganador) return 2
  return 1
}

export function RoundsMarcador({ combate, prefix = 'pantalla', showWhenEmpty = false }) {
  const rounds = [
    { n: 1, g: combate.round1_ganador },
    { n: 2, g: combate.round2_ganador },
    { n: 3, g: combate.round3_ganador },
  ]
  const any = rounds.some((r) => r.g === 1 || r.g === 2)
  if (!any && !showWhenEmpty) return null

  return (
    <div className={`${prefix}-rounds-live`} aria-label="Ganadores por round">
      {rounds.map(({ n, g }) => {
        const winner = roundWinnerLabel(g, combate)
        const played = g === 1 || g === 2
        return (
          <div
            key={n}
            className={`${prefix}-round-chip${played ? ` ${prefix}-round-chip--${winner === 'ROJO' ? 'rojo' : 'azul'}` : ''}`}
          >
            <span className={`${prefix}-round-chip-num`}>R{n}</span>
            <span className={`${prefix}-round-chip-winner`}>{played ? winner : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}
