/** Valores base alineados con credenciales.css (FestCup 2026) */
export const FESTCUP_TEXT_FIT_DEFAULTS = {
  nombreMm: 2.35,
  catMm: 1.55,
  gapMm: 0.5,
  bottomMm: 7,
  maxTopPct: 75.2,
  minNombreMm: 1.88,
  minCatMm: 1.22,
  minGapMm: 0.32,
}

/**
 * Ajusta tamaño de nombre/categoría para no invadir la franja de logos (web / vista previa).
 * @param {HTMLElement} frenteEl .credencial-frente--festcup2026
 * @param {Partial<typeof FESTCUP_TEXT_FIT_DEFAULTS>} rules
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

  const minTop = card.top + card.height * (cfg.maxTopPct / 100)

  let nombreMm = cfg.nombreMm
  let catMm = cfg.catMm
  let gapMm = cfg.gapMm

  const apply = () => {
    nom.style.fontSize = `${nombreMm}mm`
    if (cat) cat.style.fontSize = `${catMm}mm`
    texto.style.gap = `${gapMm}mm`
  }

  apply()

  for (let i = 0; i < 48; i++) {
    const top = texto.getBoundingClientRect().top
    if (top >= minTop - 0.5) return

    if (nombreMm > cfg.minNombreMm) {
      nombreMm -= 0.07
      apply()
      continue
    }
    if (cat && catMm > cfg.minCatMm) {
      catMm -= 0.05
      apply()
      continue
    }
    if (gapMm > cfg.minGapMm) {
      gapMm -= 0.03
      apply()
      continue
    }
    return
  }
}
