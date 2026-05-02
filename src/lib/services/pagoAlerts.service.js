import { getSupabase } from '@/lib/supabase'

export const DIAS_VENCE_MENSUALIDAD_PRONTO = 7

export function esMensualidadPago(p) {
  const cod = p.concepto_pago?.codigo
  if (cod === 'MENSUALIDAD') return true
  const c = (typeof p.concepto === 'string' ? p.concepto : '')?.toLowerCase() || ''
  return c.includes('mensual')
}

/** 'vencida' · 'proximo' (pendiente próximo a vencer) · 'pendiente_otro' */
export function clasificarCuotaMensualidadVisual(p, ahoraRef = null) {
  if (!esMensualidadPago(p)) return null
  if (p.estado === 'pagado' || p.estado === 'anulado') return null

  const hoy = ahoraRef || new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)
  const hasta = new Date(hoy)
  hasta.setDate(hasta.getDate() + DIAS_VENCE_MENSUALIDAD_PRONTO)
  const hastaStr = hasta.toISOString().slice(0, 10)

  const fv = p.fecha_vencimiento ? String(p.fecha_vencimiento).slice(0, 10) : null

  if (p.estado === 'vencido' || (p.estado === 'pendiente' && fv != null && fv < hoyStr)) {
    return 'vencida'
  }
  if (p.estado === 'pendiente' && fv != null && fv >= hoyStr && fv <= hastaStr) {
    return 'proximo'
  }
  if (p.estado === 'pendiente') {
    return 'pendiente_otro'
  }
  return null
}

/**
 * Estado agregado por alumno para mensualidades.
 * — vencida: vencimiento pasado o estado vencido
 * — pendienteProximo: pendiente dentro de próximos días (etiqueta «Pendiente» en UI de cuota)
 * — pendienteOtro: debe cuota pero sin ventana cercana definida / vence más adelante
 * @returns {Record<number, { debeMensualidad: boolean, vencida: boolean, pendienteProximo: boolean, pendienteOtro: boolean }>}
 */
export async function obtenerMapaAlertasMensualidadPorAlumno() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pago')
    .select('id_alumno, estado, fecha_vencimiento, concepto_pago(codigo), concepto')
    .in('estado', ['pendiente', 'vencido'])
    .limit(3000)

  if (error) throw error

  const now = new Date()

  /** @type {Record<number, { debeMensualidad: boolean, vencida: boolean, pendienteProximo: boolean, pendienteOtro: boolean }>} */
  const map = {}

  for (const p of data || []) {
    if (!esMensualidadPago(p)) continue
    const id = p.id_alumno
    const cur =
      map[id] ?? {
        debeMensualidad: false,
        vencida: false,
        pendienteProximo: false,
        pendienteOtro: false,
      }

    const tipo = clasificarCuotaMensualidadVisual(p, now)
    if (!tipo) continue

    cur.debeMensualidad = true
    if (tipo === 'vencida') cur.vencida = true
    else if (tipo === 'proximo') cur.pendienteProximo = true
    else if (tipo === 'pendiente_otro') cur.pendienteOtro = true

    map[id] = cur
  }
  return map
}

/**
 * Lista de pagos pendientes de mensualidad con vencimiento en los próximos `días` calendario.
 */
export async function listarMensualidadesProximasAVencer({ dias = DIAS_VENCE_MENSUALIDAD_PRONTO } = {}) {
  const supabase = getSupabase()
  const hoyStr = new Date().toISOString().slice(0, 10)
  const hasta = new Date()
  hasta.setDate(hasta.getDate() + dias)
  const hastaStr = hasta.toISOString().slice(0, 10)

  const sel =
    'id_pago, id_alumno, estado, fecha_vencimiento, monto, monto_final, mes_correspondiente,' +
    ' alumno:id_alumno(nombres, apellidos, telefono),' +
    ' concepto_pago(codigo), concepto'

  const { data, error } = await supabase
    .from('pago')
    .select(sel)
    .eq('estado', 'pendiente')
    .gte('fecha_vencimiento', hoyStr)
    .lte('fecha_vencimiento', hastaStr)
    .order('fecha_vencimiento', { ascending: true })
    .limit(500)

  if (error) throw error
  return (data || []).filter(esMensualidadPago)
}
