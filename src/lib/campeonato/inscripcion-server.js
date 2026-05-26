import { generarToken, edadWT } from '@/lib/campeonato/constants'
import { resolverPrefijoUnico, formatearDorsal } from '@/lib/campeonato/prefix'

export async function obtenerCampeonatoPorSlug(sb, slug) {
  const { data, error } = await sb
    .from('campeonato')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function puedeInscribir(campeonato) {
  if (!campeonato) return { ok: false, reason: 'Campeonato no encontrado' }
  if (campeonato.estado !== 'inscripciones') return { ok: false, reason: 'Inscripciones cerradas' }
  const hoy = new Date().toISOString().slice(0, 10)
  if (campeonato.fecha_gracia_pago && hoy > campeonato.fecha_gracia_pago) {
    return { ok: false, reason: 'Plazo de inscripción finalizado' }
  }
  return { ok: true, soloPago: campeonato.fecha_cierre_inscripcion && hoy > campeonato.fecha_cierre_inscripcion }
}

export function tipoTarifaActual(campeonato, fecha = new Date()) {
  const d = fecha.toISOString().slice(0, 10)
  if (campeonato.fecha_inicio_tardia && d >= campeonato.fecha_inicio_tardia) return 'tardia'
  return 'regular'
}

export async function precioModalidad(sb, idCampeonato, modalidad, tipoTarifa) {
  const { data } = await sb
    .from('campeonato_tarifa')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', modalidad)
    .eq('activo', true)
    .maybeSingle()
  if (!data) return 0
  return Number(tipoTarifa === 'tardia' ? data.precio_tardia : data.precio_regular) || 0
}

export async function verificarLimiteAcademiasDia(sb, idCampeonato) {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data: camp } = await sb.from('campeonato').select('limite_academias_dia').eq('id_campeonato', idCampeonato).single()
  const limite = camp?.limite_academias_dia ?? 20

  const { data: reg } = await sb
    .from('campeonato_registro_academia_dia')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('fecha', hoy)
    .maybeSingle()

  if (reg && reg.cantidad >= limite) {
    return { ok: false, reason: 'Límite diario de registros alcanzado. Intenta mañana.' }
  }
  return { ok: true }
}

export async function incrementarRegistroDia(sb, idCampeonato) {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data: reg } = await sb
    .from('campeonato_registro_academia_dia')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('fecha', hoy)
    .maybeSingle()

  if (reg) {
    await sb.from('campeonato_registro_academia_dia').update({ cantidad: reg.cantidad + 1 }).eq('id', reg.id)
  } else {
    await sb.from('campeonato_registro_academia_dia').insert({ id_campeonato: idCampeonato, fecha: hoy, cantidad: 1 })
  }
}

/** Alta academia vía link genérico */
export async function registrarAcademiaEnCampeonato(sb, { idCampeonato, nombre, telefono, idSede = null, esInterna = false }) {
  const limite = await verificarLimiteAcademiasDia(sb, idCampeonato)
  if (!limite.ok) throw new Error(limite.reason)

  const prefijo = await resolverPrefijoUnico(sb, nombre)
  const { data: academia, error: errA } = await sb
    .from('academia')
    .insert({ nombre: nombre.trim(), telefono, codigo_prefijo: prefijo })
    .select()
    .single()
  if (errA) throw errA

  const token = generarToken(40)
  const { data: ac, error: errAc } = await sb
    .from('academia_campeonato')
    .insert({
      id_academia: academia.id_academia,
      id_campeonato: idCampeonato,
      id_sede: idSede,
      es_interna: esInterna,
      token,
    })
    .select('*, academia:id_academia(*)')
    .single()
  if (errAc) throw errAc

  await incrementarRegistroDia(sb, idCampeonato)
  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: ac.id,
    accion: 'academia_registrada',
    detalle: { nombre, telefono },
    actor: 'portal',
  })

  return { academia, academiaCampeonato: ac, token }
}

export async function recuperarAcademiaPorTelefono(sb, { idCampeonato, telefono }) {
  const tel = telefono.replace(/\D/g, '')
  const { data: academias } = await sb.from('academia').select('*').ilike('telefono', `%${tel.slice(-9)}%`)

  for (const acad of academias || []) {
    const { data: ac } = await sb
      .from('academia_campeonato')
      .select('*, academia:id_academia(*)')
      .eq('id_campeonato', idCampeonato)
      .eq('id_academia', acad.id_academia)
      .maybeSingle()
    if (ac) return ac
  }
  return null
}

export async function resolverTokenAcademia(sb, token) {
  if (!token) return null

  const { data: actual } = await sb
    .from('academia_campeonato')
    .select('*, academia:id_academia(*), campeonato:id_campeonato(*)')
    .eq('token', token)
    .maybeSingle()
  if (actual) return actual

  const ahora = new Date().toISOString()
  const { data: previa } = await sb
    .from('academia_campeonato')
    .select('*, academia:id_academia(*), campeonato:id_campeonato(*)')
    .eq('token_anterior', token)
    .gt('token_anterior_expira', ahora)
    .maybeSingle()
  return previa
}

export async function recalcularMontosAcademia(sb, idAcademiaCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('precio_aplicado, estado')
    .eq('id_academia_campeonato', idAcademiaCampeonato)
    .neq('estado', 'anulado')

  const montoTotal = (lineas || []).reduce((s, l) => s + Number(l.precio_aplicado || 0), 0)
  const { data: asignaciones } = await sb
    .from('asignacion_pago')
    .select('monto, linea_inscripcion!inner(id_academia_campeonato)')
    .eq('linea_inscripcion.id_academia_campeonato', idAcademiaCampeonato)

  const montoAsignado = (asignaciones || []).reduce((s, a) => s + Number(a.monto || 0), 0)

  let estadoPago = 'pendiente'
  if (montoAsignado > 0 && montoAsignado < montoTotal) estadoPago = 'parcial'
  if (montoTotal > 0 && montoAsignado >= montoTotal) estadoPago = 'validado'

  await sb
    .from('academia_campeonato')
    .update({ monto_total: montoTotal, monto_asignado: montoAsignado, ultimo_cambio_at: new Date().toISOString() })
    .eq('id', idAcademiaCampeonato)

  return { montoTotal, montoAsignado, saldo: montoTotal - montoAsignado, estadoPago }
}

export async function siguienteDorsalGlobal(sb, idCampeonato) {
  const { data } = await sb
    .from('linea_inscripcion')
    .select('dorsal_numero')
    .eq('id_campeonato', idCampeonato)
    .not('dorsal_numero', 'is', null)
    .order('dorsal_numero', { ascending: false })
    .limit(1)
  return (data?.[0]?.dorsal_numero ? Number(data[0].dorsal_numero) : 0) + 1
}

export async function aprobarLinea(sb, idLinea) {
  const { data: linea, error } = await sb
    .from('linea_inscripcion')
    .select('*, academia_campeonato(*, academia(*))')
    .eq('id_linea', idLinea)
    .single()
  if (error) throw error
  if (linea.estado !== 'pagado' && linea.estado !== 'aprobado') {
    throw new Error('La línea debe estar pagada antes de aprobar')
  }

  const prefijo = linea.academia_campeonato?.academia?.codigo_prefijo || 'AC'
  const numero = await siguienteDorsalGlobal(sb, linea.id_campeonato)
  const display = formatearDorsal(prefijo, numero)

  const { data: updated, error: errU } = await sb
    .from('linea_inscripcion')
    .update({
      estado: 'aprobado',
      dorsal_prefijo: prefijo,
      dorsal_numero: numero,
      dorsal_display: display,
      updated_at: new Date().toISOString(),
    })
    .eq('id_linea', idLinea)
    .select()
    .single()
  if (errU) throw errU

  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: linea.id_academia_campeonato,
    id_linea: idLinea,
    accion: 'linea_aprobada',
    detalle: { dorsal: display },
    actor: 'admin',
  })

  return updated
}

export async function aplicarFifoPagos(sb, idComprobante, idAcademiaCampeonato) {
  const { data: comp } = await sb.from('comprobante_pago').select('*').eq('id_comprobante', idComprobante).single()
  if (!comp) throw new Error('Comprobante no encontrado')

  const montoDisponible = Number(comp.monto_validado ?? comp.monto_declarado)
  const { data: asignadoPrev } = await sb
    .from('asignacion_pago')
    .select('monto')
    .eq('id_comprobante', idComprobante)
  const yaAsignado = (asignadoPrev || []).reduce((s, a) => s + Number(a.monto), 0)
  let restante = montoDisponible - yaAsignado

  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('*')
    .eq('id_academia_campeonato', idAcademiaCampeonato)
    .in('estado', ['borrador', 'pendiente_pago'])
    .order('created_at', { ascending: true })

  for (const linea of lineas || []) {
    if (restante <= 0) break
    const precio = Number(linea.precio_aplicado)
    const { data: ya } = await sb.from('asignacion_pago').select('monto').eq('id_linea', linea.id_linea)
    const pagadoLinea = (ya || []).reduce((s, a) => s + Number(a.monto), 0)
    const falta = precio - pagadoLinea
    if (falta <= 0) continue

    const aplicar = Math.min(falta, restante)
    await sb.from('asignacion_pago').upsert(
      { id_comprobante: idComprobante, id_linea: linea.id_linea, monto: pagadoLinea + aplicar },
      { onConflict: 'id_comprobante,id_linea' }
    )
    restante -= aplicar

    const nuevoPagado = pagadoLinea + aplicar
    const nuevoEstado = nuevoPagado >= precio ? 'pagado' : 'pendiente_pago'
    await sb.from('linea_inscripcion').update({ estado: nuevoEstado }).eq('id_linea', linea.id_linea)
  }

  await recalcularMontosAcademia(sb, idAcademiaCampeonato)
}

export { edadWT }
