'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase, getSupabase } from '@/lib/supabase'
import {
  formatMoney,
  formatFecha,
  formatTelefono,
  iniciales,
  waLink,
  hoyISO,
  labelConceptoPago,
  etiquetaMetodoVisible,
} from '@/lib/utils/format'
import { listarMensualidadesProximasAVencer, DIAS_VENCE_MENSUALIDAD_PRONTO, clasificarCuotaMensualidadVisual, esMensualidadPago } from '@/lib/services/pagoAlerts.service'

const PRIORIDAD_ESTADO = { vencido: 0, pendiente: 1, pagado: 2, anulado: 3 }

const FILTROS_ESTADO = [
  { id: 'todos', label: 'Todos' },
  { id: 'pagado', label: 'Pagados' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'vencido', label: 'Vencidos' },
]

function labelMesCorrespondiente(fechaIso) {
  if (!fechaIso) return ''
  const d = new Date(fechaIso)
  if (isNaN(d)) return ''
  const t = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function ymDesdeFechaRef() {
  return new Date().toISOString().slice(0, 7)
}

function ymRestarMeses(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function tituloMesYM(ym) {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())
}

function sumaCobradoMes(pagosArray, ym) {
  return pagosArray
    .filter((p) => p.estado === 'pagado' && typeof p.fecha_pago === 'string' && p.fecha_pago.startsWith(ym))
    .reduce((s, p) => s + parseFloat(p.monto_final || p.monto), 0)
}

function badgeCuotaMensualidadOPorEstado(p) {
  if (esMensualidadPago(p) && (p.estado === 'pendiente' || p.estado === 'vencido')) {
    const c = clasificarCuotaMensualidadVisual(p)
    if (c === 'vencida') return { cls: 'badge-red', txt: 'Vencido' }
    if (c === 'proximo') return { cls: 'badge-yellow', txt: 'Pendiente' }
    if (c === 'pendiente_otro') return { cls: 'badge-yellow', txt: 'Sin pagar' }
  }
  return {
    cls: {
      pagado: 'badge-green',
      pendiente: 'badge-yellow',
      vencido: 'badge-red',
      anulado: 'badge-gray',
    }[p.estado] || 'badge-gray',
    txt: {
      pagado: 'Pagado',
      pendiente: 'Pendiente',
      vencido: 'Vencido',
      anulado: 'Anulado',
    }[p.estado] || p.estado || '—',
  }
}

function mensajeCobroPendiente({ alumno, monto, concepto, mesLabel, academiaNombre }) {
  const nombre = alumno ? `${alumno.nombres} ${alumno.apellidos}`.trim() : 'su hijo/a o familiar'
  const partes = [
    `Hola 👋 Somos *${academiaNombre}*.`,
    `Le escribimos por la *mensualidad pendiente* a nombre de *${nombre}* por *${formatMoney(monto)}*.`,
  ]
  if (mesLabel) partes.push(`📅 Período: *${mesLabel}*.`)
  else if (concepto) partes.push(`📌 Concepto: ${concepto}.`)
  partes.push('¿Podría confirmarnos el pago o coordinar cuando lo realiza? ¡Muchas gracias!')
  return partes.join('\n')
}

function normalizeMonthInput(isoDay) {
  if (!isoDay || isoDay.length < 7) return ''
  return isoDay.slice(0, 7)
}

const METODO_A_CODIGO = {
  efectivo: 'EFECTIVO',
  yape: 'YAPE',
  plin: 'PLIN',
  transferencia: 'BCP',
  tarjeta: 'TARJETA',
}

/** Mapeo flexible texto libre → fila catalogo concepto_pago */
function textoConceptoAcodigo(texto) {
  const s = (texto || '').toLowerCase()
  if (/mensual/.test(s)) return 'MENSUALIDAD'
  if (/matricul/.test(s)) return 'MATRICULA'
  if (/dan/.test(s)) return 'EXAMEN_DAN'
  if (/kup|\bexam/.test(s)) return 'EXAMEN_KUP'
  if (/campeonato/.test(s)) return 'CAMPEONATO'
  if (/uniform|dobok/.test(s)) return 'UNIFORME'
  if (/protecc/.test(s)) return 'PROTECCIONES'
  if (/suelt/.test(s)) return 'CLASE_SUELTA'
  return 'OTRO'
}

async function idsConceptoMetodoPagos(sb, conceptoTxt, metodoTxt) {
  const codConc = textoConceptoAcodigo(conceptoTxt)
  const codMet = METODO_A_CODIGO[(metodoTxt || 'efectivo').trim().toLowerCase()] || 'EFECTIVO'
  const [{ data: c }, { data: m }] = await Promise.all([
    sb.from('concepto_pago').select('id_concepto').eq('codigo', codConc).maybeSingle(),
    sb.from('metodo_pago').select('id_metodo').eq('codigo', codMet).maybeSingle(),
  ])
  return { id_concepto: c?.id_concepto ?? null, id_metodo: m?.id_metodo ?? null }
}

export default function PagosPage() {
  const academiaNombre = process.env.NEXT_PUBLIC_ACADEMIA_NOMBRE || 'ACCTKD'

  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [search, setSearch] = useState('')
  const [cobroSheet, setCobroSheet] = useState(null)
  const [cobroFecha, setCobroFecha] = useState(() => hoyISO())
  const [cobroMetodo, setCobroMetodo] = useState('efectivo')
  const [cobroSaving, setCobroSaving] = useState(false)
  const [listError, setListError] = useState(null)
  const [proximosVencer, setProximosVencer] = useState([])
  const [mesEstadisticasYm, setMesEstadisticasYm] = useState(() => ymDesdeFechaRef())
  const [form, setForm] = useState({
    id_alumno: '',
    concepto: 'Mensualidad',
    monto: 80,
    descuento: 0,
    fecha_pago: hoyISO(),
    mes_correspondiente: `${new Date().toISOString().slice(0, 7)}-01`,
    metodo_pago: 'efectivo',
    observaciones: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (!showModal) return
    setForm({
      id_alumno: '',
      concepto: 'Mensualidad',
      monto: 80,
      descuento: 0,
      fecha_pago: hoyISO(),
      mes_correspondiente: `${new Date().toISOString().slice(0, 7)}-01`,
      metodo_pago: 'efectivo',
      observaciones: '',
    })
  }, [showModal])

  const planMontoAplicado = useRef(null)

  useEffect(() => {
    if (!form.id_alumno) {
      planMontoAplicado.current = null
      return
    }
    const key = String(form.id_alumno)
    if (planMontoAplicado.current === key) return
    const alum = alumnos.find((a) => String(a.id_alumno) === key)
    const mPlan = alum?.plan?.monto
    if (mPlan == null || Number.isNaN(Number(mPlan))) return
    planMontoAplicado.current = key
    setForm((prev) => ({ ...prev, monto: Number(mPlan) }))
  }, [form.id_alumno, alumnos])

  async function fetchAll() {
    setLoading(true)
    setListError(null)
    try {
      if (!supabase) {
        setListError('Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).')
        setPagos([])
        setAlumnos([])
        return
      }
      const selPagos =
        '*, alumno:id_alumno(nombres, apellidos, dni, telefono), sede:id_sede(nombre), concepto_pago(nombre), metodo_cat:metodo_pago!id_metodo(nombre)'
      const [{ data: pagosData, error: errPagos }, { data: alumnosData, error: errAlum }] = await Promise.all([
        supabase.from('pago').select(selPagos).order('fecha_pago', { ascending: false }).limit(500),
        supabase
          .from('alumno')
          .select('id_alumno, nombres, apellidos, dni, estado, telefono, id_sede, plan:id_plan(id_plan, nombre, monto)')
          .neq('estado', 'retirado')
          .order('apellidos'),
      ])
      if (errPagos) {
        console.error(errPagos)
        const retry = await supabase
          .from('pago')
          .select('*')
          .order('fecha_pago', { ascending: false })
          .limit(500)
        if (retry.error) {
          setListError(retry.error.message || String(retry.error))
          setPagos([])
        } else {
          setPagos(retry.data || [])
          setListError(`Pagos (sin enlaces): ${errPagos.message}`)
        }
      } else {
        setPagos(pagosData || [])
      }
      if (errAlum) {
        console.error(errAlum)
        setListError((prev) => (prev ? `${prev}; ` : '') + (errAlum.message || 'Error al cargar alumnos'))
        setAlumnos([])
      } else {
        setAlumnos(alumnosData || [])
      }

      try {
        const prox = await listarMensualidadesProximasAVencer()
        setProximosVencer(Array.isArray(prox) ? prox : [])
      } catch (eV) {
        console.warn(eV)
        setProximosVencer([])
      }
    } catch (e) {
      console.error(e)
      setListError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!supabase) {
      alert('Supabase no está configurado.')
      return
    }
    setSaving(true)
    try {
      const idAl = parseInt(form.id_alumno, 10)
      const alum = alumnos.find((a) => a.id_alumno === idAl)
      const sb = getSupabase()
      const { id_concepto, id_metodo } = await idsConceptoMetodoPagos(sb, form.concepto, form.metodo_pago)
      const payload = {
        id_alumno: idAl,
        id_sede: alum?.id_sede ?? 1,
        concepto: form.concepto,
        monto: parseFloat(form.monto),
        descuento: parseFloat(form.descuento || 0),
        fecha_pago: form.fecha_pago,
        mes_correspondiente: form.mes_correspondiente || null,
        metodo_pago: form.metodo_pago || 'efectivo',
        observaciones: form.observaciones?.trim() || null,
        estado: 'pagado',
        id_plan: alum?.plan?.id_plan ?? null,
        id_concepto,
        id_metodo,
        numero_recibo: null,
      }
      const { error } = await sb.from('pago').insert(payload)
      if (error) throw error
      setShowModal(false)
      fetchAll()
    } catch (err) {
      alert('Error: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  function abrirRegistrarCobro(p) {
    setCobroFecha(hoyISO())
    const m = (p.metodo_pago || '').toLowerCase()
    const ok = ['efectivo', 'transferencia', 'yape', 'plin'].includes(m)
    setCobroMetodo(ok ? m : 'efectivo')
    setCobroSheet(p)
  }

  async function ejecutarCobroPendiente() {
    if (!cobroSheet || !supabase) return
    setCobroSaving(true)
    try {
      const sb = getSupabase()
      const codMet =
        METODO_A_CODIGO[(cobroMetodo || 'efectivo').trim().toLowerCase()] || 'EFECTIVO'
      const { data: m } = await sb
        .from('metodo_pago')
        .select('id_metodo')
        .eq('codigo', codMet)
        .maybeSingle()
      const { error } = await sb
        .from('pago')
        .update({
          estado: 'pagado',
          fecha_pago: cobroFecha,
          fecha_vencimiento: null,
          metodo_pago: cobroMetodo,
          id_metodo: m?.id_metodo ?? null,
        })
        .eq('id_pago', cobroSheet.id_pago)
      if (error) throw error
      setCobroSheet(null)
      await fetchAll()
    } catch (err) {
      alert('No se pudo registrar el cobro: ' + (err.message || err))
    } finally {
      setCobroSaving(false)
    }
  }

  const ymMesActualHoy = ymDesdeFechaRef()
  const ymMesAnteriorVsHoy = ymRestarMeses(ymMesActualHoy, 1)
  const cobradoMesSeleccion = sumaCobradoMes(pagos, mesEstadisticasYm)
  const cobradoMesPasadoVsHoy = sumaCobradoMes(pagos, ymMesAnteriorVsHoy)

  const pendientes = pagos.filter((p) => p.estado === 'pendiente' || p.estado === 'vencido').length

  const filtradosOrdenados = useMemo(() => {
    const base = filtro === 'todos' ? pagos : pagos.filter((p) => p.estado === filtro)
    const sorted = [...base].sort((a, b) => {
      const pa = PRIORIDAD_ESTADO[a.estado] ?? 9
      const pb = PRIORIDAD_ESTADO[b.estado] ?? 9
      if (pa !== pb) return pa - pb
      return String(b.fecha_pago || '').localeCompare(String(a.fecha_pago || ''))
    })
    const t = search.toLowerCase().trim()
    if (!t) return sorted
    return sorted.filter((p) => {
      const a = p.alumno
      const blob = [
        a?.nombres,
        a?.apellidos,
        a?.dni,
        labelConceptoPago(p),
        etiquetaMetodoVisible(p),
        p.estado,
        p.sede?.nombre,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(t)
    })
  }, [pagos, filtro, search])

  const alumSel = useMemo(
    () => alumnos.find((a) => String(a.id_alumno) === String(form.id_alumno)),
    [alumnos, form.id_alumno],
  )

  function puedeCobrarPorWa(p) {
    const t = p.alumno?.telefono
    return (p.estado === 'pendiente' || p.estado === 'vencido') && t && String(t).replace(/\D/g, '').length >= 9
  }

  function linkWaPago(p) {
    const t = p.alumno?.telefono
    const monto = parseFloat(p.monto_final || p.monto)
    const mesLbl = labelMesCorrespondiente(p.mes_correspondiente)
    const msg = mensajeCobroPendiente({
      alumno: p.alumno,
      monto,
      concepto: labelConceptoPago(p),
      mesLabel: mesLbl,
      academiaNombre,
    })
    return waLink(t, msg)
  }

  return (
    <AdminLayout
      title="Pagos y mensualidades"
      subtitle={`${pagos.length} movimientos · ${pendientes} pendientes o vencidos · ${alumnos.length} alumnos`}
      actions={
        <button
          className="ios-btn ios-btn-primary"
          style={{ height: 38, padding: '0 16px', fontSize: 14 }}
          type="button"
          onClick={() => setShowModal(true)}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
          <span className="hidden sm:inline">Registrar pago</span>
        </button>
      }
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {listError && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(229,57,53,0.1)',
              border: '1px solid rgba(229,57,53,0.35)',
              fontSize: 13,
              color: '#B71C1C',
            }}
          >
            <strong>No se pudieron cargar algunos datos.</strong> {listError}
          </div>
        )}
        <div className="ios-form-section" style={{ marginBottom: 16 }}>
          <p className="ios-form-section-title" style={{ marginBottom: 10 }}>
            Resumen cobrado (por mes de fecha de pago · «mes anterior» respecto al calendario de hoy)
          </p>
          <div className="ios-form-row">
            <span className="ios-form-row-label">Mes a consultar</span>
            <input
              type="month"
              value={mesEstadisticasYm}
              onChange={(e) => e.target.value && setMesEstadisticasYm(e.target.value.slice(0, 7))}
              style={{ textAlign: 'right' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatMini label={`Mes elegido (${tituloMesYM(mesEstadisticasYm)})`} valor={formatMoney(cobradoMesSeleccion)} color="#059669" icon="payments" />
          <StatMini
            label={`Mes anterior (${tituloMesYM(ymMesAnteriorVsHoy)})`}
            valor={formatMoney(cobradoMesPasadoVsHoy)}
            color="#0D9488"
            icon="calendar_month"
          />
          <StatMini label="Pendientes / vencidos" valor={pendientes} color="#D97706" icon="schedule" />
          <StatMini label="Movimientos" valor={pagos.length} color="#1F3864" icon="receipt_long" />
          <StatMini label="Alumnos (cobros)" valor={alumnos.length} color="#E53935" icon="school" />
        </div>

        {proximosVencer.length > 0 && (
          <div
            className="ios-form-section"
            style={{ marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.28)' }}
          >
            <p className="ios-form-section-title" style={{ paddingTop: 4 }}>
              Próximos vencimientos de mensualidad ({proximosVencer.length} · {DIAS_VENCE_MENSUALIDAD_PRONTO} días)
            </p>
            <div style={{ padding: '4px 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proximosVencer.slice(0, 12).map((pv) => {
                const al = pv.alumno
                const nom = al ? `${al.apellidos ?? ''}, ${al.nombres ?? ''}`.trim() || 'Alumno' : '—'
                const monto = parseFloat(pv.monto_final || pv.monto)
                const mesLbl = labelMesCorrespondiente(pv.mes_correspondiente)
                return (
                  <div key={pv.id_pago} className="ios-form-row" style={{ minHeight: 44 }}>
                    <span style={{ fontWeight: 600, flex: '1 1 160px', minWidth: 0 }} className="truncate-1">
                      {nom}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--label3)', textAlign: 'right' }}>
                      {mesLbl ? `${mesLbl} · ` : ''}
                      Vence <strong>{formatFecha(pv.fecha_vencimiento)}</strong> ·{' '}
                      <strong>{formatMoney(monto)}</strong>
                    </span>
                  </div>
                )
              })}
              {proximosVencer.length > 12 ? (
                <p style={{ fontSize: 12, color: 'var(--label3)', paddingLeft: 2 }}>
                  Hay {proximosVencer.length - 12} movimientos más en «Pendientes».
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="ios-searchbar" style={{ marginBottom: 12 }}>
          <span className="ios-searchbar-icon material-symbols-rounded" style={{ fontSize: 18 }}>search</span>
          <input
            type="search"
            placeholder="Buscar por alumno, concepto o medio de pago…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ios-chip ${filtro === f.id ? 'active' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ios-form-section" style={{ padding: 0 }}>
          {loading ? (
            <div className="ios-empty">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2.5px solid var(--red)',
                  borderTopColor: 'transparent',
                  margin: '0 auto 10px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Cargando pagos…
            </div>
          ) : filtradosOrdenados.length === 0 ? (
            <div className="ios-empty">
              <span className="material-symbols-rounded ios-empty-icon">payments</span>
              <p style={{ fontSize: 15, color: 'var(--label2)', fontWeight: 500 }}>
                {search
                  ? 'No hay pagos que coincidan con la búsqueda'
                  : 'No hay registros con este filtro'}
              </p>
            </div>
          ) : (
            <div>
              {filtradosOrdenados.map((p) => {
                const a = p.alumno
                const ini = iniciales(a?.nombres, a?.apellidos)
                const monto = parseFloat(p.monto_final || p.monto)
                const mesLbl = labelMesCorrespondiente(p.mes_correspondiente)
                const badgeSt = badgeCuotaMensualidadOPorEstado(p)
                const claseCuotaVisual = esMensualidadPago(p) ? clasificarCuotaMensualidadVisual(p) : null
                const esPendiente = p.estado === 'pendiente' || p.estado === 'vencido'
                const cobrarWa = puedeCobrarPorWa(p)
                const urlWa = cobrarWa ? linkWaPago(p) : null
                const filaBg =
                  claseCuotaVisual === 'vencida' || p.estado === 'vencido'
                    ? 'linear-gradient(90deg, rgba(220,38,38,0.07) 0%, transparent 10px)'
                    : esPendiente
                      ? 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, transparent 10px)'
                      : undefined
                const busy = cobroSaving && cobroSheet?.id_pago === p.id_pago
                const textoCintaCobro =
                  claseCuotaVisual === 'vencida'
                    ? 'Cuota vencida'
                    : claseCuotaVisual === 'proximo'
                      ? 'Cuota próxima a vencer'
                      : claseCuotaVisual === 'pendiente_otro'
                        ? 'Cuota pendiente'
                        : p.estado === 'vencido'
                          ? 'Cobro vencido'
                          : 'Cobro pendiente'

                const iconoDeudaCritica =
                  claseCuotaVisual === 'vencida' || p.estado === 'vencido'

                return (
                  <div
                    key={p.id_pago}
                    style={{
                      borderBottom: '0.5px solid var(--separator)',
                      background: filaBg,
                    }}
                  >
                    <div
                      className="ios-data-row"
                      style={{
                        borderBottom: esPendiente ? 'none' : undefined,
                        cursor: 'default',
                        alignItems: 'flex-start',
                      }}
                      role="group"
                      aria-label={`Pago ${p.id_pago} · ${labelConceptoPago(p)}`}
                    >
                      <div className="ios-avatar">{ini}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ios-hstack" style={{ gap: 8, marginBottom: 2 }}>
                          <p className="truncate-1" style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                            {a ? `${a.apellidos}, ${a.nombres}` : '—'}
                          </p>
                          {!esPendiente && etiquetaMetodoVisible(p) !== '—' ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#065F46',
                                background: 'rgba(16,185,129,0.12)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                letterSpacing: 0.15,
                                flexShrink: 0,
                                textTransform: 'capitalize',
                              }}
                            >
                              {etiquetaMetodoVisible(p)}
                            </span>
                          ) : esPendiente ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--label3)',
                                background: 'rgba(60,60,67,0.08)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              Medio al cobrar
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate-1" style={{ fontSize: 12, color: 'var(--label3)' }}>
                          {labelConceptoPago(p)}
                          {mesLbl ? ` · ${mesLbl}` : ''}
                          {p.sede?.nombre ? ` · ${p.sede.nombre}` : ''}
                        </p>
                        <p className="truncate-1 sm:hidden" style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2 }}>
                          {formatTelefono(a?.telefono) || '—'}
                          {!esPendiente && etiquetaMetodoVisible(p) !== '—'
                            ? ` · ${etiquetaMetodoVisible(p)}`
                            : ''}
                        </p>
                        <div className="ios-hstack sm:hidden" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className={`ios-badge ${badgeSt.cls}`}>{badgeSt.txt}</span>
                        </div>
                      </div>
                      <div
                        className="ios-hstack"
                        style={{
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3, color: 'var(--label)' }}>
                            {formatMoney(monto)}
                          </p>
                          {p.descuento > 0 ? (
                            <p style={{ fontSize: 11, color: '#1A7A34', fontWeight: 600, marginTop: 2 }}>
                              −{formatMoney(p.descuento)} dto.
                            </p>
                          ) : null}
                          <p style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2, textTransform: 'capitalize' }}>
                            {esPendiente
                              ? p.fecha_vencimiento
                                ? `Vence ${formatFecha(p.fecha_vencimiento)}`
                                : 'Aún sin cobrar'
                              : etiquetaMetodoVisible(p) !== '—'
                                ? `${etiquetaMetodoVisible(p)} · ${formatFecha(p.fecha_pago)}`
                                : formatFecha(p.fecha_pago)}
                          </p>
                          <span className={`hidden sm:inline-flex ios-badge ${badgeSt.cls}`} style={{ marginTop: 6 }}>
                            {badgeSt.txt}
                          </span>
                        </div>
                      </div>
                    </div>
                    {esPendiente && (
                      <div style={{ padding: '0 12px 14px 56px' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.94)',
                            border: '0.5px solid var(--separator)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)', marginBottom: 4 }}>
                              <span
                                className="material-symbols-rounded"
                                style={{
                                  fontSize: 16,
                                  verticalAlign: 'text-bottom',
                                  marginRight: 4,
                                  color: iconoDeudaCritica ? 'var(--red)' : '#D97706',
                                }}
                              >
                                {iconoDeudaCritica ? 'warning' : 'schedule'}
                              </span>
                              {textoCintaCobro} · {formatMoney(monto)}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--label3)', lineHeight: 1.45 }}>
                              Mensaje listo para WhatsApp con el monto y el período
                              {mesLbl ? ` (${mesLbl})` : ''}.
                            </p>
                          </div>
                          <div className="ios-hstack" style={{ gap: 10, flexShrink: 0 }}>
                            {urlWa ? (
                              <a
                                href={urlWa}
                                target="_blank"
                                rel="noreferrer"
                                className="ios-btn ios-btn-ghost"
                                style={{ height: 44, width: 44, padding: 0, borderRadius: 14, border: '1px solid rgba(37, 211, 102, 0.35)' }}
                                title="Abrir WhatsApp con mensaje de mensualidad pendiente"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="material-symbols-rounded" style={{ fontSize: 24, color: '#25D366' }}>chat</span>
                              </a>
                            ) : (
                              <span
                                title="Agrega el teléfono del alumno en su ficha para enviar WhatsApp"
                                style={{
                                  height: 44,
                                  width: 44,
                                  borderRadius: 14,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(60,60,67,0.08)',
                                  opacity: 0.55,
                                  cursor: 'help',
                                }}
                              >
                                <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--label3)' }}>chat</span>
                              </span>
                            )}
                            <button
                              type="button"
                              className="ios-btn ios-btn-primary"
                              style={{ height: 44, padding: '0 18px', fontSize: 14, fontWeight: 700, gap: 6, display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => abrirRegistrarCobro(p)}
                              disabled={busy}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
                                {busy ? 'hourglass_empty' : 'task_alt'}
                              </span>
                              {busy ? 'Guardando…' : 'Registrar cobro'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {showModal && (
        <div
          className="ios-sheet-overlay anim-fade-in flex items-end sm:items-center justify-center p-0 sm:p-5"
          style={{ zIndex: 120 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-pago-titulo"
          onClick={() => setShowModal(false)}
        >
          <div
            className="ios-sheet anim-fade-up max-h-[92dvh] overflow-y-auto w-full sm:max-w-[520px] sm:!rounded-[28px]"
            style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ios-sheet-handle sm:hidden" aria-hidden />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '0 20px 14px',
                borderBottom: '0.5px solid var(--separator)',
              }}
            >
              <div>
                <h2 id="modal-pago-titulo" style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                  Registrar cobro
                </h2>
                <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 4, lineHeight: 1.35 }}>
                  Indica medio (Yape, transferencia o efectivo) al guardar el cobro. Elige el alumno y el período cubierto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(60,60,67,0.08)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Cerrar"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--label2)' }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ padding: '14px 16px 108px' }}>
                <div
                  style={{
                    marginBottom: 18,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(52,199,89,0.09)',
                    border: '0.5px solid rgba(52,199,89,0.28)',
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1A7A34', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18 }}>auto_awesome</span>
                    Al guardar
                  </p>
                  <ul style={{ fontSize: 12, color: 'var(--label2)', margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
                    <li>
                      Estado <strong>Pagado</strong>
                    </li>
                    <li>Monto sugerido = precio del plan del alumno (editable)</li>
                  </ul>
                </div>

                <PagoFormSection titulo="Alumno">
                  <PagoRow label="Seleccionar *">
                    <select
                      required
                      value={form.id_alumno}
                      onChange={(e) => setForm((prev) => ({ ...prev, id_alumno: e.target.value }))}
                    >
                      <option value="">Elige un alumno…</option>
                      {alumnos.map((a) => (
                        <option key={a.id_alumno} value={a.id_alumno}>
                          {a.apellidos}, {a.nombres} ({a.estado})
                        </option>
                      ))}
                    </select>
                  </PagoRow>
                  {alumSel?.plan ? (
                    <div style={{ padding: '6px 16px 12px', fontSize: 12, color: 'var(--label3)' }}>
                      Plan <strong style={{ color: 'var(--label)' }}>{alumSel.plan.nombre}</strong> · sugerido{' '}
                      <strong>{formatMoney(alumSel.plan.monto)}</strong>
                    </div>
                  ) : null}
                </PagoFormSection>

                <PagoFormSection titulo="Detalle del pago">
                  <PagoRow label="Concepto">
                    <input
                      value={form.concepto}
                      onChange={(e) => setForm((prev) => ({ ...prev, concepto: e.target.value }))}
                      placeholder="Mensualidad"
                    />
                  </PagoRow>
                  <PagoRow label="Monto S/ *">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.monto}
                      onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
                    />
                  </PagoRow>
                  <PagoRow label="Descuento">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.descuento}
                      onChange={(e) => setForm((prev) => ({ ...prev, descuento: e.target.value }))}
                      placeholder="0"
                    />
                  </PagoRow>
                  <PagoRow label="Mes cubre">
                    <input
                      type="month"
                      value={normalizeMonthInput(form.mes_correspondiente)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mes_correspondiente: e.target.value ? `${e.target.value}-01` : prev.mes_correspondiente,
                        }))
                      }
                    />
                  </PagoRow>
                  <PagoRow label="Fecha pago *">
                    <input
                      type="date"
                      required
                      value={form.fecha_pago}
                      onChange={(e) => setForm((prev) => ({ ...prev, fecha_pago: e.target.value }))}
                    />
                  </PagoRow>
                  <PagoRow label="Método *">
                    <select
                      value={form.metodo_pago}
                      onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                    </select>
                  </PagoRow>
                </PagoFormSection>

                <PagoFormSection titulo="Notas (opcional)">
                  <div style={{ padding: '10px 16px 12px' }}>
                    <textarea
                      value={form.observaciones}
                      onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                      placeholder="N.º de operación, yape, etc."
                      rows={3}
                      style={{
                        width: '100%',
                        minHeight: 72,
                        padding: 12,
                        border: 'none',
                        outline: 'none',
                        background: 'rgba(118,118,128,0.10)',
                        borderRadius: 10,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </PagoFormSection>
              </div>

              <div
                style={{
                  position: 'sticky',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(242,242,247,0.96)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  padding: '12px 16px 20px',
                  borderTop: '0.5px solid var(--separator)',
                  display: 'flex',
                  gap: 10,
                }}
              >
                <button type="button" onClick={() => setShowModal(false)} className="ios-btn ios-btn-ghost" style={{ flex: 1, height: 46 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="ios-btn ios-btn-primary" style={{ flex: 2, height: 46 }}>
                  {saving ? 'Guardando…' : 'Guardar cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cobroSheet && (
        <div
          className="ios-sheet-overlay anim-fade-in flex items-end sm:items-center justify-center p-0 sm:p-5"
          style={{ zIndex: 125 }}
          onClick={() => !cobroSaving && setCobroSheet(null)}
        >
          <div
            className="ios-sheet anim-fade-up max-h-[90dvh] overflow-y-auto w-full sm:max-w-[440px] sm:!rounded-[28px]"
            style={{ background: 'rgba(255,255,255,0.98)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cobro-sheet-titulo"
          >
            <div className="ios-sheet-handle sm:hidden" aria-hidden />
            <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid var(--separator)' }}>
              <h2 id="cobro-sheet-titulo" style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
                Registrar cobro recibido
              </h2>
              <p style={{ fontSize: 13, color: 'var(--label)', fontWeight: 600, marginTop: 8 }}>
                {cobroSheet.alumno
                  ? `${cobroSheet.alumno.apellidos}, ${cobroSheet.alumno.nombres}`
                  : '—'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--label3)', marginTop: 4 }}>
                {formatMoney(parseFloat(cobroSheet.monto_final || cobroSheet.monto))}
                {labelMesCorrespondiente(cobroSheet.mes_correspondiente)
                  ? ` · ${labelMesCorrespondiente(cobroSheet.mes_correspondiente)}`
                  : ''}
              </p>
            </div>

            <div style={{ padding: '14px 16px 18px' }}>
              <PagoFormSection titulo="¿Cuándo y cómo se pagó?">
                <PagoRow label="Fecha cobro *">
                  <input type="date" value={cobroFecha} onChange={(e) => setCobroFecha(e.target.value)} required />
                </PagoRow>
                <PagoRow label="Método *">
                  <select value={cobroMetodo} onChange={(e) => setCobroMetodo(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                  </select>
                </PagoRow>
              </PagoFormSection>
              <p style={{ fontSize: 11, color: 'var(--label3)', marginTop: 14, lineHeight: 1.45, padding: '0 4px' }}>
                Al confirmar, el movimiento pasa a <strong>Pagado</strong> con estos datos. Puedes editar la fecha si el pago fue en otro día.
              </p>
            </div>

            <div
              style={{
                padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                gap: 10,
                borderTop: '0.5px solid var(--separator)',
                background: 'rgba(242,242,247,0.96)',
              }}
            >
              <button
                type="button"
                className="ios-btn ios-btn-ghost"
                style={{ flex: 1, height: 46 }}
                disabled={cobroSaving}
                onClick={() => setCobroSheet(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-primary"
                style={{ flex: 2, height: 46 }}
                disabled={cobroSaving}
                onClick={ejecutarCobroPendiente}
              >
                {cobroSaving ? 'Guardando…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function PagoFormSection({ titulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="ios-form-section-title">{titulo}</p>
      <div className="ios-form-section" style={{ marginBottom: 0 }}>
        {children}
      </div>
    </div>
  )
}

function PagoRow({ label, children }) {
  return (
    <div className="ios-form-row">
      <span className="ios-form-row-label">{label}</span>
      {children}
    </div>
  )
}

function StatMini({ label, valor, color, icon }) {
  return (
    <div className="ios-card-flat" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}18`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
          {icon}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: -0.5,
            color: 'var(--label)',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {valor}
        </p>
        <p style={{ fontSize: 11, color: 'var(--label3)', marginTop: 2, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}
