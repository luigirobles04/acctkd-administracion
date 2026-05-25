'use client'
import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatMoney, formatFecha } from '@/lib/utils/format'
import {
  listarMensualidadesProximasAVencer,
  obtenerMapaAlertasMensualidadPorAlumno,
  DIAS_VENCE_MENSUALIDAD_PRONTO,
} from '@/lib/services/pagoAlerts.service'
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const STATS = [
  { key: 'alumnos',    label: 'Alumnos',      icon: 'school',        color: '#007AFF', bg: 'rgba(0,122,255,0.12)',  href: '/admin/alumnos'    },
  { key: 'maestros',   label: 'Maestros',     icon: 'person_pin',    color: '#34C759', bg: 'rgba(52,199,89,0.12)',  href: '/admin/maestros'   },
  { key: 'pagos',      label: 'Pagos (mes)',  icon: 'payments',      color: '#FF9500', bg: 'rgba(255,149,0,0.12)',  href: '/admin/pagos'      },
  { key: 'campeonatos',label: 'Campeonatos',  icon: 'emoji_events',  color: 'var(--red)', bg: 'rgba(192,0,0,0.12)',    href: '/admin/campeonatos'},
]

const ACCESOS = [
  { label: 'Registrar alumno',     icon: 'person_add',    href: '/admin/alumnos',     color: '#007AFF' },
  { label: 'Tomar asistencia',     icon: 'fact_check',    href: '/admin/asistencia',  color: '#34C759' },
  { label: 'Registrar pago',       icon: 'add_card',      href: '/admin/pagos',       color: '#FF9500' },
  { label: 'Nuevo campeonato',     icon: 'emoji_events',  href: '/admin/campeonatos', color: 'var(--red)' },
  { label: 'Gestionar maestros',   icon: 'manage_accounts',href: '/admin/maestros',   color: '#AF52DE' },
  { label: 'Sedes',                icon: 'location_on',   href: '/admin/sedes',       color: '#5AC8FA' },
]

function asistenciaBucket(row) {
  const obs = (row.observacion || '').toLowerCase()
  if (obs.includes('recuper')) return 'recuperacion'
  if (row.presente) return 'presente'
  if (row.justificado) return 'justificada'
  return 'ausente'
}

const MESES_LABEL = {
  '2026-01': 'Ene 26', '2026-02': 'Feb 26', '2026-03': 'Mar 26', '2026-04': 'Abr 26',
  '2026-05': 'May 26', '2026-06': 'Jun 26', '2025-11': 'Nov 25', '2025-12': 'Dic 25',
}

function ymRestarMeses(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sumaCobradoMes(pagosRows, ym) {
  return (pagosRows || [])
    .filter((p) => p.estado === 'pagado' && typeof p.fecha_pago === 'string' && p.fecha_pago.startsWith(ym))
    .reduce((s, p) => s + parseFloat(p.monto_final ?? p.monto ?? 0), 0)
}

function pctDelta(actual, anterior) {
  if (!anterior) return actual > 0 ? 100 : 0
  return Math.round(((actual - anterior) / anterior) * 100)
}

function ymLabel(ym) {
  return MESES_LABEL[ym] || ym
}

function tituloMesActual() {
  const d = new Date()
  const t = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ alumnos: '—', maestros: '—', pagos: '—', campeonatos: '—' })
  const [kpis, setKpis] = useState({
    cobradoMes: 0,
    deltaMes: 0,
    vencidos: 0,
    proximos: 0,
    pctAsistenciaMes: null,
    campeonatosActivos: 0,
  })
  const [alertasCobro, setAlertasCobro] = useState([])
  const [chartsReady, setChartsReady] = useState(false)
  const pagoEstadoRef = useRef(null)
  const ingresoMesRef = useRef(null)
  const asisteRef = useRef(null)
  const chartRefs = useRef([])

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  useEffect(() => {
    if (!supabase) return

    async function load() {
      const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      const finMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
      const ymActual = today.toISOString().slice(0, 7)
      const ymAnterior = ymRestarMeses(ymActual, 1)

      const [{ count: al }, { count: ma }, { count: pa }, { count: ca }, { count: caAct }] = await Promise.all([
        supabase.from('alumno').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('maestro').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('pago').select('*', { count: 'exact', head: true }).gte('fecha_pago', inicioMes),
        supabase.from('campeonato').select('*', { count: 'exact', head: true }),
        supabase.from('campeonato').select('*', { count: 'exact', head: true }).in('estado', ['inscripciones', 'en_curso']),
      ])
      setStats({ alumnos: al ?? 0, maestros: ma ?? 0, pagos: pa ?? 0, campeonatos: ca ?? 0 })

      const [pagosRes, asistRes, mapaAlertas, proximasAlertas] = await Promise.all([
        supabase.from('pago').select('estado, monto, monto_final, fecha_pago, fecha_vencimiento, concepto_pago(codigo), concepto').limit(8000),
        supabase.from('asistencia_alumno').select('presente, justificado, observacion, clase!inner(fecha)').gte('clase.fecha', inicioMes).lte('clase.fecha', finMes).limit(8000),
        obtenerMapaAlertasMensualidadPorAlumno().catch(() => ({})),
        listarMensualidadesProximasAVencer({ dias: DIAS_VENCE_MENSUALIDAD_PRONTO }).catch(() => []),
      ])

      const pagosRows = pagosRes.data
      const asistRows = asistRes.data

      const cobradoMes = sumaCobradoMes(pagosRows, ymActual)
      const cobradoAnterior = sumaCobradoMes(pagosRows, ymAnterior)
      let vencidos = 0
      let proximos = 0
      Object.values(mapaAlertas || {}).forEach((a) => {
        if (a.vencida) vencidos += 1
        if (a.pendienteProximo) proximos += 1
      })

      const asist = { presente: 0, ausente: 0, justificada: 0, recuperacion: 0 }
      ;(asistRows || []).forEach((r) => {
        const b = asistenciaBucket(r)
        if (asist[b] !== undefined) asist[b] += 1
      })
      const totalAsistMes = Object.values(asist).reduce((a, b) => a + b, 0)
      const pctAsistenciaMes = totalAsistMes > 0 ? Math.round((asist.presente / totalAsistMes) * 100) : null

      setKpis({
        cobradoMes,
        deltaMes: pctDelta(cobradoMes, cobradoAnterior),
        vencidos,
        proximos,
        pctAsistenciaMes,
        campeonatosActivos: caAct ?? 0,
      })
      setAlertasCobro((proximasAlertas || []).slice(0, 5))

      const porEstado = {}
      const ingresoMes = {}
      ;(pagosRows || []).forEach((p) => {
        const e = (p.estado || 'sin_estado').toLowerCase()
        porEstado[e] = (porEstado[e] || 0) + 1
        if (p.estado === 'pagado' && p.fecha_pago) {
          const ym = p.fecha_pago.slice(0, 7)
          const m = parseFloat(p.monto_final ?? p.monto ?? 0)
          if (!Number.isNaN(m)) ingresoMes[ym] = (ingresoMes[ym] || 0) + m
        }
      })

      chartRefs.current.forEach((c) => c.destroy())
      chartRefs.current = []

      const commonTooltip = {
        backgroundColor: 'rgba(28,28,30,0.92)',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      }

      if (pagoEstadoRef.current && Object.keys(porEstado).length > 0) {
        const labels = Object.keys(porEstado)
        const colores = labels.map((k) =>
          k === 'pagado' ? '#34C759' : k === 'pendiente' ? '#FF9500' : k === 'vencido' ? '#FF3B30' : '#8E8E93'
        )
        chartRefs.current.push(
          new Chart(pagoEstadoRef.current, {
            type: 'doughnut',
            data: {
              labels,
              datasets: [{ data: labels.map((k) => porEstado[k]), backgroundColor: colores, borderWidth: 0 }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
                tooltip: { ...commonTooltip },
              },
              cutout: '62%',
            },
          })
        )
      }

      if (ingresoMesRef.current) {
        const claves = Object.keys(ingresoMes).sort()
        const ult = claves.slice(-6)
        if (ult.length > 0) {
        chartRefs.current.push(
          new Chart(ingresoMesRef.current, {
            type: 'bar',
            data: {
              labels: ult.map(ymLabel),
              datasets: [
                {
                  label: 'S/ cobrado (pagado)',
                  data: ult.map((k) => Math.round((ingresoMes[k] + Number.EPSILON) * 100) / 100),
                  backgroundColor: 'rgba(0,122,255,0.75)',
                  borderRadius: 6,
                  maxBarThickness: 36,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 } } },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  ...commonTooltip,
                  callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: S/ ${ctx.parsed.y.toFixed(2)}`,
                  },
                },
              },
            },
          })
        )
        }
      }

      if (asisteRef.current && Object.values(asist).some((n) => n > 0)) {
        chartRefs.current.push(
          new Chart(asisteRef.current, {
            type: 'bar',
            data: {
              labels: ['Presente', 'Ausente', 'Justificada', 'Recuperación'],
              datasets: [
                {
                  data: [asist.presente, asist.ausente, asist.justificada, asist.recuperacion],
                  backgroundColor: ['#34C759', '#FF3B30', '#FF9500', '#5AC8FA'],
                  borderRadius: 6,
                  maxBarThickness: 28,
                },
              ],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
                y: { grid: { display: false } },
              },
              plugins: { legend: { display: false }, tooltip: { ...commonTooltip } },
            },
          })
        )
      }

      setChartsReady(true)
    }

    load()
    return () => {
      chartRefs.current.forEach((c) => c.destroy())
      chartRefs.current = []
    }
  }, [])

  return (
    <AdminLayout title="Panel de control" subtitle={dateCap}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 8px 24px' }}>

        <div className="anim-fade-up" style={{ marginBottom: 28 }}>
          <p className="ios-caption" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, color: 'var(--red)' }}>
            Resumen general
          </p>
          <h2 className="ios-title-lg" style={{ color: 'var(--label)', marginTop: 6 }}>Panel de control</h2>
          <p className="ios-body" style={{ color: 'var(--label3)', marginTop: 4 }}>
            Estado actual de la academia e indicadores clave — {tituloMesActual()}.
          </p>
        </div>

        <div
          className="anim-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 20,
            animationDelay: '0.03s',
          }}
        >
          {[
            { label: 'Cobrado este mes', val: formatMoney(kpis.cobradoMes), sub: `${kpis.deltaMes >= 0 ? '+' : ''}${kpis.deltaMes}% vs mes anterior`, color: '#007AFF', href: '/admin/pagos' },
            { label: 'Mensualidades vencidas', val: kpis.vencidos, sub: 'Alumnos con cuota vencida', color: '#FF3B30', href: '/admin/alumnos' },
            { label: `Próximos ${DIAS_VENCE_MENSUALIDAD_PRONTO} días`, val: kpis.proximos, sub: 'Por vencer pronto', color: '#FF9500', href: '/admin/pagos' },
            { label: 'Asistencia del mes', val: kpis.pctAsistenciaMes != null ? `${kpis.pctAsistenciaMes}%` : '—', sub: 'Marcas presentes / total', color: '#34C759', href: '/admin/asistencia' },
            { label: 'Campeonatos activos', val: kpis.campeonatosActivos, sub: 'Inscripciones o en curso', color: 'var(--red)', href: '/admin/campeonatos' },
          ].map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => router.push(k.href)}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '14px 16px',
                border: '0.5px solid var(--separator)',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <p className="ios-caption" style={{ color: 'var(--label3)' }}>{k.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.val}</p>
              <p className="ios-caption" style={{ color: 'var(--label3)', marginTop: 4 }}>{k.sub}</p>
            </button>
          ))}
        </div>

        {alertasCobro.length > 0 && (
          <div className="ios-card anim-fade-up" style={{ padding: 16, marginBottom: 20, animationDelay: '0.05s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="ios-headline" style={{ color: 'var(--label)' }}>Cobranza próxima</p>
              <button type="button" className="ios-btn ios-btn-ghost" style={{ height: 32, fontSize: 13 }} onClick={() => router.push('/admin/pagos')}>Ver pagos</button>
            </div>
            <div className="ios-group">
              {alertasCobro.map((p) => (
                <div key={p.id_pago} className="ios-group-row">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{p.alumno?.nombres} {p.alumno?.apellidos}</p>
                    <p className="ios-caption" style={{ color: 'var(--label3)' }}>Vence {formatFecha(p.fecha_vencimiento)} · {formatMoney(p.monto_final ?? p.monto)}</p>
                  </div>
                  <span className="ios-badge badge-yellow">Próximo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="anim-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: 12,
            marginBottom: 28,
            animationDelay: '0.04s',
          }}
        >
          {STATS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => router.push(s.href)}
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: '16px',
                border: '0.5px solid var(--separator)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 22, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: 'var(--label)', lineHeight: 1 }}>
                  {stats[s.key]}
                </p>
                <p style={{ fontSize: 12, color: 'var(--label3)', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        <div
          className="anim-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 28,
            animationDelay: '0.06s',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: '18px 18px 12px',
              border: '0.5px solid var(--separator)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p className="ios-headline" style={{ marginBottom: 4, color: 'var(--label)' }}>Pagos por estado</p>
            <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 12 }}>Distribución de registros recientes</p>
            <div style={{ height: 220, position: 'relative' }}>
              <canvas ref={pagoEstadoRef} aria-label="Gráfico pagos por estado" />
              {!chartsReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', color: 'var(--label3)', fontSize: 13 }}>
                  Cargando…
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: '18px 18px 12px',
              border: '0.5px solid var(--separator)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p className="ios-headline" style={{ marginBottom: 4, color: 'var(--label)' }}>Ingresos por mes</p>
            <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 12 }}>Suma de pagos marcados como pagados</p>
            <div style={{ height: 220, position: 'relative' }}>
              <canvas ref={ingresoMesRef} aria-label="Gráfico ingresos por mes" />
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: '18px 18px 12px',
              border: '0.5px solid var(--separator)',
              boxShadow: 'var(--shadow-sm)',
              gridColumn: '1 / -1',
              maxWidth: 480,
            }}
          >
            <p className="ios-headline" style={{ marginBottom: 4, color: 'var(--label)' }}>Asistencias del mes</p>
            <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 12 }}>{tituloMesActual()} — marcas en clases del periodo</p>
            <div style={{ height: 200, position: 'relative' }}>
              <canvas ref={asisteRef} aria-label="Gráfico asistencias" />
            </div>
          </div>
        </div>

        <div className="anim-fade-up" style={{ animationDelay: '0.08s' }}>
          <p className="ios-headline" style={{ marginBottom: 12, color: 'var(--label)' }}>Acceso rápido</p>
          <div className="ios-group">
            {ACCESOS.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => router.push(a.href)}
                className="ios-group-row"
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: a.color, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--label)' }}>{a.label}</span>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--label4)' }}>chevron_right</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
