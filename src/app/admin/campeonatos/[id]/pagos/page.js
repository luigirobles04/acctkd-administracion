'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { readJsonResponse } from '@/lib/public-app-url'

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
  const [procesando, setProcesando] = useState(null)
  const [montosEdit, setMontosEdit] = useState({})

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pagos`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar pagos')

      setComprobantes(json.comprobantes || [])
      setLineas(json.lineas || [])
      setRecaudacion(json.recaudacion || null)
      setResumen(json.resumen || { aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 })

      const montos = {}
      for (const c of json.comprobantes || []) {
        if (c.estado === 'pendiente') montos[c.id_comprobante] = String(c.monto_declarado ?? '')
      }
      setMontosEdit(montos)
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
    if (filtro === 'pagadas') return lineas.filter((l) => l.pago_completo)
    if (filtro === 'pendientes') return lineas.filter((l) => !l.pago_completo && Number(l.precio_aplicado) > 0)
    if (filtro === 'aprobadas') return lineas.filter((l) => l.dorsal_display)
    return lineas
  }, [lineas, filtro])

  async function accionPagos(payload) {
    setProcesando(payload.key)
    setError(null)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pagos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No se pudo completar la acción')
      await cargar()
    } catch (e) {
      setError(e.message)
      alert(e.message)
    } finally {
      setProcesando(null)
    }
  }

  function validarComprobante(c) {
    const monto = Number(montosEdit[c.id_comprobante] ?? c.monto_declarado)
    if (!Number.isFinite(monto) || monto <= 0) {
      alert('Ingresa un monto válido')
      return
    }
    accionPagos({
      key: `val-${c.id_comprobante}`,
      accion: 'validar_comprobante',
      idComprobante: c.id_comprobante,
      montoValidado: monto,
      idAcademiaCampeonato: c.id_academia_campeonato,
    })
  }

  function rechazarComprobante(c) {
    const obs = prompt('Motivo del rechazo (opcional):') ?? ''
    accionPagos({
      key: `rej-${c.id_comprobante}`,
      accion: 'rechazar_comprobante',
      idComprobante: c.id_comprobante,
      observaciones: obs,
    })
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
                <div key={c.id_comprobante} style={{ padding: '14px 0', borderBottom: '1px solid var(--separator)', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <strong>{c.academia_campeonato?.academia?.nombre}</strong>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Op. {c.numero_operacion || '—'}</div>
                      {c.archivo_url && (
                        <a href={c.archivo_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--red)', display: 'inline-block', marginTop: 6 }}>
                          Ver voucher →
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, color: 'var(--label2)' }}>Monto S/</label>
                      <input
                        className="ios-input"
                        type="number"
                        step="0.01"
                        style={{ width: 100, padding: '6px 10px' }}
                        value={montosEdit[c.id_comprobante] ?? ''}
                        onChange={(e) => setMontosEdit((m) => ({ ...m, [c.id_comprobante]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 12 }}
                        disabled={procesando === `val-${c.id_comprobante}`}
                        onClick={() => validarComprobante(c)}
                      >
                        {procesando === `val-${c.id_comprobante}` ? 'Validando…' : 'Aprobar pago'}
                      </button>
                      <button
                        type="button"
                        className="ios-btn ios-btn-secondary"
                        style={{ fontSize: 12, color: 'var(--red)' }}
                        disabled={procesando === `rej-${c.id_comprobante}`}
                        onClick={() => rechazarComprobante(c)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
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
              {lineasFiltradas.map((l) => {
                return (
                  <div key={l.id_linea} style={{ padding: '12px 0', borderBottom: '1px solid var(--separator)', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{nombreLinea(l)}</strong>
                        <div style={{ color: 'var(--label2)', marginTop: 4 }}>
                          {l.academia_campeonato?.academia?.nombre} · {l.modalidad.replace(/_/g, ' ')}
                          {l.categoria?.nombre && ` · ${l.categoria.nombre}`}
                        </div>
                      </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {l.dorsal_display ? (
                        <div style={{ fontWeight: 700, color: 'var(--red)' }}>{l.dorsal_display}</div>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: 11 }}>Sin dorsal</span>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge ${l.pago_completo ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                          {l.pago_completo ? 'Pagado' : 'Pend. pago'}
                        </span>
                      </div>
                      <div style={{ marginTop: 4, color: 'var(--label3)', fontSize: 12 }}>
                        S/ {Number(l.monto_pagado || 0).toFixed(0)}/{Number(l.precio_aplicado || 0).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {!l.dorsal_display && (
                      <button
                        type="button"
                        className="ios-btn ios-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        disabled={procesando === `dor-${l.id_linea}`}
                        onClick={() => accionPagos({ key: `dor-${l.id_linea}`, accion: 'asignar_dorsal', idLinea: l.id_linea })}
                      >
                        Asignar dorsal
                      </button>
                    )}
                    {!l.pago_completo && Number(l.precio_aplicado) > 0 && (
                      <button
                        type="button"
                        className="ios-btn ios-btn-primary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        disabled={procesando === `pag-${l.id_linea}`}
                        onClick={() => accionPagos({ key: `pag-${l.id_linea}`, accion: 'marcar_pagada', idLinea: l.id_linea })}
                      >
                        Marcar pagada
                      </button>
                    )}
                  </div>
                  </div>
                )
              })}
              {lineasFiltradas.length === 0 && <p style={{ color: 'var(--label3)' }}>Sin líneas en este filtro</p>}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
