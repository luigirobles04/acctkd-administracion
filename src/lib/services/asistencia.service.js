import { getSupabase } from '../supabase'

// Estados canónicos de asistencia para la UI.
export const ESTADOS = {
  PRESENTE: 'presente',
  AUSENTE: 'ausente',
  JUSTIFICADA: 'justificada',
  RECUPERACION: 'recuperacion',
}

function rowToEstado(row) {
  if (!row) return ESTADOS.AUSENTE
  const obs = (row.observacion || '').toLowerCase()
  if (obs.includes('recuper')) return ESTADOS.RECUPERACION
  if (row.presente) return ESTADOS.PRESENTE
  if (row.justificado) return ESTADOS.JUSTIFICADA
  return ESTADOS.AUSENTE
}

function estadoToRow(estado) {
  switch (estado) {
    case ESTADOS.PRESENTE:
      return { presente: true, justificado: false, observacion: null }
    case ESTADOS.JUSTIFICADA:
      return { presente: false, justificado: true, observacion: null }
    case ESTADOS.RECUPERACION:
      return { presente: true, justificado: false, observacion: 'Recuperación' }
    case ESTADOS.AUSENTE:
    default:
      return { presente: false, justificado: false, observacion: null }
  }
}

// Turnos activos con su sede.
export async function listarTurnos() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('turno')
    .select('id_turno, nombre, hora_inicio, hora_fin, dias_semana, dias_array, activo, sede:id_sede(id_sede, nombre)')
    .eq('activo', true)
    .order('hora_inicio', { ascending: true })
  if (error) throw error
  return data || []
}

// Devuelve (o crea) la clase para un turno + fecha.
export async function obtenerOCrearClase({ idTurno, fecha, idMaestro = null }) {
  const supabase = getSupabase()
  const { data: existente, error: errSel } = await supabase
    .from('clase')
    .select('id_clase, id_turno, id_maestro, fecha')
    .eq('id_turno', idTurno)
    .eq('fecha', fecha)
    .maybeSingle()
  if (errSel) throw errSel
  if (existente) return existente

  const { data: creada, error: errIns } = await supabase
    .from('clase')
    .insert({ id_turno: idTurno, id_maestro: idMaestro, fecha })
    .select('id_clase, id_turno, id_maestro, fecha')
    .single()
  if (errIns) throw errIns
  return creada
}

// Alumnos asignados al turno con su estado de asistencia para la clase dada.
export async function listarAsistenciaDeTurno({ idTurno, fecha }) {
  const supabase = getSupabase()
  const clase = await obtenerOCrearClase({ idTurno, fecha })

  const { data: alumnos, error: errAl } = await supabase
    .from('alumno')
    .select('id_alumno, codigo_alumno, nombres, apellidos, sexo, grado:id_grado_actual(nombre, color_cinturon)')
    .eq('id_turno', idTurno)
    .in('estado', ['activo', 'prueba'])
    .order('apellidos', { ascending: true })
  if (errAl) throw errAl

  if (!alumnos || alumnos.length === 0) {
    return { clase, filas: [] }
  }

  const ids = alumnos.map(a => a.id_alumno)
  const { data: marcas, error: errMar } = await supabase
    .from('asistencia_alumno')
    .select('id, id_alumno, presente, justificado, observacion')
    .eq('id_clase', clase.id_clase)
    .in('id_alumno', ids)
  if (errMar) throw errMar

  const mapa = new Map((marcas || []).map(m => [m.id_alumno, m]))
  const filas = alumnos.map(a => {
    const row = mapa.get(a.id_alumno)
    return {
      alumno: a,
      estado: rowToEstado(row),
      observacion: row?.observacion || '',
      id_registro: row?.id || null,
    }
  })
  return { clase, filas }
}

// Marca una sola asistencia (upsert) para el alumno en la clase.
export async function marcarAsistencia({ idClase, idAlumno, estado }) {
  const supabase = getSupabase()
  const payload = {
    id_clase: idClase,
    id_alumno: idAlumno,
    ...estadoToRow(estado),
  }
  const { data, error } = await supabase
    .from('asistencia_alumno')
    .upsert(payload, { onConflict: 'id_clase,id_alumno' })
    .select('id, presente, justificado, observacion')
    .single()
  if (error) throw error
  return data
}

// Marca todos los alumnos del turno como presentes (atajo "Todos presentes").
export async function marcarTodosPresentes({ idClase, idsAlumnos }) {
  const supabase = getSupabase()
  if (!idsAlumnos?.length) return []
  const payloads = idsAlumnos.map(id_alumno => ({
    id_clase: idClase,
    id_alumno,
    ...estadoToRow(ESTADOS.PRESENTE),
  }))
  const { data, error } = await supabase
    .from('asistencia_alumno')
    .upsert(payloads, { onConflict: 'id_clase,id_alumno' })
    .select('id, id_alumno')
  if (error) throw error
  return data
}

// Resumen de asistencia de un alumno en los últimos N meses.
export async function resumenAsistenciaAlumno({ idAlumno, mesesAtras = 3 }) {
  const supabase = getSupabase()
  const desde = new Date()
  desde.setMonth(desde.getMonth() - mesesAtras)
  const desdeISO = desde.toISOString().slice(0, 10)

  let sel = 'presente, justificado, observacion, clase:id_clase(fecha, turno:id_turno(nombre))'
  let { data, error } = await supabase
    .from('asistencia_alumno')
    .select(sel)
    .eq('id_alumno', idAlumno)

  if (error) {
    const simple = await supabase
      .from('asistencia_alumno')
      .select('id_clase, presente, justificado, observacion')
      .eq('id_alumno', idAlumno)
    if (simple.error) throw simple.error

    const idsClase = [...new Set((simple.data || []).map((r) => r.id_clase).filter(Boolean))]
    let clasesPorId = new Map()
    if (idsClase.length > 0) {
      const { data: clas, error: eCl } = await supabase
        .from('clase')
        .select('id_clase, fecha, turno:id_turno(nombre)')
        .in('id_clase', idsClase)
      if (!eCl && clas) {
        clasesPorId = new Map(clas.map((c) => [c.id_clase, c]))
      }
    }
    data = (simple.data || []).map((r) => ({
      ...r,
      clase: r.id_clase ? clasesPorId.get(r.id_clase) : null,
    }))
    error = null
  }

  const filtradas = (data || []).filter(r => {
    const f = r.clase?.fecha
    return f && f >= desdeISO
  })

  const total = filtradas.length
  let presentes = 0
  let justificadas = 0
  let ausentes = 0
  let recuperaciones = 0
  for (const r of filtradas) {
    const estado = rowToEstado(r)
    if (estado === ESTADOS.PRESENTE) presentes++
    else if (estado === ESTADOS.JUSTIFICADA) justificadas++
    else if (estado === ESTADOS.RECUPERACION) recuperaciones++
    else ausentes++
  }
  // Clases “con asistencia efectiva”: presente + recuperación (cuenta como día cubierto).
  const conAsistencia = presentes + recuperaciones
  const base = presentes + ausentes + justificadas + recuperaciones
  const porcentaje = base > 0 ? Math.round((conAsistencia / base) * 100) : 0
  return {
    desde: desdeISO,
    total,
    presentes,
    ausentes,
    justificadas,
    recuperaciones,
    conAsistencia,
    porcentaje,
    historial: filtradas,
  }
}

/** Día ISO (YYYY-MM-DD) → Date local medianoche */
function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatISODateLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** getDay JS: 0 dom … 6 sáb → id dias_array 1 lun … 7 dom */
export function weekdayIdParaTurno(jsGetDay) {
  return jsGetDay === 0 ? 7 : jsGetDay
}

export function turnoTieneSesionEsteDia(isoFecha, diasArrayTurno) {
  const d = parseISODate(isoFecha)
  const id = weekdayIdParaTurno(d.getDay())
  return Array.isArray(diasArrayTurno) && diasArrayTurno.includes(id)
}

/** Lista de fechas ISO entre inclusive que coinciden con dias_array del turno */
export function fechasSesionTurnoEnRango(isoDesde, isoHasta, diasArrayTurno) {
  const dias = new Set(Array.isArray(diasArrayTurno) ? diasArrayTurno : [])
  if (!dias.size) return []
  const desde = parseISODate(isoDesde)
  const hasta = parseISODate(isoHasta)
  /** @type {string[]} */
  const out = []
  for (const d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    const dow = weekdayIdParaTurno(d.getDay())
    if (dias.has(dow)) out.push(formatISODateLocal(d))
  }
  return out
}

export function inicioSemanaLunesISO(isoDiaReferencia) {
  const d = parseISODate(isoDiaReferencia)
  const js = d.getDay()
  const diff = js === 0 ? -6 : 1 - js
  d.setDate(d.getDate() + diff)
  return formatISODateLocal(d)
}

export function finSemanaDomingoISO(isoLunes) {
  const d = parseISODate(isoLunes)
  d.setDate(d.getDate() + 6)
  return formatISODateLocal(d)
}

export function rangoMesContainingISO(isoDiaReferencia) {
  const d = parseISODate(isoDiaReferencia)
  const ini = new Date(d.getFullYear(), d.getMonth(), 1)
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { desde: formatISODateLocal(ini), hasta: formatISODateLocal(fin) }
}

/**
 * Vista semana/mes: matriz asistencias por día de sesión del turno (falta si no hay registro o marcado ausente).
 * Solo lectura (no crea filas clase).
 */
export async function listarAsistenciaRangoTurno({ idTurno, fechaDesde, fechaHasta }) {
  const supabase = getSupabase()
  const turnoActual = (
    await supabase
      .from('turno')
      .select('id_turno, nombre, dias_array')
      .eq('id_turno', idTurno)
      .maybeSingle()
  ).data

  const fechas = fechasSesionTurnoEnRango(fechaDesde, fechaHasta, turnoActual?.dias_array)
  if (!fechas.length) {
    return { turno: turnoActual, fechasSesion: [], alumnos: [], matrix: new Map(), clasesPorFecha: new Map() }
  }

  const { data: clasesRows, error: errCl } = await supabase
    .from('clase')
    .select('id_clase, fecha')
    .eq('id_turno', idTurno)
    .in('fecha', fechas)
    .order('fecha', { ascending: true })

  if (errCl) throw errCl

  const clasesPorFecha = new Map((clasesRows || []).map((c) => [c.fecha, c]))

  const { data: alumnos, error: errAl } = await supabase
    .from('alumno')
    .select('id_alumno, codigo_alumno, nombres, apellidos, sexo, grado:id_grado_actual(nombre, color_cinturon)')
    .eq('id_turno', idTurno)
    .in('estado', ['activo', 'prueba'])
    .order('apellidos', { ascending: true })

  if (errAl) throw errAl
  const lista = alumnos || []

  const idsClase = [...clasesPorFecha.values()].map((c) => c.id_clase)
  const matrix = new Map()

  if (idsClase.length && lista.length) {
    const idsAlumnos = lista.map((a) => a.id_alumno)
    const { data: marcas, error: errMa } = await supabase
      .from('asistencia_alumno')
      .select('id_alumno, id_clase, presente, justificado, observacion')
      .in('id_clase', idsClase)
      .in('id_alumno', idsAlumnos)

    if (errMa) throw errMa

    /** id_clase -> fecha */
    const fechaPorClase = new Map(
      [...clasesPorFecha.entries()].map(([fecha, cls]) => [cls.id_clase, fecha]),
    )

    for (const fecha of fechas) {
      matrix.set(fecha, new Map())
      for (const a of lista) {
        matrix.get(fecha)?.set(a.id_alumno, ESTADOS.AUSENTE)
      }
    }

    for (const row of marcas || []) {
      const fecha = fechaPorClase.get(row.id_clase)
      if (!fecha) continue
      const sub = matrix.get(fecha)
      if (!sub) continue
      sub.set(row.id_alumno, rowToEstado(row))
    }
  } else {
    for (const fecha of fechas) {
      matrix.set(fecha, new Map())
      for (const a of lista) {
        matrix.get(fecha)?.set(a.id_alumno, ESTADOS.AUSENTE)
      }
    }
  }

  const fechasSesion = fechas.map((f) => ({
    fecha: f,
    clase: clasesPorFecha.get(f) || null,
  }))

  return {
    turno: turnoActual,
    fechaDesde,
    fechaHasta,
    fechasSesion,
    alumnos: lista,
    matrix,
    clasesPorFecha,
  }
}
