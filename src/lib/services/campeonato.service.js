import { getSupabase } from '@/lib/supabase'

const CAMpeonato_SELECT = `
  *,
  categoria_campeonato(count),
  competidor(count),
  inscripcion_campeonato(count)
`

export async function listarCampeonatos() {
  const { data, error } = await getSupabase()
    .from('campeonato')
    .select(CAMpeonato_SELECT)
    .order('fecha_inicio', { ascending: false })
  if (error) throw error
  return data || []
}

export async function obtenerCampeonato(id) {
  const { data, error } = await getSupabase()
    .from('campeonato')
    .select(CAMpeonato_SELECT)
    .eq('id_campeonato', id)
    .single()
  if (error) throw error
  return data
}

export async function crearCampeonato(payload) {
  const res = await fetch('/api/admin/campeonatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      estado: payload.estado || 'inscripciones',
      fecha_cierre_inscripcion: payload.fecha_cierre_inscripcion || payload.fecha_inicio,
      publicado: true,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'No se pudo crear el campeonato')
  return json.campeonato
}

export async function actualizarCampeonato(id, patch) {
  const { data, error } = await getSupabase()
    .from('campeonato')
    .update(patch)
    .eq('id_campeonato', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarCategorias(idCampeonato) {
  const { data, error } = await getSupabase()
    .from('categoria_campeonato')
    .select('*, competidor(count)')
    .eq('id_campeonato', idCampeonato)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })
  if (error) throw error
  return data || []
}

export async function crearCategoria(payload) {
  const { data, error } = await getSupabase()
    .from('categoria_campeonato')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarCategoria(id) {
  const { error } = await getSupabase().from('categoria_campeonato').delete().eq('id_categoria', id)
  if (error) throw error
}

export async function listarInscripciones(idCampeonato) {
  const { data, error } = await getSupabase()
    .from('inscripcion_campeonato')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listarAcademiasCampeonato(idCampeonato) {
  const { data, error } = await getSupabase()
    .from('academia_campeonato')
    .select('*, academia:id_academia(nombre, codigo_prefijo)')
    .eq('id_campeonato', idCampeonato)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarLineasInscripcion(idCampeonato) {
  const { data, error } = await getSupabase()
    .from('linea_inscripcion')
    .select(`
      *,
      categoria:categoria_campeonato(nombre),
      academia_campeonato(academia:academia(nombre, codigo_prefijo)),
      miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(nombres, apellidos, documento_numero))
    `)
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'anulado')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function crearInscripcion(payload) {
  const { data, error } = await getSupabase()
    .from('inscripcion_campeonato')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarInscripcion(id, patch) {
  const { data, error } = await getSupabase()
    .from('inscripcion_campeonato')
    .update(patch)
    .eq('id_inscripcion', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarCompetidores(idCampeonato) {
  const { data, error } = await getSupabase()
    .from('competidor')
    .select(`
      *,
      categoria_campeonato(id_categoria, nombre, modalidad),
      alumno:id_alumno(nombres, apellidos, dni)
    `)
    .eq('id_campeonato', idCampeonato)
    .order('dorsal', { ascending: true, nullsFirst: false })
    .order('apellidos', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarAlumnosParaCompetir() {
  const { data, error } = await getSupabase()
    .from('alumno')
    .select('id_alumno, nombres, apellidos, dni, fecha_nacimiento, sexo, grado:id_grado_actual(nombre)')
    .in('estado', ['activo', 'prueba'])
    .order('apellidos', { ascending: true })
    .limit(500)
  if (error) throw error
  return data || []
}

async function siguienteDorsal(idCampeonato) {
  const { data } = await getSupabase()
    .from('competidor')
    .select('dorsal')
    .eq('id_campeonato', idCampeonato)
    .not('dorsal', 'is', null)
    .order('dorsal', { ascending: false })
    .limit(1)
  const max = data?.[0]?.dorsal
  return (max ? Number(max) : 0) + 1
}

export async function crearCompetidorDesdeAlumno({ idCampeonato, idAlumno, idCategoria, idInscripcion, modalidad = 'kyorugi' }) {
  const sb = getSupabase()
  const { data: alumno, error: errA } = await sb
    .from('alumno')
    .select('id_alumno, nombres, apellidos, dni, fecha_nacimiento, sexo, grado:id_grado_actual(nombre)')
    .eq('id_alumno', idAlumno)
    .single()
  if (errA) throw errA

  const dorsal = await siguienteDorsal(idCampeonato)
  const edad = alumno.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(alumno.fecha_nacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const payload = {
    id_campeonato: idCampeonato,
    id_categoria: idCategoria || null,
    id_alumno: idAlumno,
    id_inscripcion: idInscripcion || null,
    nombres: alumno.nombres,
    apellidos: alumno.apellidos,
    nombre_completo: `${alumno.nombres} ${alumno.apellidos}`.trim(),
    dni: alumno.dni,
    academia: 'Christopher Cabrera Taekwondo',
    sexo: alumno.sexo,
    fecha_nacimiento: alumno.fecha_nacimiento,
    edad,
    grado: alumno.grado?.nombre || null,
    modalidad,
    tipo: 'competidor',
    dorsal,
    estado: 'inscrito',
  }

  const { data, error } = await sb.from('competidor').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function eliminarCompetidor(id) {
  const { error } = await getSupabase().from('competidor').delete().eq('id_competidor', id)
  if (error) throw error
}
