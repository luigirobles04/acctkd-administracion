import { readUploadFile } from '@/lib/campeonato/upload-file'
import { BUCKET } from '@/lib/campeonato/foto-competidor'

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg'])

export function validateAcademiaLogo({ buffer, contentType, filename }) {
  if (!buffer?.length) throw new Error('Archivo de logo vacío')
  if (buffer.length > LOGO_MAX_BYTES) {
    throw new Error('El logo no puede superar 2 MB')
  }
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const type = (contentType || '').toLowerCase()
  const typeOk = ALLOWED_TYPES.has(type) || type === 'image/pjpeg'
  const extOk = ALLOWED_EXT.has(ext)
  if (!typeOk && !extOk) {
    throw new Error('Solo se permiten imágenes PNG o JPG')
  }
  if (!extOk) {
    throw new Error('Solo se permiten archivos .png o .jpg')
  }
}

export async function readAndValidateLogoFile(file) {
  const parsed = await readUploadFile(file)
  validateAcademiaLogo(parsed)
  return parsed
}

export async function uploadAcademiaLogo(sb, idAcademia, { buffer, contentType, filename }) {
  validateAcademiaLogo({ buffer, contentType, filename })
  const ext = (filename.split('.').pop() || 'png').toLowerCase().replace('jpeg', 'jpg')
  const path = `academia-logos/${idAcademia}/logo_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`
  const { error: errUp } = await sb.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: contentType || 'image/png', upsert: true })
  if (errUp) throw errUp
  const { error: errDb } = await sb.from('academia').update({ logo_url: path }).eq('id_academia', idAcademia)
  if (errDb) throw errDb
  return path
}
