'use client'

import { FESTCUP_2026_CREDENCIAL_LAYOUT } from '@/lib/campeonato/credencial-layout'

export const CAPTURE_DPI = 300
export const CAPTURE_PX_W = Math.round((54 / 25.4) * CAPTURE_DPI)
export const CAPTURE_PX_H = Math.round((86 / 25.4) * CAPTURE_DPI)

const EXPORT_TEXT = {
  nombreMm: 2.35,
  catMm: 1.55,
  gapMm: 0.5,
  bottomMm: 8.5,
  minStartPct: 77.8,
  minNombreMm: 1.75,
  minCatMm: 1.12,
  minGapMm: 0.3,
  floorNombreMm: 1.5,
  floorCatMm: 1.0,
}

function mmToPx(mm) {
  return (mm / 25.4) * CAPTURE_DPI
}

async function loadImageBitmap(src) {
  if (!src?.trim()) return null
  try {
    const res = await fetch(src, { credentials: 'include' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob)
    }
    const url = URL.createObjectURL(blob)
    try {
      return await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return null
  }
}

function drawImageCover(ctx, img, x, y, w, h) {
  const iw = img.width
  const ih = img.height
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function drawImageContain(ctx, img, x, y, w, h) {
  const iw = img.width
  const ih = img.height
  const scale = Math.min(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function centerRect(zone, W, H) {
  const w = ((zone.width ?? 0) / 100) * W
  const h = zone.height ? (zone.height / 100) * H : w
  const cx = (zone.left / 100) * W
  const cy = (zone.top / 100) * H
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

function wrapLines(ctx, text, maxWidth) {
  const words = `${text || ''}`.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines = []
  let line = words[0]
  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`
    if (ctx.measureText(test).width <= maxWidth) line = test
    else {
      lines.push(line)
      line = words[i]
    }
  }
  lines.push(line)
  return lines
}

function measureLines(ctx, text, maxW, fontSizePx, lineHeight) {
  const lines = wrapLines(ctx, text, maxW)
  const h = lines.length * fontSizePx * lineHeight
  return { lines, height: h }
}

function measureBlockPx(ctx, nombreStr, catStr, maxW, nombreMm, catMm, gapMm) {
  const nomLh = 1.1
  const catLh = 1.28
  ctx.font = `900 ${mmToPx(nombreMm)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`
  const nom = measureLines(ctx, nombreStr, maxW, mmToPx(nombreMm), nomLh)
  ctx.font = `600 ${mmToPx(catMm)}px Arial, "Helvetica Neue", sans-serif`
  const cat = catStr ? measureLines(ctx, catStr, maxW, mmToPx(catMm), catLh) : { lines: [], height: 0 }
  const gap = catStr ? mmToPx(gapMm) : 0
  return { nom, cat, gap, nomLh, catLh, totalH: nom.height + gap + cat.height }
}

/** Misma posición que web (top del bloque); solo export ajusta si no cabe sobre logos. */
function fitTextBlock(ctx, nombre, categoria, zone, exportRules, W, H) {
  const maxW = ((zone.width ?? 86) / 100) * W
  const cx = (zone.left / 100) * W
  const rules = { ...EXPORT_TEXT, ...exportRules }
  const maxBottom = H - mmToPx(rules.bottomMm)
  const startYWeb = ((zone.top ?? 79.5) / 100) * H
  const minStartY = H * ((rules.minStartPct ?? 77.8) / 100)

  const nombreStr = `${nombre || ''}`.trim()
  const catStr = `${categoria || ''}`.trim()

  let nombreMm = rules.nombreMm
  let catMm = rules.catMm
  let gapMm = rules.gapMm

  const measure = () => measureBlockPx(ctx, nombreStr, catStr, maxW, nombreMm, catMm, gapMm)

  const pack = (block, startY) => ({
    cx,
    startY,
    maxBottom,
    minStartY,
    maxW,
    nom: block.nom,
    cat: block.cat,
    nombreMm,
    catMm,
    gap: block.gap,
    nomLh: block.nomLh,
    catLh: block.catLh,
  })

  for (let pass = 0; pass < 2; pass++) {
    const mins =
      pass === 0
        ? { n: rules.minNombreMm, c: rules.minCatMm, g: rules.minGapMm }
        : { n: rules.floorNombreMm, c: rules.floorCatMm, g: rules.minGapMm }

    for (let i = 0; i < 56; i++) {
      const block = measure()
      if (startYWeb + block.totalH <= maxBottom) {
        return pack(block, startYWeb)
      }

      {
        const shift = startYWeb + block.totalH - maxBottom
        const shiftedY = Math.max(minStartY, startYWeb - shift)
        if (shiftedY + block.totalH <= maxBottom) {
          return pack(block, shiftedY)
        }
      }

      if (nombreMm > mins.n) {
        nombreMm -= pass === 0 ? 0.06 : 0.04
        continue
      }
      if (catMm > mins.c) {
        catMm -= pass === 0 ? 0.045 : 0.03
        continue
      }
      if (gapMm > mins.g) {
        gapMm -= 0.025
        continue
      }

      const blockFinal = measure()
      const fallbackY = Math.max(minStartY, maxBottom - blockFinal.totalH)
      return pack(blockFinal, fallbackY)
    }
  }

  return null
}

function drawLines(ctx, lines, cx, y, fontSizePx, lineHeight, color, font) {
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = font
  let cy = y
  for (const line of lines) {
    ctx.fillText(line, cx, cy)
    cy += fontSizePx * lineHeight
  }
  ctx.restore()
  return cy
}

function readText(frenteEl, ...selectors) {
  for (const sel of selectors) {
    const t = frenteEl.querySelector(sel)?.textContent?.trim()
    if (t) return t
  }
  return ''
}

function imgSrc(el) {
  if (!el || el.classList?.contains('cred-foto-img--empty')) return null
  return el.currentSrc || el.getAttribute('src') || null
}

/**
 * Rasteriza credencial FestCup 2026 sin html2canvas (mismas reglas que la vista web).
 * @param {HTMLElement} frenteEl .credencial-frente--festcup2026
 */
export async function renderFestcupCredencialCanvas(frenteEl) {
  const W = CAPTURE_PX_W
  const H = CAPTURE_PX_H
  const layout = FESTCUP_2026_CREDENCIAL_LAYOUT

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const tplSrc = imgSrc(frenteEl.querySelector('.cred-plantilla-bg'))
  const tpl = await loadImageBitmap(tplSrc)
  if (tpl) {
    ctx.drawImage(tpl, 0, 0, W, H)
  }

  const logoZone = layout.academiaLogo
  const logoSrc = imgSrc(frenteEl.querySelector('.cred-academia-logo'))
  if (logoSrc && logoZone) {
    const logo = await loadImageBitmap(logoSrc)
    if (logo) {
      const { x, y, w, h } = centerRect(
        { left: logoZone.left, top: logoZone.top, width: logoZone.width, height: logoZone.width },
        W,
        H,
      )
      ctx.save()
      ctx.globalAlpha = logoZone.opacity ?? 0.28
      drawImageCover(ctx, logo, x, y, w, h)
      ctx.restore()
    }
  }

  const fotoZone = layout.foto
  const { x: fx, y: fy, w: fw, h: fh } = centerRect(fotoZone, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(fx, fy, fw, fh)

  const fotoEl = frenteEl.querySelector('.cred-foto-img')
  const fotoSrc = imgSrc(fotoEl)
  if (fotoSrc) {
    const foto = await loadImageBitmap(fotoSrc)
    if (foto) drawImageContain(ctx, foto, fx, fy, fw, fh)
  } else {
    const initials = fotoEl?.textContent?.trim() || '?'
    ctx.fillStyle = '#94a3b8'
    ctx.font = `600 ${mmToPx(4)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials.slice(0, 2), fx + fw / 2, fy + fh / 2)
  }

  const nombre = readText(frenteEl, '.cred-festcup-nombre', '.cred-datos-nombre')
  const categoria = readText(frenteEl, '.cred-festcup-categoria', '.cred-datos-categoria-festcup')

  const block = fitTextBlock(ctx, nombre, categoria, layout.nombre, layout.textoExport || {}, W, H)
  if (block) {
    const nomPx = mmToPx(block.nombreMm)
    const catPx = mmToPx(block.catMm)
    let y = block.startY

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, block.minStartY, W, block.maxBottom - block.minStartY)
    ctx.clip()

    if (block.nom.lines.length) {
      y = drawLines(
        ctx,
        block.nom.lines,
        block.cx,
        y,
        nomPx,
        block.nomLh ?? 1.1,
        '#0d0d0d',
        `900 ${nomPx}px "Arial Black", "Helvetica Neue", Arial, sans-serif`,
      )
      y += block.gap
    }
    if (block.cat.lines.length) {
      drawLines(
        ctx,
        block.cat.lines,
        block.cx,
        y,
        catPx,
        block.catLh ?? 1.28,
        '#2a2a2a',
        `600 ${catPx}px Arial, "Helvetica Neue", sans-serif`,
      )
    }
    ctx.restore()
  }

  return canvas
}
