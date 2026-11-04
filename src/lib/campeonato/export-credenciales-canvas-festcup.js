'use client'

import { FESTCUP_2026_CREDENCIAL_LAYOUT } from '@/lib/campeonato/credencial-layout'

export const CAPTURE_DPI = 300
export const CAPTURE_PX_W = Math.round((54 / 25.4) * CAPTURE_DPI)
export const CAPTURE_PX_H = Math.round((86 / 25.4) * CAPTURE_DPI)

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

function fitTextBlock(ctx, nombre, categoria, zone, exportRules, W, H) {
  const maxW = ((zone.width ?? 86) / 100) * W
  const cx = (zone.left / 100) * W
  const startTop = ((zone.top ?? 79.5) / 100) * H
  const bottomMargin = mmToPx(exportRules.bottomMm ?? 10.8)
  const maxBlockH = mmToPx(exportRules.maxHeightMm ?? 12.4)
  const minTop = ((exportRules.minTopPct ?? 76.5) / 100) * H
  const maxBottom = H - bottomMargin

  let nombreMm = 2.35
  let catMm = 1.65
  let gapMm = 0.55

  const nombreStr = `${nombre || ''}`.trim()
  const catStr = `${categoria || ''}`.trim()

  for (let i = 0; i < 24; i++) {
    ctx.font = `900 ${mmToPx(nombreMm)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`
    const nom = measureLines(ctx, nombreStr, maxW, mmToPx(nombreMm), 1.08)
    ctx.font = `600 ${mmToPx(catMm)}px Arial, "Helvetica Neue", sans-serif`
    const cat = catStr ? measureLines(ctx, catStr, maxW, mmToPx(catMm), 1.22) : { lines: [], height: 0 }

    const gap = catStr ? mmToPx(gapMm) : 0
    const totalH = nom.height + gap + cat.height
    let startY = startTop
    const endY = startY + totalH

    if (endY <= maxBottom && totalH <= maxBlockH && startY >= minTop) {
      return { cx, startY, maxW, nom, cat, nombreMm, catMm, gap }
    }

    startY = maxBottom - totalH
    if (totalH <= maxBlockH && startY >= minTop) {
      return { cx, startY, maxW, nom, cat, nombreMm, catMm, gap }
    }

    if (nombreMm > 2.05) {
      nombreMm -= 0.1
      continue
    }
    if (catMm > 1.42) {
      catMm -= 0.07
      continue
    }
    if (gapMm > 0.35) {
      gapMm -= 0.05
      continue
    }
    return { cx, startY: Math.max(minTop, maxBottom - Math.min(totalH, maxBlockH)), maxW, nom, cat, nombreMm, catMm, gap }
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
        H
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
    if (block.nom.lines.length) {
      y = drawLines(
        ctx,
        block.nom.lines,
        block.cx,
        y,
        nomPx,
        1.08,
        '#0d0d0d',
        `900 ${nomPx}px "Arial Black", "Helvetica Neue", Arial, sans-serif`
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
        1.22,
        '#2a2a2a',
        `600 ${catPx}px Arial, "Helvetica Neue", sans-serif`
      )
    }
  }

  return canvas
}
