import { getSupabase } from '@/lib/supabase'

/** Cliente válido para esta capa */
const sb = () => getSupabase()

const SELECT_COMPLETO = `
  *,
  sede:id_sede(id_sede, nombre),
  apoderado:id_apoderado(id_apoderado, nombres, apellidos, telefono, correo, relacion, dni),
  plan:id_plan(id_plan, codigo, nombre, dias_semana, monto),
  turno:id_turno(id_turno, nombre, hora_inicio, hora_fin, dias_semana),
  grado:id_grado_actual(id_grado, nombre, color_cinturon, nivel),
  clase_prueba:id_clase_prueba(id_clase, fecha, turno:id_turno(nombre, hora_inicio))
`

export async function listarAlumnos({ busqueda = '', estado = null, idPlan = null, idTurno = null, idGrado = null } = {}) {
  let q = sb().from('alumno').select(SELECT_COMPLETO).order('apellidos', { ascending: true })
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
  const { data, error } = await sb()
    .from('alumno')
    .select(SELECT_COMPLETO)
    .eq('id_alumno', id)
    .single()
  if (error) throw error
  return data
}

/** Primer cinturón del catálogo (orden coherente con listarGrados): menor nivel primero */
async function idGradoInicialCatalogo() {
  const { data, error } = await sb()
    .from('grado_marcial')
    .select('id_grado')
    .order('nivel', { ascending: true })
    .order('id_grado', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id_grado ?? null
}

async function siguienteCodigoAlumno() {
  const { data } = await sb()
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
    const { data: apo, error: errApo } = await sb()
      .from('apoderado')
      .insert(apoderado)
      .select()
      .single()
    if (errApo) throw errApo
    id_apoderado = apo.id_apoderado
  }
  const codigo = alumno.codigo_alumno || await siguienteCodigoAlumno()
  const estadoAlta = alumno.estado ?? 'prueba'
  let id_sede = alumno.id_sede
  if (id_sede == null) {
    const { data: primera } = await sb()
      .from('sede')
      .select('id_sede')
      .eq('activo', true)
      .order('id_sede')
      .limit(1)
      .maybeSingle()
    id_sede = primera?.id_sede ?? 1
  }
  const insert = {
    ...alumno,
    codigo_alumno: codigo,
    id_apoderado,
    id_sede,
    estado: estadoAlta,
    ...(estadoAlta === 'prueba' ? { id_grado_actual: null } : {}),
  }
  const { data, error } = await sb().from('alumno').insert(insert).select().single()
  if (error) throw error

  if (data.estado === 'prueba') return data

  const idGradoHistorial =
    alumno.id_grado_actual != null ? alumno.id_grado_actual : await idGradoInicialCatalogo()

  if (idGradoHistorial != null) {
    const fe = (data.fecha_ingreso || new Date().toISOString().slice(0, 10)).slice(0, 10)
    const { error: errHg } = await sb().from('historial_grados').insert({
      id_alumno: data.id_alumno,
      id_grado: idGradoHistorial,
      fecha_examen: fe,
      aprobado: true,
      observaciones: 'Ingreso a la academia (registro inicial de grado).',
      codigo_examen: `ACCTKD-INI-${data.id_alumno}`,
    })
    if (errHg) console.warn('historial_grados al crear alumno:', errHg.message)

    if (alumno.id_grado_actual == null && data.id_grado_actual == null) {
      const { data: patched, error: errPa } = await sb()
        .from('alumno')
        .update({ id_grado_actual: idGradoHistorial })
        .eq('id_alumno', data.id_alumno)
        .select()
        .single()
      if (!errPa && patched) return patched
    }
  }

  return data
}

export async function actualizarAlumno(id, patch) {
  const { data, error } = await sb()
    .from('alumno')
    .update(patch)
    .eq('id_alumno', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarApoderado(id, patch) {
  const { data, error } = await sb()
    .from('apoderado')
    .update(patch)
    .eq('id_apoderado', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cambiarEstadoAlumno(id, nuevoEstado) {
  const patch = {
    estado: nuevoEstado,
    activo: nuevoEstado === 'activo' || nuevoEstado === 'prueba',
  }
  if (nuevoEstado !== 'prueba')
    patch.id_clase_prueba = null

  if (nuevoEstado === 'prueba')
    patch.id_grado_actual = null

  return actualizarAlumno(id, patch)
}

const OBS_CLASE_PRUEBA = 'Clase de prueba ACCTKD'

/** Sesiones existentes del turno del alumno (para mover la marca de clase de prueba). */
export async function listarSesionesParaClasePrueba(idAlumno) {
  const a = await obtenerAlumno(idAlumno)
  if (!a?.id_turno) return []
  const { data, error } = await sb()
    .from('clase')
    .select('id_clase, fecha')
    .eq('id_turno', a.id_turno)
    .gte('fecha', '2025-09-01')
    .lte('fecha', '2027-12-31')
    .order('fecha', { ascending: false })
    .limit(180)
  if (error) throw error
  return data || []
}

/**
 * Una sola clase de prueba: mueve presente/marca a `id_clase` y actualiza alumno.id_clase_prueba.
 * Solo tiene sentido cuando el alumno está en estado `prueba`.
 */
export async function actualizarClaseDePrueba(idAlumno, idClase) {
  const idNum = Number(idAlumno)
  const idC = Number(idClase)
  const a = await obtenerAlumno(idNum)
  if (a.estado !== 'prueba')
    throw new Error('La clase de prueba solo se reasigna mientras el alumno está «en prueba».')
  if (!a.id_turno)
    throw new Error('El alumno no tiene turno asignado.')
  const { data: clase, error: ec } = await sb()
    .from('clase')
    .select('id_clase, id_turno')
    .eq('id_clase', idC)
    .maybeSingle()
  if (ec) throw ec
  if (!clase || clase.id_turno !== a.id_turno)
    throw new Error('Esa clase no pertenece al turno del alumno.')

  await sb()
    .from('asistencia_alumno')
    .update({ observacion: null })
    .eq('id_alumno', idNum)
    .eq('observacion', OBS_CLASE_PRUEBA)

  const { error: eu } = await sb()
    .from('asistencia_alumno')
    .upsert(
      {
        id_clase: idC,
        id_alumno: idNum,
        presente: true,
        justificado: false,
        observacion: OBS_CLASE_PRUEBA,
      },
      { onConflict: 'id_clase,id_alumno' },
    )
  if (eu) throw eu

  await actualizarAlumno(idNum, { id_clase_prueba: idC })
  return obtenerAlumno(idNum)
}

export async function listarPlanes() {
  const { data, error } = await sb()
    .from('plan_mensualidad')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarTurnos() {
  const { data, error } = await sb()
    .from('turno')
    .select('*')
    .eq('activo', true)
    .order('hora_inicio', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarGrados() {
  const { data, error } = await sb()
    .from('grado_marcial')
    .select('*')
    .order('nivel', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listarSedes() {
  const { data, error } = await sb()
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
