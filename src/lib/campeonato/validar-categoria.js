import { edadWT, MODALIDADES } from '@/lib/campeonato/constants'

function parseKupRango(rango) {
  if (!rango?.startsWith('kup:')) return null
  const part = rango.slice(4)
  const [a, b] = part.split('-').map(Number)
  if (Number.isNaN(a)) return null
  return { min: a, max: b ?? a }
}

/** kup: 10 = blanco, 1 = rojo · dan/poom compiten en subdivisiones altas */
export function calzaGradoKyorugi(cat, gradoInfo) {
  const rango = parseKupRango(cat.grado_rango)
  if (!rango) return true
  if (!gradoInfo) return false

  if (gradoInfo.tipo === 'dan' || gradoInfo.tipo === 'poom') {
    return rango.min <= 3
  }
  if (gradoInfo.tipo !== 'kup') return false
  return gradoInfo.nivel >= rango.min && gradoInfo.nivel <= rango.max
}

/** Filtra categorías kyorugi válidas para un perfil */
export function categoriasValidas(categorias, perfil, anioCampeonato, pesoDeclarado = null) {
  const edad = edadWT(perfil.fecha_nacimiento, anioCampeonato)
  const peso = pesoDeclarado != null && pesoDeclarado !== '' ? Number(pesoDeclarado) : null
  const grado = parseGrado(perfil.grado)

  return (categorias || []).filter((cat) => {
    if (cat.modalidad && cat.modalidad !== 'kyorugi') return false
    if (cat.genero && cat.genero !== 'X' && perfil.sexo && cat.genero !== perfil.sexo) return false
    if (edad != null) {
      if (cat.edad_min != null && edad < cat.edad_min) return false
      if (cat.edad_max != null && edad > cat.edad_max) return false
    }
    if (peso != null && cat.peso_max != null) {
      const min = Number(cat.peso_min || 0)
      const max = Number(cat.peso_max)
      if (peso <= min || peso > max) return false
    }
    if (!calzaGradoKyorugi(cat, grado)) return false
    return true
  })
}

export function parseGrado(grado) {
  if (!grado) return null
  const g = String(grado).toLowerCase()
  const dan = g.match(/(\d+)[º°]?\s*dan/)
  if (dan) return { tipo: 'dan', nivel: Number(dan[1]) }
  const poom = g.match(/(\d+)[º°]?\s*poom/)
  if (poom) return { tipo: 'poom', nivel: Number(poom[1]) }
  const kup = g.match(/(\d+)[º°]?\s*kup/)
  if (kup) return { tipo: 'kup', nivel: Number(kup[1]) }
  return null
}

export function parseGradoRango(rango) {
  if (!rango) return null
  if (rango === 'kup') return { tipo: 'kup' }
  const m = String(rango).match(/^(\d+)dan$/)
  if (m) return { tipo: 'dan', nivel: Number(m[1]) }
  return null
}

function calzaGradoPoomsae(cat, grado) {
  const rango = cat.grado_rango
  if (rango === 'ranking') {
    if (grado?.tipo === 'kup') return grado.nivel === 1
    return grado?.tipo === 'dan' || grado?.tipo === 'poom'
  }
  const kupRango = parseKupRango(rango)
  if (!kupRango) return true
  if (grado?.tipo === 'dan' || grado?.tipo === 'poom') return false
  if (grado?.tipo !== 'kup') return false
  return grado.nivel >= kupRango.min && grado.nivel <= kupRango.max
}

/** Poomsae FDPTKD: edad + sexo + forma (cintas) o ranking (1er kup / dan) */
export function categoriasPoomsaeValidas(categorias, perfil, anioCampeonato) {
  const edad = edadWT(perfil.fecha_nacimiento, anioCampeonato)
  const grado = parseGrado(perfil.grado)

  return (categorias || [])
    .filter((cat) => {
      if (cat.modalidad !== 'poomsae') return false
      if (cat.genero && perfil.sexo && cat.genero !== perfil.sexo) return false
      if (edad != null) {
        if (cat.edad_min != null && edad < cat.edad_min) return false
        if (cat.edad_max != null && edad > cat.edad_max) return false
      }
      return calzaGradoPoomsae(cat, grado)
    })
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export function motivoNoCalza(cat, perfil, anioCampeonato, pesoDeclarado) {
  const edad = edadWT(perfil.fecha_nacimiento, anioCampeonato)
  const grado = parseGrado(perfil.grado)
  if (cat.genero && cat.genero !== 'X' && perfil.sexo && cat.genero !== perfil.sexo) return 'Sexo no coincide'
  if (edad != null && cat.edad_min != null && edad < cat.edad_min) return `Edad ${edad} años (mín. ${cat.edad_min})`
  if (edad != null && cat.edad_max != null && edad > cat.edad_max) return `Edad ${edad} años (máx. ${cat.edad_max})`
  if (pesoDeclarado != null && cat.peso_max != null) {
    const p = Number(pesoDeclarado)
    if (p <= Number(cat.peso_min || 0) || p > Number(cat.peso_max)) {
      return `Peso ${p} kg fuera de rango (${cat.peso_min || 0}–${cat.peso_max} kg)`
    }
  }
  if (cat.modalidad === 'kyorugi' && !calzaGradoKyorugi(cat, grado)) {
    return `Grado no calza con ${cat.division || cat.nombre}`
  }
  return null
}

export function nombreCategoria(id, categorias) {
  if (!id) return null
  return categorias?.find((c) => c.id_categoria === id || String(c.id_categoria) === String(id))?.nombre
}

const POOMSAE_MODALIDADES = new Set([
  'poomsae_individual',
  'poomsae_pareja_reconocida',
  'poomsae_pareja_freestyle',
  'poomsae_equipo',
])

export function modalidadRequiereCategoriaPoomsae(key) {
  return POOMSAE_MODALIDADES.has(key)
}

export function grupoPoomsae(cat) {
  if (cat?.grado_rango === 'ranking') return 'Ranking G3'
  return 'Cintas de color'
}

import { validarGrupoInscripcion, esModalidadGrupo } from '@/lib/campeonato/validar-grupo'

/** Valida línea individual antes de insertar (servidor) */
export async function validarLineaInscripcion(sb, ac, body) {
  const { modalidad, idPerfiles, idCategoria, pesoDeclarado } = body
  const mod = MODALIDADES?.[modalidad]

  if (modalidad === 'oficial') return
  if (esModalidadGrupo(modalidad)) {
    return validarGrupoInscripcion(sb, ac, body)
  }

  if (!mod) throw new Error('Modalidad inválida')
  if (!idPerfiles?.length) throw new Error('Perfil requerido')

  const necesitaCategoria =
    modalidad === 'kyorugi_individual' || modalidadRequiereCategoriaPoomsae(modalidad)
  if (necesitaCategoria && !idCategoria) {
    throw new Error('Debes elegir una categoría')
  }

  if (!idCategoria) return

  const { data: cat, error: errCat } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_categoria', idCategoria)
    .eq('id_campeonato', ac.id_campeonato)
    .maybeSingle()
  if (errCat) throw errCat
  if (!cat) throw new Error('Categoría inválida para este campeonato')

  const { data: perfil } = await sb
    .from('competidor_perfil')
    .select('*')
    .eq('id_perfil', idPerfiles[0])
    .maybeSingle()
  if (!perfil) throw new Error('Competidor no encontrado')

  const anio = new Date(ac.campeonato.fecha_inicio).getFullYear()
  if (modalidad === 'kyorugi_individual') {
    const validas = categoriasValidas([cat], perfil, anio, pesoDeclarado)
    if (!validas.length) throw new Error('La categoría kyorugi no calza con edad, sexo, peso o grado')
  } else if (modalidadRequiereCategoriaPoomsae(modalidad)) {
    const validas = categoriasPoomsaeValidas([cat], perfil, anio)
    if (!validas.length) throw new Error('La división poomsae no calza con edad, sexo o grado')
  }
}

/** Si hay una sola opción válida, sugerirla al activar poomsae */
export function poomsaeCategoriaSugerida(categorias, perfil, anioCampeonato) {
  const validas = categoriasPoomsaeValidas(categorias, perfil, anioCampeonato)
  if (validas.length !== 1) return null
  return String(validas[0].id_categoria)
}
