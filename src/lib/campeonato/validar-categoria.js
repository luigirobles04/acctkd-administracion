import { edadWT } from '@/lib/campeonato/constants'

/** Filtra categorías kyorugi válidas para un perfil */
export function categoriasValidas(categorias, perfil, anioCampeonato, pesoDeclarado = null) {
  const edad = edadWT(perfil.fecha_nacimiento, anioCampeonato)
  const peso = pesoDeclarado != null && pesoDeclarado !== '' ? Number(pesoDeclarado) : null

  return (categorias || []).filter((cat) => {
    if (cat.genero && perfil.sexo && cat.genero !== perfil.sexo) return false
    if (edad != null) {
      if (cat.edad_min != null && edad < cat.edad_min) return false
      if (cat.edad_max != null && edad > cat.edad_max) return false
    }
    if (peso != null && cat.peso_max != null) {
      const min = Number(cat.peso_min || 0)
      const max = Number(cat.peso_max)
      if (peso <= min || peso > max) return false
    }
    return true
  })
}

export function motivoNoCalza(cat, perfil, anioCampeonato, pesoDeclarado) {
  const edad = edadWT(perfil.fecha_nacimiento, anioCampeonato)
  if (cat.genero && perfil.sexo && cat.genero !== perfil.sexo) return 'Sexo no coincide'
  if (edad != null && cat.edad_min != null && edad < cat.edad_min) return `Edad ${edad} años (mín. ${cat.edad_min})`
  if (edad != null && cat.edad_max != null && edad > cat.edad_max) return `Edad ${edad} años (máx. ${cat.edad_max})`
  if (pesoDeclarado != null && cat.peso_max != null) {
    const p = Number(pesoDeclarado)
    if (p <= Number(cat.peso_min || 0) || p > Number(cat.peso_max)) {
      return `Peso ${p} kg fuera de rango (${cat.peso_min || 0}–${cat.peso_max} kg)`
    }
  }
  return null
}
