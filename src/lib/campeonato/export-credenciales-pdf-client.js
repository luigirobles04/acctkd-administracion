'use client'

import { jsPDF } from 'jspdf'
import {
  CAPTURE_PX_H,
  CAPTURE_PX_W,
  renderFestcupCredencialCanvas,
} from '@/lib/campeonato/export-credenciales-canvas-festcup'
import { applyFestcupCredencialTextFit } from '@/lib/campeonato/fit-festcup-credencial-texto'

const CARD_W_MM = 54
const CARD_H_MM = 86

export function slugArchivo(s) {
  return `${s || 'credenciales'}`
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'credenciales'
}

function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function pct(value) {
  const n = parseFloat(String(value || '0').replace('%', ''))
  return Number.isFinite(n) ? n : 0
}

/** Convierte capas con % + translate (html2canvas las rompe) a px absolutos. */
function flattenAbsoluteLayer(el, W, H) {
  const st = el.style
  if (!st.left && !st.top && !st.width) return

  const leftPct = pct(st.left)
  const topPct = pct(st.top)
  const widthPct = pct(st.width)
  const heightPct = st.height ? pct(st.height) : null
  const transform = st.transform || ''

  const w = (widthPct / 100) * W
  const h = heightPct != null ? (heightPct / 100) * H : w
  const textZone =
    el.classList.contains('cred-festcup-texto') ||
    (el.classList.contains('cred-datos-slot') && !heightPct)

  if (transform.includes('translate(-50%')) {
    st.left = `${(leftPct / 100) * W - w / 2}px`
    st.top = `${(topPct / 100) * H - h / 2}px`
  } else if (transform.includes('translateX(-50%')) {
    st.left = `${(leftPct / 100) * W - w / 2}px`
    st.top = `${(topPct / 100) * H}px`
  } else {
    st.left = `${(leftPct / 100) * W}px`
    st.top = `${(topPct / 100) * H}px`
  }

  st.width = `${w}px`
  if (textZone) {
    st.height = 'auto'
    st.minHeight = '0'
  } else {
    st.height = `${h}px`
  }
  st.transform = 'none'
  st.aspectRatio = 'auto'
  st.maxWidth = 'none'
  st.maxHeight = 'none'
}

function flattenForCapture(root, W, H) {
  root.querySelectorAll(
    '.cred-foto-slot, .cred-academia-logo, .cred-festcup-texto, .cred-datos-slot'
  ).forEach((el) => flattenAbsoluteLayer(el, W, H))
}

function getCaptureMount() {
  let mount = document.getElementById('credenciales-capture-mount')
  if (!mount) {
    mount = document.createElement('div')
    mount.id = 'credenciales-capture-mount'
    mount.setAttribute('aria-hidden', 'true')
    Object.assign(mount.style, {
      position: 'fixed',
      left: '-12000px',
      top: '0',
      width: `${CAPTURE_PX_W}px`,
      height: `${CAPTURE_PX_H}px`,
      overflow: 'hidden',
      zIndex: '-1',
      pointerEvents: 'none',
      opacity: '1',
    })
    document.body.appendChild(mount)
  }
  return mount
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function inlineImagesAsDataUrls(root) {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.getAttribute('src')
      if (!src || src.startsWith('data:')) return
      try {
        const res = await fetch(src, { credentials: 'include' })
        if (!res.ok) return
        img.src = await blobToDataUrl(await res.blob())
      } catch {
        /* mantener src original */
      }
    })
  )
}

async function waitImages(root) {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          setTimeout(done, 8000)
        })
    )
  )
  await new Promise((r) => setTimeout(r, 80))
}

async function captureCredencialCanvas(sourceEl, html2canvas) {
  if (sourceEl.classList.contains('credencial-frente--festcup2026')) {
    applyFestcupCredencialTextFit(sourceEl)
    return renderFestcupCredencialCanvas(sourceEl)
  }

  const mount = getCaptureMount()
  mount.replaceChildren()

  const clone = sourceEl.cloneNode(true)
  Object.assign(clone.style, {
    width: `${CAPTURE_PX_W}px`,
    height: `${CAPTURE_PX_H}px`,
    margin: '0',
    boxShadow: 'none',
    borderRadius: '0',
  })
  mount.appendChild(clone)

  flattenForCapture(clone, CAPTURE_PX_W, CAPTURE_PX_H)
  await inlineImagesAsDataUrls(clone)
  await waitImages(clone)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  try {
    return await html2canvas(clone, {
      scale: 1,
      width: CAPTURE_PX_W,
      height: CAPTURE_PX_H,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
  } finally {
    mount.replaceChildren()
  }
}

function visibleSheets(sheetSelector) {
  return [...document.querySelectorAll(sheetSelector)].filter(
    (el) => !el.classList.contains('print-hide')
  )
}

function jpegQualityForCount(pageCount) {
  return pageCount > 30 ? 0.9 : 0.93
}

function alumnoKey(sheet) {
  const idPerfil = sheet.dataset.idPerfil
  if (idPerfil) return `p-${idPerfil}`
  const nombre = sheet.dataset.alumnoNombre?.trim()
  if (nombre) return `n-${slugArchivo(nombre)}`
  const dorsal = sheet.dataset.dorsal?.trim()
  if (dorsal) return `d-${slugArchivo(dorsal)}`
  return `l-${sheet.dataset.idLinea || 'x'}`
}

function nombrePdfAlumno(sheets, used) {
  const first = sheets[0]
  const dorsal = first?.dataset?.dorsal?.trim()
  const nombre = first?.dataset?.alumnoNombre?.trim()
  let base = slugArchivo(nombre || dorsal || 'alumno')
  if (dorsal && nombre) base = `${slugArchivo(dorsal)}-${base}`
  let candidate = base
  let n = 2
  while (used.has(candidate)) {
    candidate = `${base}-${n}`
    n += 1
  }
  used.add(candidate)
  return candidate
}

async function loadHtml2Canvas() {
  const { default: html2canvas } = await import('html2canvas')
  return html2canvas
}

/**
 * @param {HTMLElement[]} frentes
 * @returns {Promise<jsPDF>}
 */
async function buildPdfFromFrentes(frentes, { onProgress, jpegQuality, progressBase = 0, progressTotal }) {
  if (!frentes.length) throw new Error('Sin credenciales para este PDF.')

  let html2canvas = null
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [CARD_W_MM, CARD_H_MM],
    compress: true,
  })

  const total = frentes.length
  const totalProgress = progressTotal ?? total

  for (let i = 0; i < total; i++) {
    onProgress?.(progressBase + i + 1, totalProgress)
    const el = frentes[i]
    await waitImages(el)

    let canvas
    try {
      if (!el.classList.contains('credencial-frente--festcup2026') && !html2canvas) {
        html2canvas = await loadHtml2Canvas()
      }
      canvas = await captureCredencialCanvas(el, html2canvas)
      const img = canvas.toDataURL('image/jpeg', jpegQuality)
      if (i > 0) pdf.addPage([CARD_W_MM, CARD_H_MM])
      pdf.addImage(img, 'JPEG', 0, 0, CARD_W_MM, CARD_H_MM, undefined, 'MEDIUM')
    } catch (err) {
      const globalIdx = progressBase + i + 1
      throw new Error(
        `Falló en credencial ${globalIdx} de ${totalProgress}. Recarga e intenta de nuevo en Chrome (PC). (${err?.message || err})`
      )
    } finally {
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }

    await new Promise((r) => setTimeout(r, totalProgress > 15 ? 30 : 0))
  }

  return pdf
}

/** Un solo PDF: una credencial (inscripción) por página. */
export async function descargarCredencialesPdf({
  filename,
  sheetSelector = '.credencial-sheet',
  onProgress,
} = {}) {
  const sheets = visibleSheets(sheetSelector)
  const frentes = sheets.map((s) => s.querySelector('.credencial-frente')).filter(Boolean)

  if (!frentes.length) {
    throw new Error('No hay credenciales visibles para exportar.')
  }

  const jpegQuality = jpegQualityForCount(frentes.length)
  const pdf = await buildPdfFromFrentes(frentes, { onProgress, jpegQuality })
  pdf.save(filename || `credenciales-${slugArchivo()}.pdf`)
}

/** ZIP: un PDF por alumno (varias páginas si tiene más de una inscripción con dorsal). */
export async function descargarCredencialesZipPorAlumno({
  filename,
  sheetSelector = '.credencial-sheet',
  onProgress,
} = {}) {
  const sheets = visibleSheets(sheetSelector)
  if (!sheets.length) {
    throw new Error('No hay credenciales visibles para exportar.')
  }

  const groups = new Map()
  for (const sheet of sheets) {
    const key = alumnoKey(sheet)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(sheet)
  }

  const totalPages = [...groups.values()].reduce(
    (n, grupo) => n + grupo.filter((s) => s.querySelector('.credencial-frente')).length,
    0
  )
  const jpegQuality = jpegQualityForCount(totalPages)

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const folder = zip.folder('credenciales') || zip
  const usedNames = new Set()
  let pageDone = 0

  for (const grupoSheets of groups.values()) {
    const frentes = grupoSheets.map((s) => s.querySelector('.credencial-frente')).filter(Boolean)
    const pdf = await buildPdfFromFrentes(frentes, {
      jpegQuality,
      progressBase: pageDone,
      progressTotal: totalPages,
      onProgress: (n, total) => onProgress?.(n, total, { fase: 'pdf' }),
    })
    pageDone += frentes.length
    const pdfName = `${nombrePdfAlumno(grupoSheets, usedNames)}.pdf`
    folder.file(pdfName, pdf.output('blob'))
  }

  onProgress?.(totalPages, totalPages, { fase: 'zip' })
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  descargarBlob(zipBlob, filename || `credenciales-por-alumno-${slugArchivo()}.zip`)
}
