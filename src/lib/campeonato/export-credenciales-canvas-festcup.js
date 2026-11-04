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
      return await new Promise((resolve, reject) => {
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

function drawCenteredText(
  ctx,
  text,
  zone,
  W,
  H,
  {
    fontSizeMm,
    fontWeight,
    color,
    lineHeight = 1.12,
    fontFamily = '"Arial Black", "Helvetica Neue", Arial, sans-serif',
    startYpx = null,
  }
) {
  const content = `${text || ''}`.trim()
  if (!content) return startYpx ?? (zone.top / 100) * H
  const maxW = ((zone.width ?? 86) / 100) * W
  const cx = (zone.left / 100) * W
  let y = startYpx ?? (zone.top / 100) * H
  const fontSize = mmToPx(fontSizeMm)
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const lines = wrapLines(ctx, content, maxW)
  for (const line of lines) {
    ctx.fillText(line, cx, y)
    y += fontSize * lineHeight
  }
  ctx.restore()
  return y
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

  const afterNombre = drawCenteredText(ctx, nombre, layout.nombre, W, H, {
    fontSizeMm: 2.35,
    fontWeight: 900,
    color: '#0d0d0d',
    lineHeight: 1.1,
  })
  const catStartY = afterNombre + mmToPx(0.65)
  drawCenteredText(ctx, categoria, layout.categoria, W, H, {
    fontSizeMm: 1.65,
    fontWeight: 600,
    color: '#2a2a2a',
    lineHeight: 1.25,
    fontFamily: 'Arial, "Helvetica Neue", sans-serif',
    startYpx: catStartY,
  })

  return canvas
}
