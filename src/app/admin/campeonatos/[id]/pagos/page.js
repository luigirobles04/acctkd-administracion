'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState, { ErrorState } from '@/components/ui/LoadingState'
import Paginacion from '@/components/ui/Paginacion'
import AcademiaExpansible from '@/components/campeonatos/AcademiaExpansible'
import FiltroLineasAcademia from '@/components/campeonatos/FiltroLineasAcademia'
import { useLineasAcademia } from '@/components/campeonatos/useLineasAcademia'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { filtrarLineasGrupo, modalidadesEnLineas, nombreParticipanteLinea } from '@/lib/campeonato/agrupar-academias'
import { readJsonResponse } from '@/lib/public-app-url'

function pasaFiltroGlobal(l, filtro) {
  if (filtro === 'pagadas') return l.pago_completo
  if (filtro === 'pendientes') return !l.pago_completo && Number(l.precio_aplicado) > 0
  if (filtro === 'aprobadas') return Boolean(l.dorsal_display)
  return true
}

/** Detalle expandido de pagos por academia: líneas lazy con montos pagados. */
function DetallePagosAcademia({ idCampeonato, acId, filtroGlobal, procesando, onMarcarPagada, reloadKey }) {
  const [filtro, setFiltro] = useState({ buscar: '', modalidad: 'todas' })
  const { lineas, loading, error, recargar, pagina, setPagina, totalPaginas, total } =
    useLineasAcademia(idCampeonato, acId, { activo: true, conPagos: true, reloadKey })

  if (loading) return <LoadingState mensaje="Cargando inscripciones…" padding={20} />
  if (error) return <ErrorState mensaje={error} onRetry={recargar} />

  const lineasGlobal = lineas.filter((l) => pasaFiltroGlobal(l, filtroGlobal))
  const lineasFiltradas = filtrarLineasGrupo(lineasGlobal, filtro)

  return (
    <>
      <FiltroLineasAcademia
        filtro={filtro}
        onChange={setFiltro}
        total={lineasGlobal.length}
        filtradas={lineasFiltradas.length}
        modalidades={modalidadesEnLineas(lineas)}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--separator)', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px' }}>Dorsal</th>
              <th style={{ padding: '8px 6px' }}>Competidor</th>
              <th style={{ padding: '8px 6px' }}>Modalidad</th>
              <th style={{ padding: '8px 6px' }}>Pago</th>
              <th style={{ padding: '8px 6px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lineasFiltradas.map((l) => (
              <tr key={l.id_linea} style={{ borderBottom: '1px solid var(--separator)' }}>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--red)' }}>{l.dorsal_display || '—'}</td>
                <td style={{ padding: '8px 6px' }}>{nombreParticipanteLinea(l)}</td>
                <td style={{ padding: '8px 6px' }}>{l.modalidad?.replace(/_/g, ' ')}{l.categoria?.nombre ? ` · ${l.categoria.nombre}` : ''}</td>
                <td style={{ padding: '8px 6px' }}>
                  <span className={`badge ${l.pago_completo ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: 10 }}>
                    S/ {Number(l.monto_pagado || 0).toFixed(0)}/{Number(l.precio_aplicado || 0).toFixed(0)}
                  </span>
                </td>
                <td style={{ padding: '8px 6px' }}>
                  {!l.pago_completo && Number(l.precio_aplicado) > 0 && (
                    <button type="button" className="ios-btn ios-btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} disabled={procesando === `pag-${l.id_linea}`} onClick={() => onMarcarPagada(l.id_linea)}>
                      Marcar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lineasFiltradas.length === 0 && (
          <p style={{ padding: 16, textAlign: 'center', color: 'var(--label3)', fontSize: 13 }}>Sin resultados con ese filtro</p>
        )}
        <Paginacion pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} total={total} porPagina={100} />
      </div>
    </>
  )
}

export default function CampeonatoPagosPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [comprobantes, setComprobantes] = useState([])
  const [academias, setAcademias] = useState([])
  const [recaudacion, setRecaudacion] = useState(null)
  const [resumen, setResumen] = useState({ total: 0, aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 })
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(null)
  const [montosEdit, setMontosEdit] = useState({})
  const [expandidas, setExpandidas] = useState({})
  const [reloadKey, setReloadKey] = useState(0)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/pagos`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar pagos')

      setComprobantes(json.comprobantes || [])
      setAcademias(json.academias || [])
      setRecaudacion(json.recaudacion || null)
      setResumen(json.resumen || { total: 0, aprobadas: 0, pagadas: 0, pendientes: 0, comprobantesPendientes: 0 })

      const montos = {}
      for (const c of json.comprobantes || []) {
        if (c.estado === 'pendiente') montos[c.id_comprobante] = String(c.monto_declarado ?? '')
      }
      setMontosEdit(montos)
    } catch (e) {
      setError(e.message)
      setComprobantes([])
      setAcademias([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const grupos = useMemo(() => {
    if (filtro === 'pagadas') return academias.filter((g) => g.pagadas > 0)
    if (filtro === 'pendientes') return academias.filter((g) => g.pendientesPago > 0)
    if (filtro === 'aprobadas') return academias.filter((g) => g.conDorsal > 0)
    return academias
  }, [academias, filtro])

  async function accionPagos(payload) {
    setProcesando(payload.key)
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/pagos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'No se pudo completar la acción')
      await cargar()
      setReloadKey((k) => k + 1)
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

  function pagoTotalAcademia(idAcademia, nombre) {
    const ac = academias.find((a) => a.id === idAcademia)
    const pend = ac?.pendiente ?? 0
    if (pend <= 0) {
      alert('Esta academia ya está pagada en su totalidad')
      return
    }
    if (!confirm(`¿Marcar pago total de ${nombre}?\nMonto: S/ ${pend.toFixed(2)}`)) return
    accionPagos({ key: `total-${idAcademia}`, accion: 'pago_total', idAcademiaCampeonato: idAcademia })
  }

  const comprobantesPendientes = comprobantes.filter((c) => c.estado === 'pendiente')

  return (
    <AdminLayout title="Pagos inscripción" subtitle={campeonato?.nombre}>
      <div className="camp-page">
        <Link href={`/admin/campeonatos/${id}`} className="camp-back">
          <span className="material-symbols-rounded">arrow_back</span>
          Campeonato
        </Link>

        {error && (
          <div className="camp-alert camp-alert--error">{error}</div>
        )}

        {loading ? (
          <LoadingState mensaje="Cargando pagos…" />
        ) : (
          <>
            <div className="camp-stats-grid">
              {[
                { label: 'Recaudado', val: `S/ ${Number(recaudacion?.recaudado || 0).toFixed(0)}`, icon: 'payments', color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
                { label: 'Pendiente', val: `S/ ${Number(recaudacion?.pendiente || 0).toFixed(0)}`, icon: 'pending', color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
                { label: 'Total esperado', val: `S/ ${Number(recaudacion?.totalEsperado || 0).toFixed(0)}`, icon: 'account_balance', color: '#5856D6', bg: 'rgba(88,86,214,0.12)' },
                { label: 'Academias', val: grupos.length, icon: 'school', color: '#007AFF', bg: 'rgba(0,122,255,0.12)' },
                { label: 'Líneas pagadas', val: resumen.pagadas, icon: 'check_circle', color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
                { label: 'Pend. pago', val: resumen.pendientes, icon: 'hourglass_empty', color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
              ].map((k) => (
                <div key={k.label} className="camp-stat-card">
                  <div className="camp-stat-icon" style={{ background: k.bg }}>
                    <span className="material-symbols-rounded" style={{ color: k.color, fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
                  </div>
                  <div>
                    <p className="camp-stat-value">{k.val}</p>
                    <p className="camp-stat-label">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="camp-section">
              <h3 className="camp-section-title">
                Comprobantes pendientes
                {comprobantesPendientes.length > 0 && (
                  <span className="badge badge-yellow">{comprobantesPendientes.length}</span>
                )}
              </h3>
              <div className="ios-card camp-card">
                {comprobantesPendientes.map((c) => (
                  <div key={c.id_comprobante} className="camp-comprobante-row">
                    <div className="camp-comprobante-info">
                      <strong>{c.academia_campeonato?.academia?.nombre}</strong>
                      <div className="camp-comprobante-meta">Op. {c.numero_operacion || '—'}</div>
                      {(c.archivo_proxy_url || c.archivo_url) && (
                        <a
                          href={c.archivo_proxy_url || c.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="camp-voucher-link"
                        >
                          <span className="material-symbols-rounded">receipt_long</span>
                          Ver voucher
                        </a>
                      )}
                    </div>
                    <div className="camp-comprobante-actions">
                      <input
                        className="ios-input camp-monto-input"
                        type="number"
                        step="0.01"
                        value={montosEdit[c.id_comprobante] ?? ''}
                        onChange={(e) => setMontosEdit((m) => ({ ...m, [c.id_comprobante]: e.target.value }))}
                      />
                      <button type="button" className="ios-btn ios-btn-primary camp-btn-sm" disabled={procesando === `val-${c.id_comprobante}`} onClick={() => validarComprobante(c)}>
                        {procesando === `val-${c.id_comprobante}` ? '…' : 'Aprobar'}
                      </button>
                      <button type="button" className="ios-btn ios-btn-secondary camp-btn-sm camp-btn-danger" disabled={procesando === `rej-${c.id_comprobante}`} onClick={() => accionPagos({ key: `rej-${c.id_comprobante}`, accion: 'rechazar_comprobante', idComprobante: c.id_comprobante, observaciones: prompt('Motivo:') || '' })}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
                {comprobantesPendientes.length === 0 && <p className="camp-empty">Sin comprobantes pendientes</p>}
              </div>
            </section>

            <div className="camp-filters">
              {[
                { id: 'todas', label: `Todas (${resumen.total})` },
                { id: 'aprobadas', label: `Con dorsal (${resumen.aprobadas})` },
                { id: 'pagadas', label: `Pagadas (${resumen.pagadas})` },
                { id: 'pendientes', label: `Pend. pago (${resumen.pendientes})` },
              ].map((f) => (
                <button key={f.id} type="button" className={`ios-chip ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>

            <section className="camp-section">
              <h3 className="camp-section-title">Por academia</h3>
            {grupos.map((g) => (
              <AcademiaExpansible
                key={g.id}
                nombre={g.nombre}
                resumen={`${g.totalLineas} inscripciones · ${g.conDorsal} dorsales · ${g.pagadas} pagadas · S/ ${Number(g.monto_asignado || 0).toFixed(0)}/${Number(g.monto_total || 0).toFixed(0)}`}
                expandido={Boolean(expandidas[g.id])}
                onToggle={() => setExpandidas((e) => ({ ...e, [g.id]: !e[g.id] }))}
                acciones={
                  g.pendiente > 0 ? (
                    <button
                      type="button"
                      className="ios-btn ios-btn-primary"
                      style={{ fontSize: 12 }}
                      disabled={procesando === `total-${g.id}`}
                      onClick={() => pagoTotalAcademia(g.id, g.nombre)}
                    >
                      {procesando === `total-${g.id}` ? '…' : `Pago total S/ ${g.pendiente.toFixed(0)}`}
                    </button>
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>Pagada</span>
                  )
                }
              >
                <DetallePagosAcademia
                  idCampeonato={idCampeonato}
                  acId={g.id}
                  filtroGlobal={filtro}
                  procesando={procesando}
                  reloadKey={reloadKey}
                  onMarcarPagada={(idLinea) => accionPagos({ key: `pag-${idLinea}`, accion: 'marcar_pagada', idLinea })}
                />
              </AcademiaExpansible>
            ))}
            {grupos.length === 0 && <p className="camp-empty">Sin líneas en este filtro</p>}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
