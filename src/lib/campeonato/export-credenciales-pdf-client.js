'use client'

import { jsPDF } from 'jspdf'

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
  await new Promise((r) => setTimeout(r, 150))
}

function visibleSheets(sheetSelector) {
  return [...document.querySelectorAll(sheetSelector)].filter(
    (el) => !el.classList.contains('print-hide')
  )
}

function captureScale(pageCount) {
  if (pageCount > 40) return 2
  if (pageCount > 20) return 2.5
  return Math.min(3, Math.max(2, window.devicePixelRatio || 2))
}

function jpegQualityForCount(pageCount) {
  return pageCount > 30 ? 0.88 : 0.92
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
async function buildPdfFromFrentes(frentes, { onProgress, scale, jpegQuality, progressBase = 0, progressTotal }) {
  if (!frentes.length) throw new Error('Sin credenciales para este PDF.')

  const html2canvas = await loadHtml2Canvas()
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
      canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: el.offsetWidth,
        height: el.offsetHeight,
      })

      const img = canvas.toDataURL('image/jpeg', jpegQuality)
      if (i > 0) pdf.addPage([CARD_W_MM, CARD_H_MM])
      pdf.addImage(img, 'JPEG', 0, 0, CARD_W_MM, CARD_H_MM, undefined, 'FAST')
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

    await new Promise((r) => setTimeout(r, totalProgress > 15 ? 40 : 0))
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

  const scale = captureScale(frentes.length)
  const jpegQuality = jpegQualityForCount(frentes.length)
  const pdf = await buildPdfFromFrentes(frentes, { onProgress, scale, jpegQuality })
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
  const scale = captureScale(totalPages)
  const jpegQuality = jpegQualityForCount(totalPages)

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const folder = zip.folder('credenciales') || zip
  const usedNames = new Set()
  let pageDone = 0

  for (const grupoSheets of groups.values()) {
    const frentes = grupoSheets.map((s) => s.querySelector('.credencial-frente')).filter(Boolean)
    const pdf = await buildPdfFromFrentes(frentes, {
      scale,
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
