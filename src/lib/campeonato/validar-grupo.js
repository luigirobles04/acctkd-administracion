import { MODALIDADES, edadWT } from '@/lib/campeonato/constants'
import { parseGrado, modalidadRequiereCategoriaPoomsae } from '@/lib/campeonato/validar-categoria'

const GRUPO_MODALIDADES = new Set([
  'poomsae_pareja_reconocida',
  'poomsae_pareja_freestyle',
  'poomsae_equipo',
])

export function esModalidadGrupo(modalidad) {
  return GRUPO_MODALIDADES.has(modalidad)
}

function parseKupRango(rango) {
  if (!rango?.startsWith('kup:')) return null
  const part = rango.slice(4)
  const [a, b] = part.split('-').map(Number)
  if (Number.isNaN(a)) return null
  return { min: a, max: b ?? a }
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

function perfilCalzaPoomsae(cat, perfil, anio, { ignorarGenero = false } = {}) {
  if (cat.modalidad !== 'poomsae') return false
  if (!ignorarGenero && cat.genero && perfil.sexo && cat.genero !== perfil.sexo) return false
  const edad = edadWT(perfil.fecha_nacimiento, anio)
  if (edad != null) {
    if (cat.edad_min != null && edad < cat.edad_min) return false
    if (cat.edad_max != null && edad > cat.edad_max) return false
  }
  return calzaGradoPoomsae(cat, parseGrado(perfil.grado))
}

export function categoriaClaveGrupo(cat) {
  return `${cat.division}|${cat.grado_rango}|${cat.edad_min}|${cat.edad_max}`
}

/** Para parejas mixtas: una opción por división (sin duplicar M/F) */
export function dedupeCategoriasGrupo(categorias) {
  const seen = new Map()
  for (const cat of categorias) {
    const clave = categoriaClaveGrupo(cat)
    if (!seen.has(clave)) seen.set(clave, cat)
  }
  return [...seen.values()].sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export function validarComposicionGrupo(perfiles, modalidad) {
  const mod = MODALIDADES[modalidad]
  if (!mod || mod.miembros < 2) {
    return { ok: false, reason: 'Modalidad de grupo inválida' }
  }
  if (!perfiles?.length || perfiles.length !== mod.miembros) {
    return { ok: false, reason: `Selecciona exactamente ${mod.miembros} competidores` }
  }

  const ids = new Set(perfiles.map((p) => p.id_perfil))
  if (ids.size !== perfiles.length) {
    return { ok: false, reason: 'No repitas competidores en el mismo grupo' }
  }

  const sexos = perfiles.map((p) => p.sexo)
  const hombres = sexos.filter((s) => s === 'M').length
  const mujeres = sexos.filter((s) => s === 'F').length

  if (modalidad === 'poomsae_pareja_freestyle') {
    if (hombres !== 1 || mujeres !== 1) {
      return { ok: false, reason: 'Pareja freestyle: exactamente 1 masculino y 1 femenino' }
    }
  }

  if (modalidad === 'poomsae_equipo') {
    if (hombres !== 3 && mujeres !== 3) {
      return { ok: false, reason: 'Equipo WT: los 3 integrantes deben ser del mismo sexo' }
    }
  }

  return { ok: true }
}

function grupoIgnoraGeneroCategoria(modalidad, perfiles) {
  if (modalidad === 'poomsae_pareja_freestyle') return true
  if (modalidad === 'poomsae_pareja_reconocida') {
    const sexos = new Set(perfiles.map((p) => p.sexo))
    return sexos.size > 1
  }
  return false
}

/** Categorías poomsae válidas para todos los integrantes */
export function categoriasPoomsaeGrupo(categorias, perfiles, anioCampeonato, modalidad) {
  const comp = validarComposicionGrupo(perfiles, modalidad)
  if (!comp.ok) return []

  const ignorarGenero = grupoIgnoraGeneroCategoria(modalidad, perfiles)
  const poomsae = (categorias || []).filter((c) => c.modalidad === 'poomsae')

  const validas = poomsae.filter((cat) =>
    perfiles.every((p) => perfilCalzaPoomsae(cat, p, anioCampeonato, { ignorarGenero }))
  )

  if (ignorarGenero) return dedupeCategoriasGrupo(validas)

  const sexo = perfiles[0]?.sexo
  return validas
    .filter((cat) => !cat.genero || cat.genero === sexo)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export async function verificarPerfilLibreEnModalidad(sb, ac, modalidad, idPerfiles, excludeLinea = null) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, modalidad, miembros:linea_inscripcion_miembro(id_perfil)')
    .eq('id_academia_campeonato', ac.id)
    .eq('modalidad', modalidad)
    .neq('estado', 'anulado')

  for (const linea of lineas || []) {
    if (excludeLinea && linea.id_linea === excludeLinea) continue
    const ids = (linea.miembros || []).map((m) => m.id_perfil)
    for (const id of idPerfiles) {
      if (ids.includes(id)) {
        throw new Error('Un competidor ya está inscrito en esta modalidad de grupo')
      }
    }
  }
}

export async function validarGrupoInscripcion(sb, ac, body) {
  const { modalidad, idPerfiles, idCategoria } = body
  const mod = MODALIDADES[modalidad]

  if (!mod || mod.miembros < 2) throw new Error('Modalidad de grupo inválida')
  if (!modalidadRequiereCategoriaPoomsae(modalidad)) throw new Error('Modalidad inválida')
  if (!idPerfiles?.length || idPerfiles.length !== mod.miembros) {
    throw new Error(`Se requieren ${mod.miembros} competidores`)
  }
  if (!idCategoria) throw new Error('Debes elegir una división poomsae')

  const { data: perfiles, error: errP } = await sb
    .from('competidor_perfil')
    .select('*')
    .in('id_perfil', idPerfiles)
    .eq('id_academia', ac.id_academia)
  if (errP) throw errP
  if ((perfiles || []).length !== idPerfiles.length) {
    throw new Error('Uno o más competidores no pertenecen a tu academia')
  }

  const ordenados = idPerfiles.map((id) => perfiles.find((p) => p.id_perfil === id))
  const comp = validarComposicionGrupo(ordenados, modalidad)
  if (!comp.ok) throw new Error(comp.reason)

  await verificarPerfilLibreEnModalidad(sb, ac, modalidad, idPerfiles)

  const { data: cat, error: errCat } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_categoria', idCategoria)
    .eq('id_campeonato', ac.id_campeonato)
    .maybeSingle()
  if (errCat) throw errCat
  if (!cat) throw new Error('Categoría inválida')

  const anio = new Date(ac.campeonato.fecha_inicio).getFullYear()
  const { data: todasCats } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_campeonato', ac.id_campeonato)
    .eq('modalidad', 'poomsae')

  const validas = categoriasPoomsaeGrupo(todasCats || [], ordenados, anio, modalidad)
  const calza = validas.some((c) => c.id_categoria === cat.id_categoria)
  if (!calza) {
    throw new Error('La división elegida no calza con todos los integrantes (edad, sexo o grado)')
  }
}
