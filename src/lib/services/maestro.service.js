import { supabase } from '@/lib/supabase'

const SELECT_COMPLETO = `
  *,
  sede:id_sede(id_sede, nombre),
  turnos:maestro_turno(id, es_titular, turno:id_turno(id_turno, nombre, hora_inicio, hora_fin, dias_semana))
`

export async function listarMaestros({ busqueda = '', soloActivos = true } = {}) {
  let q = supabase.from('maestro').select(SELECT_COMPLETO).order('apellidos', { ascending: true })
  if (soloActivos) q = q.eq('activo', true)
  const { data, error } = await q
  if (error) throw error
  const t = (busqueda || '').toLowerCase().trim()
  if (!t) return data || []
  return (data || []).filter(m =>
    [m.nombres, m.apellidos, m.dni, m.num_kukkiwon, m.correo, m.telefono].filter(Boolean)
      .join(' ').toLowerCase().includes(t),
  )
}

export async function obtenerMaestro(id) {
  const { data, error } = await supabase
    .from('maestro').select(SELECT_COMPLETO).eq('id_maestro', id).single()
  if (error) throw error
  return data
}

export async function crearMaestro(datos, turnos = []) {
  const { data, error } = await supabase.from('maestro').insert(datos).select().single()
  if (error) throw error
  if (turnos.length) {
    await supabase.from('maestro_turno').insert(
      turnos.map(id_turno => ({ id_maestro: data.id_maestro, id_turno, es_titular: true })),
    )
  }
  return data
}

export async function actualizarMaestro(id, patch, turnosSeleccionados = null) {
  const { data, error } = await supabase
    .from('maestro').update(patch).eq('id_maestro', id).select().single()
  if (error) throw error
  if (turnosSeleccionados !== null) {
    await supabase.from('maestro_turno').delete().eq('id_maestro', id)
    if (turnosSeleccionados.length) {
      await supabase.from('maestro_turno').insert(
        turnosSeleccionados.map(id_turno => ({ id_maestro: id, id_turno, es_titular: true })),
      )
    }
  }
  return data
}

export async function desactivarMaestro(id) {
  return actualizarMaestro(id, { activo: false })
}

export async function listarPlanillas(idMaestro, anio) {
  let q = supabase.from('planilla_maestro').select('*').eq('id_maestro', idMaestro).order('periodo', { ascending: false })
  if (anio) q = q.gte('periodo', `${anio}-01-01`).lt('periodo', `${anio + 1}-01-01`)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function generarPlanilla({ id_maestro, periodo, sueldo_base, descuentos = 0, bonos = 0, observaciones = '' }) {
  const total = Number(sueldo_base) - Number(descuentos) + Number(bonos)
  const { data, error } = await supabase.from('planilla_maestro')
    .upsert({ id_maestro, periodo, sueldo_base, descuentos, bonos, total, observaciones }, { onConflict: 'id_maestro,periodo' })
    .select().single()
  if (error) throw error
  return data
}
