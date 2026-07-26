'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useState, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState, { ErrorState } from '@/components/ui/LoadingState'
import Paginacion from '@/components/ui/Paginacion'
import { useLineasAcademia } from '@/components/campeonatos/useLineasAcademia'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { whatsappUrl } from '@/lib/campeonato/constants'
import {
  descargarFichaNominalExcel,
  descargarFichaNominalPdf,
  fetchExportFichaNominal,
} from '@/lib/campeonato/export-ficha-nominal-client'

const ESTADO_APRO = {
  pendiente: { label: 'Registrada', cls: 'badge-green' },
  aprobada: { label: 'Registrada', cls: 'badge-green' },
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

function nombreLinea(l) {
  return (l.miembros || [])
    .map((m) => [m.perfil?.nombres, m.perfil?.apellidos].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' · ') || l.modalidad
}

/** Detalle expandido: carga las líneas de la academia solo al abrir (lazy). */
function DetalleLineasAcademia({ idCampeonato, acId }) {
  const { lineas, loading, error, recargar, pagina, setPagina, totalPaginas, total } =
    useLineasAcademia(idCampeonato, acId, { activo: true })

  if (loading) return <LoadingState mensaje="Cargando inscripciones…" padding={20} />
  if (error) return <ErrorState mensaje={error} onRetry={recargar} />
  if (!lineas.length) return <span style={{ fontSize: 13, color: 'var(--label3)' }}>Sin inscripciones</span>

  return (
    <>
      {lineas.map((l) => (
        <div key={l.id_linea} style={{ fontSize: 13, padding: '4px 0' }}>
          <strong>{nombreLinea(l)}</strong>
          {' · '}{l.modalidad.replace(/_/g, ' ')}
          {' · '}<span className={`badge ${l.dorsal_display ? 'badge-green' : 'badge-yellow'}`}>{l.dorsal_display ? 'con dorsal' : l.estado}</span>
          {l.dorsal_display && ` · ${l.dorsal_display}`}
          {l.categoria?.nombre && ` · ${l.categoria.nombre}`}
        </div>
      ))}
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} total={total} porPagina={100} />
    </>
  )
}

export default function CampeonatoAcademiasPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [academias, setAcademias] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPags, setTotalPags] = useState(1)
  const [pagina, setPagina] = useState(1)
  const [buscar, setBuscar] = useState('')
  const [buscarDeb, setBuscarDeb] = useState('')
  const [recaudacion, setRecaudacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(null)
  const [expandida, setExpandida] = useState(null)
  const [exportando, setExportando] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscarDeb(buscar.trim())
      setPagina(1)
    }, 400)
    return () => clearTimeout(t)
  }, [buscar])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)

      const params = new URLSearchParams({ page: String(pagina), limit: '30' })
      if (buscarDeb) params.set('q', buscarDeb)
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/academias?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar academias')

      setAcademias(json.academias || [])
      setTotal(json.total || 0)
      setTotalPags(json.totalPaginas || 1)
      setRecaudacion(json.recaudacion || null)
    } catch (e) {
      setError(e.message)
      setAcademias([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato, pagina, buscarDeb])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function rechazar(acId) {
    const motivo = prompt('Motivo del rechazo (opcional):') || 'No cumple requisitos'
    setProcesando(acId)
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/academias`, {
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
  const listado = academias

  async function exportarFicha(formato, idAcademia = null) {
    const key = idAcademia ? `${formato}-${idAcademia}` : formato
    setExportando(key)
    try {
      const data = await fetchExportFichaNominal(idCampeonato)
      if (!data.academias?.length) {
        alert('No hay fichas nominales — academias con inscripciones activas')
        return
      }
      const opts = idAcademia ? { idAcademia } : {}
      if (formato === 'xlsx') await descargarFichaNominalExcel(data, opts)
      else await descargarFichaNominalPdf(data, opts)
    } catch (e) {
      alert(e.message)
    } finally {
      setExportando(null)
    }
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

        <div className="ios-card" style={{ padding: 16, marginBottom: 16 }}>
          <p className="ios-headline" style={{ marginBottom: 8 }}>Ficha nominal</p>
          <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5, marginBottom: 12 }}>
            Exporta por academia todos los competidores (kyorugi, poomsae) y coaches/oficiales aprobados.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ios-btn ios-btn-primary"
              disabled={exportando}
              onClick={() => exportarFicha('xlsx')}
            >
              {exportando === 'xlsx' ? 'Generando export…' : 'Excel todas las academias'}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              disabled={exportando}
              onClick={() => exportarFicha('pdf')}
            >
              {exportando === 'pdf' ? 'Generando export…' : 'PDF todas las academias'}
            </button>
          </div>
        </div>

        <div className="ios-card" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
          <p className="ios-headline" style={{ marginBottom: 8 }}>Portal de inscripción</p>
          <p style={{ fontSize: 13, color: 'var(--label2)', lineHeight: 1.5, maxWidth: 640 }}>
            Las academias se registran solas, inscriben alumnos y obtienen dorsales al enviar su lista.
            Aquí solo revisas inscripciones y rechazas academias si hace falta; los pagos se validan en Pagos.
          </p>
          {slug && (
            <Link href={`/campeonato/${slug}`} className="ios-btn ios-btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }}>
              Ver página pública
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            className="ios-input"
            placeholder="Buscar academia…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            style={{ flex: '1 1 220px', maxWidth: 320 }}
          />
          <span className="ios-caption" style={{ alignSelf: 'center' }}>
            {total} academia(s) registrada(s)
          </span>
        </div>

        {loading ? (
          <LoadingState mensaje="Cargando academias…" />
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
                  const lineasCount = ac.lineas_count || 0
                  return (
                    <Fragment key={ac.id}>
                    <tr style={{ borderBottom: '1px solid var(--separator)' }}>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {ac.academia?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/fotos/competidor?path=${encodeURIComponent(ac.academia.logo_url)}`}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--fill-secondary, #eee)', flexShrink: 0 }} />
                          )}
                          <div>
                            <strong>{ac.academia?.nombre}</strong>
                            <div style={{ fontSize: 12, color: 'var(--label3)' }}>{ac.academia?.codigo_prefijo}</div>
                          </div>
                        </div>
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
                          {lineasCount} ver
                        </button>
                      </td>
                      <td>S/ {Number(ac.monto_total || 0).toFixed(0)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {ac.estado_aprobacion !== 'rechazada' && lineasCount > 0 && (
                          <>
                            <button
                              type="button"
                              className="ios-btn ios-btn-secondary"
                              style={{ fontSize: 11, padding: '4px 8px', marginRight: 4 }}
                              disabled={Boolean(exportando)}
                              onClick={() => exportarFicha('xlsx', ac.id)}
                            >
                              {exportando === `xlsx-${ac.id}` ? '…' : 'Excel'}
                            </button>
                            <button
                              type="button"
                              className="ios-btn ios-btn-secondary"
                              style={{ fontSize: 11, padding: '4px 8px', marginRight: 6 }}
                              disabled={Boolean(exportando)}
                              onClick={() => exportarFicha('pdf', ac.id)}
                            >
                              {exportando === `pdf-${ac.id}` ? '…' : 'PDF'}
                            </button>
                          </>
                        )}
                        {ac.estado_aprobacion !== 'rechazada' && (
                          <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled={procesando === ac.id} onClick={() => rechazar(ac.id)}>
                            Rechazar
                          </button>
                        )}
                        {ac.academia?.telefono && (
                          <a href={whatsappUrl(ac.academia.telefono, `Hola ${ac.academia.nombre}, tu inscripción en ${campeonato?.nombre} fue ${ac.estado_aprobacion}.`)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 12, color: '#25D366' }}>WA</a>
                        )}
                      </td>
                    </tr>
                    {expandida === ac.id && (
                      <tr key={`${ac.id}-det`}>
                        <td colSpan={8} style={{ padding: '12px 16px', background: 'var(--fill)' }}>
                          <DetalleLineasAcademia idCampeonato={idCampeonato} acId={ac.id} />
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
                {buscarDeb
                  ? `Ninguna academia coincide con “${buscarDeb}”.`
                  : 'Ninguna academia inscrita en este campeonato aún. Las academias eligen el evento al registrarse en el portal o en /registro-academia.'}
              </p>
            )}
            <div style={{ padding: '0 12px' }}>
              <Paginacion pagina={pagina} totalPaginas={totalPags} setPagina={setPagina} total={total} porPagina={30} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
