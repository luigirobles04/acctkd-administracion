/** Solo export PDF/canvas — no usar en la vista web. */
export const FESTCUP_TEXT_FIT_DEFAULTS = {
  cardHmm: 86,
  nombreMm: 2.35,
  catMm: 1.55,
  gapMm: 0.5,
  bottomMm: 11.5,
  maxTopPct: 73.5,
  minNombreMm: 1.72,
  minCatMm: 1.08,
  minGapMm: 0.28,
  floorNombreMm: 1.48,
  floorCatMm: 0.98,
}

/**
 * Reduce tipografía hasta que el bloque quepa en la altura disponible (export).
 * @param {(nombreMm: number, catMm: number, gapMm: number) => { totalH: number }} measureBlock totalH en mm
 */
export function shrinkFestcupTextToHeight(measureBlock, rules = {}) {
  const cfg = { ...FESTCUP_TEXT_FIT_DEFAULTS, ...rules }
  const cardHmm = cfg.cardHmm
  const maxBlockHmm =
    cardHmm - cfg.bottomMm - cardHmm * (cfg.maxTopPct / 100)

  let nombreMm = cfg.nombreMm
  let catMm = cfg.catMm
  let gapMm = cfg.gapMm

  const fits = () => {
    const block = measureBlock(nombreMm, catMm, gapMm)
    return block.totalH <= maxBlockHmm + 0.02 ? block : null
  }

  for (let i = 0; i < 56; i++) {
    const block = fits()
    if (block) return { block, nombreMm, catMm, gapMm, maxBlockHmm }
    if (nombreMm > cfg.minNombreMm) {
      nombreMm -= 0.06
      continue
    }
    if (catMm > cfg.minCatMm) {
      catMm -= 0.045
      continue
    }
    if (gapMm > cfg.minGapMm) {
      gapMm -= 0.025
      continue
    }
    break
  }

  for (let i = 0; i < 24; i++) {
    const block = measureBlock(nombreMm, catMm, gapMm)
    if (block.totalH <= maxBlockHmm + 0.02) {
      return { block, nombreMm, catMm, gapMm, maxBlockHmm }
    }
    if (nombreMm > cfg.floorNombreMm) {
      nombreMm -= 0.04
      continue
    }
    if (catMm > cfg.floorCatMm) {
      catMm -= 0.03
      continue
    }
    return { block, nombreMm, catMm, gapMm, maxBlockHmm }
  }

  const block = measureBlock(nombreMm, catMm, gapMm)
  return { block, nombreMm, catMm, gapMm, maxBlockHmm }
}
