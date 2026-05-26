/** Validación foto carnet en navegador · fondo blanco + rostro aproximado */

export const FOTO_MAX_BYTES = 2 * 1024 * 1024
export const FOTO_MIN_PX = 400

export async function validarFotoCarnet(file) {
  if (!file) return { ok: false, error: 'Selecciona una imagen.' }
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
    return { ok: false, error: 'Formato: JPG o PNG.' }
  }
  if (file.size > FOTO_MAX_BYTES) {
    return { ok: false, error: 'Máximo 2 MB.' }
  }

  const bitmap = await createImageBitmap(file)
  if (bitmap.width < FOTO_MIN_PX || bitmap.height < FOTO_MIN_PX) {
    bitmap.close()
    return { ok: false, error: `Mínimo ${FOTO_MIN_PX}×${FOTO_MIN_PX} px.` }
  }

  const canvas = document.createElement('canvas')
  const maxSide = 800
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const w = canvas.width
  const h = canvas.height

  const blancoRatio = muestrearFondoBlanco(data, w, h)
  if (blancoRatio < 0.55) {
    return { ok: false, error: 'Usa fondo blanco o muy claro.' }
  }

  const rostro = detectarRegionCentral(data, w, h)
  if (!rostro) {
    return { ok: false, error: 'Rostro no visible. Centra el rostro en la foto.' }
  }

  if (typeof FaceDetector !== 'undefined') {
    try {
      const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
      const faces = await detector.detect(blob)
      if (!faces?.length) {
        return { ok: false, error: 'No se detectó rostro. Intenta otra foto.' }
      }
    } catch {
      /* fallback heurístico ya pasó */
    }
  }

  return { ok: true, preview: canvas.toDataURL('image/jpeg', 0.85) }
}

function esBlanco(r, g, b) {
  return r > 200 && g > 200 && b > 200
}

function muestrearFondoBlanco(data, w, h) {
  const puntos = []
  const margen = Math.floor(Math.min(w, h) * 0.08)
  for (let x = 0; x < w; x += Math.floor(w / 12)) {
    puntos.push([x, margen], [x, h - margen])
  }
  for (let y = 0; y < h; y += Math.floor(h / 12)) {
    puntos.push([margen, y], [w - margen, y])
  }
  let blancos = 0
  for (const [x, y] of puntos) {
    const i = (y * w + x) * 4
    if (esBlanco(data[i], data[i + 1], data[i + 2])) blancos++
  }
  return blancos / puntos.length
}

/** Centro superior: debe haber píxeles no blancos (cara/cabello) */
function detectarRegionCentral(data, w, h) {
  const x0 = Math.floor(w * 0.25)
  const x1 = Math.floor(w * 0.75)
  const y0 = Math.floor(h * 0.1)
  const y1 = Math.floor(h * 0.55)
  let noBlancos = 0
  let total = 0
  for (let y = y0; y < y1; y += 4) {
    for (let x = x0; x < x1; x += 4) {
      const i = (y * w + x) * 4
      total++
      if (!esBlanco(data[i], data[i + 1], data[i + 2])) noBlancos++
    }
  }
  return total > 0 && noBlancos / total > 0.08
}
