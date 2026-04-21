import { supabase } from '@/lib/supabase'

const SELECT_COMPLETO = `
  *,
  sede:id_sede(id_sede, nombre),
  apoderado:id_apoderado(id_apoderado, nombres, apellidos, telefono, correo, relacion, dni),
  plan:id_plan(id_plan, codigo, nombre, dias_semana, monto),
  turno:id_turno(id_turno, nombre, hora_inicio, hora_fin, dias_semana),
  grado:id_grado_actual(id_grado, nombre, color_cinturon, nivel)
`

export async function listarAlumnos({ busqueda = '', estado = null, idPlan = null, idTurno = null, idGrado = null } = {}) {
  let q = supabase.from('alumno').select(SELECT_COMPLETO).order('apellidos', { ascending: true })
  if (estado) q = q.eq('estado', estado)
  else q = q.neq('estado', 'retirado')
  if (idPlan) q = q.eq('id_plan', idPlan)
  if (idTurno) q = q.eq('id_turno', idTurno)
  if (idGrado) q = q.eq('id_grado_actual', idGrado)
  const { data, error } = await q
  if (error) throw error
  const term = (busqueda || '').toLowerCase().trim()
  const filtrados = !term
    ? data
    : (data || []).filter(a =>
        [a.nombres, a.apellidos, a.dni, a.codigo_alumno, a.telefono, a.correo]
          .filter(Boolean).join(' ').toLowerCase().includes(term),
      )
  return filtrados || []
}

export async function obtenerAlumno(id) {
  const { data, error } = await supabase
    .from('alumno')
    .select(SELECT_COMPLETO)
    .eq('id_alumno', id)
    .single()
  if (error) throw error
  return data
}

async function siguienteCodigoAlumno() {
  const { data } = await supabase
    .from('alumno')
    .select('codigo_alumno')
    .not('codigo_alumno', 'is', null)
    .order('codigo_alumno', { ascending: false })
    .limit(1)
  const ultimo = data?.[0]?.codigo_alumno
  const n = ultimo?.match(/^CCTKD-(\d+)$/)?.[1]
  const siguiente = (n ? parseInt(n, 10) : 0) + 1
  return `CCTKD-${String(siguiente).padStart(4, '0')}`
}

export async function crearAlumno({ alumno, apoderado }) {
  let id_apoderado = null
  if (apoderado && (apoderado.nombres || apoderado.telefono)) {
    const { data: apo, error: errApo } = await supabase
      .from('apoderado')
      .insert(apoderado)
      .select()
      .single()
    if (errApo) throw errApo
    id_apoderado = apo.id_apoderado
  }
  const codigo = alumno.codigo_alumno || await siguienteCodigoAlumno()
  const insert = {
    ...alumno,
    codigo_alumno: codigo,
    id_apoderado,
    estado: alumno.estado || 'activo',
  }
  const { data, error } = await supabase.from('alumno').insert(insert).select().single()
  if (error) throw error
  return data
}

export async function actualizarAlumno(id, patch) {
  const { data, error } = await supabase
    .from('alumno')
    .update(patch)
    .eq('id_alumno', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarApoderado(id, patch) {
  const { data, error } = await supabase
    .from('apoderado')
    .update(patch)
    .eq('id_apoderado', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cambiarEstadoAlumno(id, nuevoEstado) {
  return actualizarAlumno(id, { estado: nuevoEstado, activo: nuevoEstado === 'activo' || nuevoEstado === 'prueba' })
}

export async function listarPlanes() {
  const { data, error } = await supabase
    .from('plan_mensualidad')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarTurnos() {
  const { data, error } = await supabase
    .from('turno')
    .select('*')
    .eq('activo', true)
    .order('hora_inicio', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarGrados() {
  const { data, error } = await supabase
    .from('grado_marcial')
    .select('*')
    .order('nivel', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarSedes() {
  const { data, error } = await supabase
    .from('sede')
    .select('*')
    .eq('activo', true)
    .order('id_sede', { ascending: true })
  if (error) throw error
  return data || []
}

export function contarAlumnosPorEstado(alumnos) {
  return (alumnos || []).reduce((a, x) => {
    a[x.estado] = (a[x.estado] || 0) + 1
    a.total = (a.total || 0) + 1
    return a
  }, {})
}
