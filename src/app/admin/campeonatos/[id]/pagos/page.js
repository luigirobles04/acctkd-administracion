'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'

export default function CampeonatoPagosPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [comprobantes, setComprobantes] = useState([])
  const [lineas, setLineas] = useState([])

  const cargar = useCallback(async () => {
    const camp = await obtenerCampeonato(idCampeonato)
    setCampeonato(camp)
    const sb = getSupabase()
    const { data: acs } = await sb.from('academia_campeonato').select('id').eq('id_campeonato', idCampeonato)
    const ids = (acs || []).map((a) => a.id)
    if (ids.length) {
      const { data: comps } = await sb
        .from('comprobante_pago')
        .select('*, academia_campeonato(id, academia:academia(nombre))')
        .in('id_academia_campeonato', ids)
        .order('created_at', { ascending: false })
      setComprobantes(comps || [])
      const { data: lins } = await sb
        .from('linea_inscripcion')
        .select('*, academia_campeonato(academia:academia(nombre))')
        .eq('id_campeonato', idCampeonato)
        .neq('estado', 'anulado')
      setLineas(lins || [])
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function validarComprobante(c) {
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
    if (!res.ok) alert(json.error)
    else cargar()
  }

  async function aprobarLinea(idLinea) {
    const res = await fetch('/api/admin/inscripcion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLinea }),
    })
    const json = await res.json()
    if (!res.ok) alert(json.error)
    else cargar()
  }

  return (
    <AdminLayout title="Pagos inscripción" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <h3 style={{ marginTop: 20, marginBottom: 12 }}>Comprobantes pendientes</h3>
        <div className="ios-card" style={{ padding: 16, marginBottom: 24 }}>
          {comprobantes.filter((c) => c.estado === 'pendiente').map((c) => (
            <div key={c.id_comprobante} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--separator)' }}>
              <div>
                <strong>{c.academia_campeonato?.academia?.nombre}</strong>
                <div style={{ fontSize: 13 }}>S/ {c.monto_declarado} · Op. {c.numero_operacion || '—'}</div>
              </div>
              <button type="button" className="ios-btn ios-btn-primary" onClick={() => validarComprobante(c)}>Validar + FIFO</button>
            </div>
          ))}
          {!comprobantes.some((c) => c.estado === 'pendiente') && <p style={{ color: 'var(--label3)' }}>Sin pendientes</p>}
        </div>

        <h3 style={{ marginBottom: 12 }}>Líneas pagadas (aprobar dorsal)</h3>
        <div className="ios-card" style={{ padding: 16 }}>
          {lineas.filter((l) => l.estado === 'pagado').map((l) => (
            <div key={l.id_linea} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--separator)', fontSize: 14 }}>
              <span>{l.academia_campeonato?.academia?.nombre} · {l.modalidad}</span>
              <button type="button" className="ios-btn ios-btn-secondary" onClick={() => aprobarLinea(l.id_linea)}>Aprobar</button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
