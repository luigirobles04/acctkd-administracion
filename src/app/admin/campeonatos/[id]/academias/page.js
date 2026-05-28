'use client'

import { useCallback, useEffect, useState, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { whatsappUrl } from '@/lib/campeonato/constants'

const ESTADO_APRO = {
  pendiente: { label: 'Pendiente', cls: 'badge-yellow' },
  aprobada: { label: 'Aprobada', cls: 'badge-green' },
  rechazada: { label: 'Rechazada', cls: 'badge-red' },
}

function RecaudacionCards({ recaudacion }) {
  if (!recaudacion) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
      <div className="ios-card" style={{ padding: 14 }}>
        <strong style={{ fontSize: 20 }}>S/ {Number(recaudacion.recaudado || 0).toFixed(0)}</strong>
        <div className="ios-caption">Recaudado</div>
      </div>
      <div className="ios-card" style={{ padding: 14 }}>
        <strong style={{ fontSize: 20 }}>S/ {Number(recaudacion.pendiente || 0).toFixed(0)}</strong>
        <div className="ios-caption">Pendiente</div>
      </div>
      <div className="ios-card" style={{ padding: 14 }}>
        <strong style={{ fontSize: 20 }}>S/ {Number(recaudacion.totalEsperado || 0).toFixed(0)}</strong>
        <div className="ios-caption">Total esperado</div>
      </div>
    </div>
  )
}

export default function CampeonatoAcademiasPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [academias, setAcademias] = useState([])
  const [lineas, setLineas] = useState([])
  const [recaudacion, setRecaudacion] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(null)
  const [expandida, setExpandida] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/academias`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar academias')

      setAcademias(json.academias || [])
      setLineas(json.lineas || [])
      setRecaudacion(json.recaudacion || null)
    } catch (e) {
      setError(e.message)
      setAcademias([])
      setLineas([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function aprobar(acId) {
    setProcesando(acId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/academias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acId, accion: 'aprobar' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(null)
    }
  }

  async function rechazar(acId) {
    const motivo = prompt('Motivo del rechazo (opcional):') || 'No cumple requisitos'
    setProcesando(acId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/academias`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acId, accion: 'rechazar', motivo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(null)
    }
  }

  const slug = campeonato?.slug
  const pendientes = academias.filter((a) => a.estado_aprobacion === 'pendiente')
  const listado = filtro === 'pendiente' ? pendientes : academias

  function lineasAcademia(acId) {
    return lineas.filter((l) => l.id_academia_campeonato === acId)
  }

  function nombreLinea(l) {
    return (l.miembros || [])
      .map((m) => [m.perfil?.nombres, m.perfil?.apellidos].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(' · ') || l.modalidad
  }

  return (
    <AdminLayout title="Academias" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} className="ios-caption" style={{ color: 'var(--red)' }}>← Volver al campeonato</Link>

        {error && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(255,59,48,0.12)', color: '#C0000A', fontSize: 14 }}>
            {error}
          </div>
        )}

        <RecaudacionCards recaudacion={recaudacion} />

        <div className="ios-card" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
          <p className="ios-headline" style={{ marginBottom: 8 }}>Portal de inscripción</p>
          <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5, maxWidth: 640 }}>
            Las academias se registran con DNI y contraseña. Aprueba aquí para habilitar el envío de lista y los pagos.
          </p>
          {slug && (
            <Link href={`/campeonato/${slug}`} className="ios-btn ios-btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }}>
              Ver página pública
            </Link>
          )}
        </div>

        {pendientes.length > 0 && (
          <div className="badge badge-yellow" style={{ marginBottom: 12, display: 'inline-block' }}>
            {pendientes.length} academia(s) pendiente(s) de aprobación
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" className={filtro === 'todas' ? 'ios-btn ios-btn-primary' : 'ios-btn ios-btn-secondary'} onClick={() => setFiltro('todas')}>
            Todas ({academias.length})
          </button>
          <button type="button" className={filtro === 'pendiente' ? 'ios-btn ios-btn-primary' : 'ios-btn ios-btn-secondary'} onClick={() => setFiltro('pendiente')}>
            Pendientes ({pendientes.length})
          </button>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="ios-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--separator)', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Academia</th>
                  <th>Representante</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Lista / Pago</th>
                  <th>Líneas</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listado.map((ac) => {
                  const est = ESTADO_APRO[ac.estado_aprobacion] || ESTADO_APRO.pendiente
                  const lineasAc = lineasAcademia(ac.id)
                  return (
                    <Fragment key={ac.id}>
                    <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                      <td style={{ padding: 10 }}>
                        <strong>{ac.academia?.nombre}</strong>
                        <div style={{ fontSize: 12, color: 'var(--label3)' }}>{ac.academia?.codigo_prefijo}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {ac.academia?.representante_nombre || '—'}
                        <div style={{ color: 'var(--label3)' }}>DNI {ac.academia?.representante_dni || '—'}</div>
                      </td>
                      <td>{ac.academia?.ciudad || '—'}</td>
                      <td><span className={`badge ${est.cls}`}>{est.label}</span></td>
                      <td style={{ fontSize: 12 }}>{ac.estado_lista} / {ac.estado_pago}</td>
                      <td>
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setExpandida(expandida === ac.id ? null : ac.id)}>
                          {lineasAc.length} ver
                        </button>
                      </td>
                      <td>S/ {Number(ac.monto_total || 0).toFixed(0)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {ac.estado_aprobacion === 'pendiente' && (
                          <>
                            <button type="button" className="ios-btn ios-btn-primary" style={{ fontSize: 12, padding: '4px 10px', marginRight: 6 }} disabled={procesando === ac.id} onClick={() => aprobar(ac.id)}>
                              Aprobar
                            </button>
                            <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled={procesando === ac.id} onClick={() => rechazar(ac.id)}>
                              Rechazar
                            </button>
                          </>
                        )}
                        {ac.academia?.telefono && (
                          <a href={whatsappUrl(ac.academia.telefono, `Hola ${ac.academia.nombre}, tu inscripción en ${campeonato?.nombre} fue ${ac.estado_aprobacion}.`)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 12, color: '#25D366' }}>WA</a>
                        )}
                      </td>
                    </tr>
                    {expandida === ac.id && (
                      <tr key={`${ac.id}-det`}>
                        <td colSpan={8} style={{ padding: '12px 16px', background: 'var(--fill)' }}>
                          {lineasAc.length === 0 ? (
                            <span style={{ fontSize: 13, color: 'var(--label3)' }}>Sin inscripciones</span>
                          ) : (
                            lineasAc.map((l) => (
                              <div key={l.id_linea} style={{ fontSize: 13, padding: '4px 0' }}>
                                <strong>{nombreLinea(l)}</strong>
                                {' · '}{l.modalidad.replace(/_/g, ' ')}
                                {' · '}<span className={`badge ${l.estado === 'aprobado' ? 'badge-green' : 'badge-yellow'}`}>{l.estado}</span>
                                {l.dorsal_display && ` · ${l.dorsal_display}`}
                                {l.categoria?.nombre && ` · ${l.categoria.nombre}`}
                              </div>
                            ))
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {listado.length === 0 && !error && (
              <p style={{ padding: 20, color: 'var(--label3)', lineHeight: 1.5 }}>
                {filtro === 'pendiente'
                  ? 'No hay academias pendientes de aprobación en este campeonato.'
                  : 'Ninguna academia inscrita en este campeonato aún. Las academias eligen el evento al registrarse en el portal o en /registro-academia.'}
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
