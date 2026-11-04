/** Valores base alineados con credenciales.css (FestCup 2026) */
export const FESTCUP_TEXT_FIT_DEFAULTS = {
  cardHmm: 86,
  nombreMm: 2.35,
  catMm: 1.55,
  gapMm: 0.5,
  /** Margen sobre la franja de logos impresa en plantilla */
  bottomMm: 11.5,
  maxTopPct: 73.5,
  minNombreMm: 1.72,
  minCatMm: 1.08,
  minGapMm: 0.28,
  /** Último recurso si el nombre es extremadamente largo */
  floorNombreMm: 1.48,
  floorCatMm: 0.98,
}

/**
 * Reduce tipografía hasta que el bloque quepa en la altura disponible (entre maxTop y franja de logos).
 * @param {(nombreMm: number, catMm: number, gapMm: number) => { totalH: number }} measureBlock
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

/**
 * Ajusta tamaño de nombre/categoría en DOM (web / vista previa).
 * @param {HTMLElement} frenteEl .credencial-frente--festcup2026
 */
export function applyFestcupCredencialTextFit(frenteEl, rules = {}) {
  const cfg = { ...FESTCUP_TEXT_FIT_DEFAULTS, ...rules }
  const texto = frenteEl?.querySelector('.cred-festcup-texto')
  if (!texto) return

  const nom = texto.querySelector('.cred-festcup-nombre')
  const cat = texto.querySelector('.cred-festcup-categoria')
  if (!nom) return

  nom.style.fontSize = ''
  if (cat) cat.style.fontSize = ''
  texto.style.gap = ''

  const card = frenteEl.getBoundingClientRect()
  if (!card.height) return

  const pxPerMm = card.height / cfg.cardHmm

  const measureBlock = (nombreMm, catMm, gapMm) => {
    nom.style.fontSize = `${nombreMm}mm`
    if (cat) cat.style.fontSize = `${catMm}mm`
    texto.style.gap = `${gapMm}mm`
    return { totalH: texto.getBoundingClientRect().height / pxPerMm }
  }

  const { nombreMm, catMm, gapMm } = shrinkFestcupTextToHeight(measureBlock, cfg)
  nom.style.fontSize = `${nombreMm}mm`
  if (cat) cat.style.fontSize = `${catMm}mm`
  texto.style.gap = `${gapMm}mm`
}
