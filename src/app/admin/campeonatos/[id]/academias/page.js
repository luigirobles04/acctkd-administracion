'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'
import { whatsappUrl } from '@/lib/campeonato/constants'

const ESTADO_APRO = {
  pendiente: { label: 'Pendiente', cls: 'badge-yellow' },
  aprobada: { label: 'Aprobada', cls: 'badge-green' },
  rechazada: { label: 'Rechazada', cls: 'badge-red' },
}

export default function CampeonatoAcademiasPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [academias, setAcademias] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const { data } = await getSupabase()
        .from('academia_campeonato')
        .select('*, academia:id_academia(*)')
        .eq('id_campeonato', idCampeonato)
        .order('created_at', { ascending: false })
      setAcademias(data || [])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function aprobar(acId) {
    setProcesando(acId)
    await getSupabase()
      .from('academia_campeonato')
      .update({ estado_aprobacion: 'aprobada', motivo_rechazo: null })
      .eq('id', acId)
    await getSupabase().from('bitacora_inscripcion').insert({
      id_academia_campeonato: acId,
      accion: 'academia_aprobada',
      actor: 'admin',
    })
    setProcesando(null)
    cargar()
  }

  async function rechazar(acId) {
    const motivo = prompt('Motivo del rechazo (opcional):') || 'No cumple requisitos'
    setProcesando(acId)
    await getSupabase()
      .from('academia_campeonato')
      .update({ estado_aprobacion: 'rechazada', motivo_rechazo: motivo })
      .eq('id', acId)
    await getSupabase().from('bitacora_inscripcion').insert({
      id_academia_campeonato: acId,
      accion: 'academia_rechazada',
      detalle: { motivo },
      actor: 'admin',
    })
    setProcesando(null)
    cargar()
  }

  const slug = campeonato?.slug
  const pendientes = academias.filter((a) => a.estado_aprobacion === 'pendiente')
  const listado = filtro === 'pendiente' ? pendientes : academias

  return (
    <AdminLayout title="Academias" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} className="ios-caption" style={{ color: 'var(--red)' }}>← Volver al campeonato</Link>

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
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listado.map((ac) => {
                  const est = ESTADO_APRO[ac.estado_aprobacion] || ESTADO_APRO.pendiente
                  return (
                    <tr key={ac.id} style={{ borderBottom: '1px solid var(--separator)' }}>
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
                  )
                })}
              </tbody>
            </table>
            {listado.length === 0 && (
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
