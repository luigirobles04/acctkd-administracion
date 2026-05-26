'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'
import { generarToken, whatsappUrl } from '@/lib/campeonato/constants'

export default function CampeonatoAcademiasPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [academias, setAcademias] = useState([])
  const [loading, setLoading] = useState(true)

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

  async function regenerarLink(acId) {
    const nuevo = generarToken(40)
    const expira = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    const ac = academias.find((a) => a.id === acId)
    await getSupabase()
      .from('academia_campeonato')
      .update({
        token_anterior: ac.token,
        token_anterior_expira: expira,
        token: nuevo,
      })
      .eq('id', acId)
    cargar()
  }

  const slug = campeonato?.slug
  const linkGenerico = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/inscripcion/${slug}` : ''

  return (
    <AdminLayout title="Academias" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} className="ios-caption" style={{ color: 'var(--red)' }}>← Volver al campeonato</Link>

        {slug && (
          <div className="ios-card" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
            <strong>Link genérico inscripción</strong>
            <p style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 8 }}>{linkGenerico}</p>
            <Link href={`/campeonato/${slug}`} className="ios-btn ios-btn-secondary" style={{ marginTop: 8, display: 'inline-flex' }}>
              Ver página pública
            </Link>
          </div>
        )}

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="ios-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--separator)', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Academia</th>
                  <th>Prefijo</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {academias.map((ac) => {
                  const link = `/inscripcion/a/${ac.token}`
                  return (
                    <tr key={ac.id} style={{ borderBottom: '1px solid var(--separator)' }}>
                      <td style={{ padding: 10 }}>{ac.academia?.nombre}</td>
                      <td>{ac.academia?.codigo_prefijo}</td>
                      <td>{ac.estado_lista} / {ac.estado_pago}</td>
                      <td>S/ {Number(ac.monto_total || 0).toFixed(0)}</td>
                      <td>
                        <a href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--red)', fontSize: 12 }}>Portal</a>
                      </td>
                      <td>
                        <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => regenerarLink(ac.id)}>
                          Regenerar
                        </button>
                        {ac.academia?.telefono && (
                          <a
                            href={whatsappUrl(ac.academia.telefono, `Tu link de inscripción ACCTKD: ${typeof window !== 'undefined' ? window.location.origin : ''}${link}`)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginLeft: 8, fontSize: 12, color: '#25D366' }}
                          >
                            WA
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
