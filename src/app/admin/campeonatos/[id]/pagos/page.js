'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'

function nombreLinea(l) {
  const nombres = (l.miembros || [])
    .map((m) => [m.perfil?.nombres, m.perfil?.apellidos].filter(Boolean).join(' '))
    .filter(Boolean)
  return nombres.join(' · ') || '—'
}

export default function CampeonatoPagosPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [comprobantes, setComprobantes] = useState([])
  const [lineas, setLineas] = useState([])
  const [recaudacion, setRecaudacion] = useState(null)
  const [resumen, setResumen] = useState({ aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 })
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [validando, setValidando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pagos`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar pagos')

      setComprobantes(json.comprobantes || [])
      setLineas(json.lineas || [])
      setRecaudacion(json.recaudacion || null)
      setResumen(json.resumen || { aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 })
    } catch (e) {
      setError(e.message)
      setComprobantes([])
      setLineas([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const lineasFiltradas = useMemo(() => {
    if (filtro === 'pagadas') return lineas.filter((l) => ['pagado', 'aprobado'].includes(l.estado))
    if (filtro === 'pendientes') return lineas.filter((l) => l.estado === 'pendiente_pago')
    if (filtro === 'aprobadas') return lineas.filter((l) => l.estado === 'aprobado')
    return lineas
  }, [lineas, filtro])

  async function validarComprobante(c) {
    setValidando(c.id_comprobante)
    setError(null)
    try {
      const res = await fetch('/api/admin/inscripcion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idComprobante: c.id_comprobante,
          montoValidado: c.monto_declarado,
          estado: 'validado',
          idAcademiaCampeonato: c.id_academia_campeonato,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo validar')
      await cargar()
    } catch (e) {
      setError(e.message)
      alert(e.message)
    } finally {
      setValidando(null)
    }
  }

  const comprobantesPendientes = comprobantes.filter((c) => c.estado === 'pendiente')

  return (
    <AdminLayout title="Pagos inscripción" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        {error && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(255,59,48,0.12)', color: '#C0000A', fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ marginTop: 16 }}>Cargando…</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, margin: '16px 0' }}>
              <div className="ios-card" style={{ padding: 12 }}>
                <strong style={{ fontSize: 18, color: 'var(--green, #34C759)' }}>S/ {Number(recaudacion?.recaudado || 0).toFixed(0)}</strong>
                <div className="ios-caption">Recaudado</div>
              </div>
              <div className="ios-card" style={{ padding: 12 }}>
                <strong style={{ fontSize: 18 }}>S/ {Number(recaudacion?.pendiente || 0).toFixed(0)}</strong>
                <div className="ios-caption">Pendiente</div>
              </div>
              <div className="ios-card" style={{ padding: 12 }}>
                <strong style={{ fontSize: 18 }}>S/ {Number(recaudacion?.totalEsperado || 0).toFixed(0)}</strong>
                <div className="ios-caption">Total esperado</div>
              </div>
              <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.aprobadas}</strong><div className="ios-caption">Con dorsal</div></div>
              <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.pagadas}</strong><div className="ios-caption">Pagadas</div></div>
              <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.pendientes}</strong><div className="ios-caption">Pend. pago</div></div>
            </div>

            <h3 style={{ marginBottom: 12 }}>
              Comprobantes pendientes
              {comprobantesPendientes.length > 0 && (
                <span className="badge badge-yellow" style={{ marginLeft: 8, fontSize: 11 }}>{comprobantesPendientes.length}</span>
              )}
            </h3>
            <div className="ios-card" style={{ padding: 16, marginBottom: 24 }}>
              {comprobantesPendientes.map((c) => (
                <div key={c.id_comprobante} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--separator)', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{c.academia_campeonato?.academia?.nombre}</strong>
                    <div style={{ fontSize: 13 }}>S/ {c.monto_declarado} · Op. {c.numero_operacion || '—'}</div>
                  </div>
                  <button
                    type="button"
                    className="ios-btn ios-btn-primary"
                    disabled={validando === c.id_comprobante}
                    onClick={() => validarComprobante(c)}
                  >
                    {validando === c.id_comprobante ? 'Validando…' : 'Validar (dorsal automático)'}
                  </button>
                </div>
              ))}
              {comprobantesPendientes.length === 0 && (
                <p style={{ color: 'var(--label3)' }}>Sin comprobantes pendientes</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { id: 'todas', label: `Todas (${lineas.length})` },
                { id: 'aprobadas', label: `Con dorsal (${resumen.aprobadas})` },
                { id: 'pagadas', label: `Pagadas (${resumen.pagadas})` },
                { id: 'pendientes', label: `Pend. pago (${resumen.pendientes})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={filtro === f.id ? 'ios-btn ios-btn-primary' : 'ios-btn ios-btn-secondary'}
                  style={{ fontSize: 12 }}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ios-card" style={{ padding: 16 }}>
              {lineasFiltradas.map((l) => (
                <div key={l.id_linea} style={{ padding: '10px 0', borderBottom: '1px solid var(--separator)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{nombreLinea(l)}</strong>
                      <div style={{ color: 'var(--label2)', marginTop: 4 }}>
                        {l.academia_campeonato?.academia?.nombre} · {l.modalidad.replace(/_/g, ' ')}
                        {l.categoria?.nombre && ` · ${l.categoria.nombre}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge ${l.estado === 'aprobado' ? 'badge-green' : l.estado === 'pagado' ? 'badge-blue' : 'badge-yellow'}`}>
                        {l.estado === 'aprobado' ? 'Pagado + dorsal' : l.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                      {l.dorsal_display && (
                        <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--red)' }}>{l.dorsal_display}</div>
                      )}
                      <div style={{ marginTop: 4, color: 'var(--label3)' }}>S/ {l.precio_aplicado}</div>
                    </div>
                  </div>
                </div>
              ))}
              {lineasFiltradas.length === 0 && <p style={{ color: 'var(--label3)' }}>Sin líneas en este filtro</p>}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
