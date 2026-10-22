/** Foto carnet en navegador: acepta lo que sube el usuario y normaliza para credencial/subida. */

const PREVIEW_MAX_SIDE = 800
const UPLOAD_MAX_SIDE = 1600
const JPEG_QUALITY = 0.88

function pareceImagen(file) {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name || '')
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))), type, quality)
  })
}

async function bitmapToJpegFile(bitmap, originalName, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
  const base = (originalName || 'foto').replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}

/**
 * @returns {Promise<{ ok: true, preview: string, uploadFile: File } | { ok: false, error: string }>}
 */
export async function validarFotoCarnet(file) {
  if (!file) return { ok: false, error: 'Selecciona una imagen.' }
  if (!pareceImagen(file)) {
    return { ok: false, error: 'Elige un archivo de imagen (JPG, PNG, foto del celular, etc.).' }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const previewFile = await bitmapToJpegFile(bitmap, file.name, PREVIEW_MAX_SIDE)
    const uploadFile = await bitmapToJpegFile(bitmap, file.name, UPLOAD_MAX_SIDE)
    bitmap.close()
    const preview = URL.createObjectURL(previewFile)
    return { ok: true, preview, uploadFile }
  } catch {
    const preview = URL.createObjectURL(file)
    return { ok: true, preview, uploadFile: file }
  }
}
