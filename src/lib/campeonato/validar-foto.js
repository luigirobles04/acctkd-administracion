/** Validación foto carnet en navegador (formato/tamaño; sin exigir fondo blanco). */

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

  return { ok: true, preview: canvas.toDataURL('image/jpeg', 0.85) }
}
