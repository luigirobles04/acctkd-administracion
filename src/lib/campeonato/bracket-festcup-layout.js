/** Layout árbol estilo FESTCUP — plantillas por tamaño de llave */

import { columnasBracket, byePlayersEnLlave } from '@/lib/campeonato/bracket-export'

export const ROWS_PER_MATCH = 3
const GAP = 1
const LINE = [1, 2, 3, 4, 5] // B-F
const COL_G = 6
const COL_H = 7
const COL_I = 8
const COL_F = 5

function fmtCombate(num, cancha) {
  if (!num) return ''
  const n = String(num).padStart(2, '0')
  return cancha ? `${cancha}/${n}` : String(n)
}

const SEEDS = {
  2: [1, 2],
  3: [1, 3, 2],
  4: [1, 4, 3, 2],
  6: [1, 5, 4, 3, 6, 2],
  8: [1, 8, 4, 5, 3, 6, 2, 7],
  16: [1, 16, 8, 9, 4, 13, 5, 12, 3, 14, 6, 11, 7, 10, 2, 15],
}

function bracketSeeds(n) {
  if (SEEDS[n]) return SEEDS[n]
  if (n <= 1) return [1]
  const half = bracketSeeds(n / 2)
  const out = []
  for (const s of half) {
    out.push(s)
    out.push(n + 1 - s)
  }
  return out
}

function createLayout() {
  const cells = new Map()
  const merges = []

  const set = (r, c, spec) => {
    const k = `${r},${c}`
    cells.set(k, { ...(cells.get(k) || {}), ...spec })
  }
  const border = (r, c, b) => {
    const k = `${r},${c}`
    const prev = cells.get(k) || {}
    cells.set(k, { ...prev, border: { ...(prev.border || {}), ...b } })
  }
  const lineBottom = (r) => {
    border(r, 0, { bottom: true })
    LINE.forEach((c) => border(r, c, { bottom: true }))
  }
  const lineTop = (r) => LINE.forEach((c) => border(r, c, { top: true }))

  const player = (r, slot, p, seed) => {
    set(r, 0, { v: seed, align: 'center', bold: true })
    set(r, 1, { v: p?.nombre || 'POR DEFINIR', bold: true, chung: true, italic: p?.vacio })
    set(r, 2, { v: p?.academia || '', small: true, mergeAcademy: true })
    lineBottom(r)
  }

  const spacer = (r) => lineTop(r)

  const matchG = (r, num, cancha) => {
    border(r, COL_G, { top: true, right: true })
    if (num) set(r, COL_G, { v: fmtCombate(num, cancha), align: 'center', matchNo: true })
  }

  const closeG = (r) => border(r, COL_G, { bottom: true, right: true })

  const matchH = (r, num, cancha, extra = {}) => {
    border(r, COL_H, { top: true, right: true, ...extra })
    if (num) set(r, COL_H, { v: fmtCombate(num, cancha), align: 'center', matchNo: true })
  }

  const closeH = (r) => border(r, COL_H, { bottom: true, right: true })

  const vertH = (rLo, rHi) => {
    border(rLo, COL_H, { top: true, right: true })
    for (let r = rLo + 1; r < rHi; r++) border(r, COL_H, { right: true })
    if (rHi > rLo) border(rHi, COL_H, { bottom: true, right: true })
  }

  const bridge = (r) => {
    border(r, COL_H, { right: true })
    border(r, COL_I, { bottom: true, left: true })
  }

  const finalize = (rows, cols) => {
    for (let r = 0; r < rows; r++) {
      if (cells.get(`${r},2`)?.mergeAcademy) merges.push(`C${r + 1}:F${r + 1}`)
    }
    return { rows, cols, cells, merges }
  }

  return {
    cells,
    merges,
    set,
    border,
    lineBottom,
    lineTop,
    player,
    spacer,
    matchG,
    closeG,
    matchH,
    closeH,
    vertH,
    bridge,
    finalize,
  }
}

function bracketType(cols, porRonda) {
  const r0 = cols[0]?.combates?.length ?? 0
  if (cols.length === 1 && r0 === 1) return 2
  if (r0 === 1 && cols.length >= 2) return 3
  if (cols.length === 3 && (r0 === 3 || (r0 === 2 && byePlayersEnLlave(porRonda).length >= 1))) return 6
  if (r0 === 2) return 4
  if (r0 === 4) return 8
  if (r0 === 8) return 16
  return r0 * 2
}

function slotFromRaw(c) {
  if (!c?.nombres && !c?.id_linea) return { nombre: 'POR DEFINIR', academia: '', vacio: true }
  return { nombre: (c.nombres || 'POR DEFINIR').toUpperCase(), academia: c.academia || '', vacio: false }
}

/** Byes semilla 1 (arriba) y semilla 2 (abajo) en llave de 8 */
function byesFestcup6(porRonda) {
  const vacio = { nombre: 'POR DEFINIR', academia: '', vacio: true }
  const maxR = Math.max(0, ...Object.keys(porRonda || {}).map(Number))
  const primera = porRonda[maxR] || []
  const byeTop = primera.find((m) => m.es_bye && m.match_numero === 1)
  const byeBot = primera.find((m) => m.es_bye && m.match_numero === 3)
  return [byeTop ? slotFromRaw(byeTop.competidor1) : vacio, byeBot ? slotFromRaw(byeBot.competidor1) : vacio]
}

function slotsFestcup6(cols, porRonda) {
  const [byeTop, byeBot] = byesFestcup6(porRonda)
  const vacio = { nombre: 'POR DEFINIR', academia: '', vacio: true }
  const maxR = Math.max(0, ...Object.keys(porRonda || {}).map(Number))
  const primera = porRonda[maxR] || []

  const qf54 = primera.find((m) => !m.es_bye && m.match_numero === 2)
  const qf36 = primera.find((m) => !m.es_bye && m.match_numero === 4)

  if (qf54 && qf36) {
    // Llave 8 estándar: semillas 5↑4 y 3↑6 (pareja 4v5 → comp1=4, comp2=5)
    return [
      byeTop,
      slotFromRaw(qf54.competidor2), // semilla 5
      slotFromRaw(qf54.competidor1), // semilla 4
      slotFromRaw(qf36.competidor1), // semilla 3
      slotFromRaw(qf36.competidor2), // semilla 6
      byeBot,
    ]
  }

  const r0 = cols[0].combates
  const m = (i) => r0[i] || { chung: vacio, hong: vacio }

  if (r0.length === 2) {
    return [byeTop, m(0).hong, m(0).chung, m(1).chung, m(1).hong, byeBot]
  }

  return [m(2).chung, m(0).hong, m(0).chung, m(1).chung, m(1).hong, m(2).hong]
}

/** 2 personas — conector en H (como FESTCUP AREA 2) */
function layout2(cols, cancha) {
  const L = createLayout()
  const m = cols[0].combates[0]
  const seeds = bracketSeeds(2)

  L.player(0, 0, m.chung, seeds[0])
  L.spacer(1)
  L.lineTop(1)
  L.border(1, COL_G, { top: true })
  L.matchH(1, m.numero_combate, cancha)
  L.border(1, COL_I, { bottom: true })
  L.player(2, 1, m.hong, seeds[1])
  L.border(2, COL_G, { bottom: true })
  L.closeH(2)

  return L.finalize(3, COL_I + 1)
}

/** 3 personas — bye + preliminar (FESTCUP AREA 1 IA1M -25) */
function layout3FromData(cols, cancha, porRonda) {
  const L = createLayout()
  const pre = cols[0].combates[0]
  const fin = cols[cols.length - 1].combates[0]
  const seeds = bracketSeeds(3)

  const byeList = byePlayersEnLlave(porRonda)
  const bye = byeList[0] || { nombre: 'POR DEFINIR', academia: '', vacio: true }

  L.player(0, 0, bye, seeds[0])
  L.border(0, COL_G, { bottom: true })
  L.matchH(1, fin.numero_combate, cancha)
  L.player(2, 1, pre.chung, seeds[1])
  L.border(2, COL_H, { right: true })
  L.bridge(2)
  L.spacer(3)
  L.matchG(3, pre.numero_combate, cancha)
  L.closeH(3)
  L.player(4, 2, pre.hong, seeds[2])
  L.closeG(4)

  return L.finalize(5, COL_I + 1)
}

/** 6 personas — FESTCUP WELTER: semillas 1↑2↓, QF en F, SF en G, final en H */
function layout6(cols, cancha, porRonda) {
  const L = createLayout()
  const r1 = cols[1]?.combates || []
  const fin = cols[2]?.combates?.[0] ?? { numero_combate: '' }
  const sfTop = r1[0] ?? { numero_combate: '' }
  const sfBot = r1[1] ?? { numero_combate: '' }
  const seeds = bracketSeeds(6)
  const slots = slotsFestcup6(cols, porRonda)

  const maxR = Math.max(0, ...Object.keys(porRonda || {}).map(Number))
  const primera = porRonda[maxR] || []
  const qf54 = primera.find((m) => !m.es_bye && m.match_numero === 2)
  const qf36 = primera.find((m) => !m.es_bye && m.match_numero === 4)
  const qfTopNo = qf54?.orden_pista ?? cols[0]?.combates?.[0]?.numero_combate ?? ''
  const qfBotNo = qf36?.orden_pista ?? cols[0]?.combates?.[1]?.numero_combate ?? ''

  const finOutTop = 2
  const finOutBot = 8
  const finMid = 5

  // ── Mitad superior ──
  L.player(0, 0, slots[0], seeds[0])
  L.border(0, COL_G, { bottom: true })

  L.border(1, COL_G, { top: true, right: true })
  if (sfTop.numero_combate) {
    L.set(1, COL_G, { v: fmtCombate(sfTop.numero_combate, cancha), align: 'center', matchNo: true })
  }

  L.player(2, 1, slots[1], seeds[1])
  L.border(2, COL_F, { right: true })
  L.border(2, COL_G, { right: true })

  L.spacer(3)
  L.border(3, COL_F, { top: true, right: true })
  if (qfTopNo) L.set(3, COL_F, { v: fmtCombate(qfTopNo, cancha), align: 'center', matchNo: true })
  L.border(3, COL_G, { right: true })

  L.player(4, 2, slots[2], seeds[2])
  L.border(4, COL_F, { bottom: true, right: true })
  L.border(4, COL_G, { bottom: true, right: true })

  // Salida SF superior → final (H) en fila 2 (centro mitad superior)
  L.border(finOutTop, COL_G, { bottom: true, right: true })
  L.border(finOutTop, COL_H, { bottom: true, top: true, right: true })
  if (fin.numero_combate) {
    L.set(finOutTop, COL_H, { v: fmtCombate(fin.numero_combate, cancha), align: 'center', matchNo: true })
  }
  for (let r = finOutTop + 1; r < finOutBot; r++) L.border(r, COL_H, { right: true })
  L.border(finOutBot, COL_H, { bottom: true, right: true })
  L.bridge(finMid)

  // ── Mitad inferior ──
  L.player(6, 3, slots[3], seeds[3])
  L.border(6, COL_F, { right: true })

  L.spacer(7)
  L.border(7, COL_F, { top: true, right: true })
  if (qfBotNo) L.set(7, COL_F, { v: fmtCombate(qfBotNo, cancha), align: 'center', matchNo: true })
  L.border(7, COL_G, { right: true })

  L.player(8, 4, slots[4], seeds[4])
  L.border(8, COL_F, { bottom: true, right: true })
  L.border(8, COL_G, { right: true, bottom: true })

  L.border(9, COL_G, { right: true })

  L.player(10, 5, slots[5], seeds[5])
  L.border(10, COL_G, { bottom: true, right: true })
  if (sfBot.numero_combate) {
    L.set(10, COL_G, { v: fmtCombate(sfBot.numero_combate, cancha), align: 'center', matchNo: true })
  }

  return L.finalize(11, COL_I + 1)
}

/** 4 / 8 / 16 — árbol estándar con filas gap */
function layoutPower2(cols, cancha) {
  const L = createLayout()
  const numM0 = cols[0].combates.length
  const totalRows = numM0 * ROWS_PER_MATCH + (numM0 - 1) * GAP
  const seeds = bracketSeeds(numM0 * 2)
  const exitRow = new Map()

  const blockStart = (mi) => mi * (ROWS_PER_MATCH + GAP)
  const rTop = (mi) => blockStart(mi)
  const rMid = (mi) => blockStart(mi) + 1
  const rBot = (mi) => blockStart(mi) + 2
  const isGap = (r) => r > 0 && (r + 1) % (ROWS_PER_MATCH + GAP) === 0

  cols[0].combates.forEach((m, mi) => {
    L.player(rTop(mi), mi * 2, m.chung, seeds[mi * 2])
    L.spacer(rMid(mi))
    L.matchG(rMid(mi), m.numero_combate, cancha)
    if (mi === 1) L.border(rMid(mi), COL_G, { bottom: true })
    L.player(rBot(mi), mi * 2 + 1, m.hong, seeds[mi * 2 + 1])
    L.closeG(rBot(mi))
  })

  for (let ri = 1; ri < cols.length; ri++) {
    const col = COL_G + ri
    const prev = col - 1
    const prevN = cols[ri - 1].combates.length

    cols[ri].combates.forEach((m, mi) => {
      const fA = mi * 2
      const fB = mi * 2 + 1
      let rS, rE
      if (ri === 1) {
        rS = rBot(fA)
        if (fB < prevN) {
          rE = mi === 1 ? rBot(fB) : rMid(fB)
        } else {
          rE = rS
        }
      } else {
        rS = exitRow.get(`${ri - 1},${fA}`) ?? rMid(fA)
        rE = fB < prevN ? (exitRow.get(`${ri - 1},${fB}`) ?? rMid(fB)) : rS
      }
      const lo = Math.min(rS, rE)
      const hi = Math.max(rS, rE)
      const mid = Math.floor((lo + hi) / 2)
      exitRow.set(`${ri},${mi}`, hi)

      const isFinal = ri === cols.length - 1

      L.border(lo, col, { top: true, right: true, bottom: true })
      for (let r = lo + 1; r < hi; r++) L.border(r, col, { right: true })
      if (hi > lo) L.border(hi, col, { bottom: true, right: true })

      if (m.numero_combate) {
        L.set(lo, col, { v: fmtCombate(m.numero_combate, cancha), align: 'center', matchNo: true })
      }

      if (isFinal && hi > lo + 1) L.bridge(mid)
    })
  }

  return L.finalize(totalRows, COL_G + cols.length + 1)
}

export function layoutFestcupBracket(porRonda, { cancha } = {}) {
  const cols = columnasBracket(porRonda)
  if (!cols.length) return null

  const type = bracketType(cols, porRonda)
  if (type === 2) return layout2(cols, cancha)
  if (type === 3) return layout3FromData(cols, cancha, porRonda)
  if (type === 6) return layout6(cols, cancha, porRonda)
  if (type === 4 || type === 8 || type === 16) return layoutPower2(cols, cancha)

  return layoutPower2(cols, cancha)
}
