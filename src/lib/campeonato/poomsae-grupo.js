import { MODALIDADES } from '@/lib/campeonato/constants'
import { compareCategoriasPorPoomsae } from '@/lib/campeonato/poomsae-formas'

/** Orden de bloques: individual → parejas → equipo (misma forma/edad en catálogo). */
export const POOMSAE_MODALIDAD_ORDEN = [
  'poomsae_individual',
  'poomsae_pareja_reconocida',
  'poomsae_pareja_freestyle',
  'poomsae_equipo',
]

export function poomsaeGrupoKey(idCategoria, modalidad) {
  return `${Number(idCategoria)}:${modalidad}`
}

export function parsePoomsaeGrupoKey(grupoKey) {
  if (!grupoKey || typeof grupoKey !== 'string') return null
  const idx = grupoKey.indexOf(':')
  if (idx <= 0) return null
  const idCategoria = Number(grupoKey.slice(0, idx))
  const modalidad = grupoKey.slice(idx + 1)
  if (!idCategoria || !modalidad) return null
  return { idCategoria, modalidad }
}

export function modalidadPoomsaeRank(modalidad) {
  const i = POOMSAE_MODALIDAD_ORDEN.indexOf(modalidad)
  return i >= 0 ? i : 99
}

export function labelModalidadPoomsae(modalidad) {
  return MODALIDADES[modalidad]?.label || modalidad
}

/** Orden en listados: forma/edad/género del catálogo, luego modalidad de competencia. */
export function compareGruposPoomsae(a, b) {
  const ca = compareCategoriasPorPoomsae(
    { nombre: a.nombre, genero: a.genero },
    { nombre: b.nombre, genero: b.genero },
  )
  if (ca !== 0) return ca
  return modalidadPoomsaeRank(a.modalidad_key) - modalidadPoomsaeRank(b.modalidad_key)
}
