export const MAX_INTENTOS_PESAJE = 2

export function evaluarPesoEnCategoria(peso, categoria) {
  const p = Number(peso)
  if (!Number.isFinite(p) || p <= 0) {
    return { ok: false, resultado: 'invalido', mensaje: 'Peso inválido' }
  }
  if (!categoria || categoria.peso_max == null) {
    return { ok: true, resultado: 'ok', mensaje: 'Sin límite de peso' }
  }
  const min = Number(categoria.peso_min || 0)
  const max = Number(categoria.peso_max)
  if (p <= min) {
    return {
      ok: false,
      resultado: 'bajo',
      mensaje: `Bajo el mínimo (${min} kg). Debe superar ${min} kg.`,
      min,
      max,
    }
  }
  if (p > max) {
    return {
      ok: false,
      resultado: 'sobre',
      mensaje: `Sobre el máximo (${max} kg). Excede ${max} kg.`,
      min,
      max,
    }
  }
  return {
    ok: true,
    resultado: 'ok',
    mensaje: `Dentro de rango (${min}–${max} kg)`,
    min,
    max,
  }
}

/** Siguiente categoría kyorugi más pesada (mismo sexo/edad) para recategorización */
export function sugerirCategoriaSuperior(categorias, categoriaActual, perfil, anioCampeonato) {
  if (!categoriaActual || !perfil) return null
  const candidatas = (categorias || [])
    .filter((c) => {
      if (c.modalidad !== 'kyorugi') return false
      if (c.genero && c.genero !== 'X' && perfil.sexo && c.genero !== perfil.sexo) return false
      if (c.edad_min != null && categoriaActual.edad_min != null && c.edad_min !== categoriaActual.edad_min) return false
      if (c.edad_max != null && categoriaActual.edad_max != null && c.edad_max !== categoriaActual.edad_max) return false
      const minActual = Number(categoriaActual.peso_min || 0)
      const minC = Number(c.peso_min || 0)
      return minC > minActual
    })
    .sort((a, b) => Number(a.peso_min || 0) - Number(b.peso_min || 0))
  return candidatas[0] || null
}

export function etiquetaPesaje(estado, intentos) {
  const n = Number(intentos || 0)
  if (estado === 'ok') return 'Aprobado en pesaje'
  if (estado === 'subido') return 'Recategorizado'
  if (estado === 'descalificado') return 'Descalificado en pesaje'
  if (estado === 'reintento') return `Reintento (${n}/${MAX_INTENTOS_PESAJE})`
  if (n > 0) return `Intento ${n}/${MAX_INTENTOS_PESAJE}`
  return 'Pendiente de pesaje'
}
