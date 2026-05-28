'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'

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
  const [filtro, setFiltro] = useState('todas')

  const cargar = useCallback(async () => {
    const camp = await obtenerCampeonato(idCampeonato)
    setCampeonato(camp)
    const sb = getSupabase()
    const { data: acs } = await sb.from('academia_campeonato').select('id').eq('id_campeonato', idCampeonato)
    const ids = (acs || []).map((a) => a.id)
    if (!ids.length) return

    const { data: comps } = await sb
      .from('comprobante_pago')
      .select('*, academia_campeonato(id, academia:academia(nombre))')
      .in('id_academia_campeonato', ids)
      .order('created_at', { ascending: false })
    setComprobantes(comps || [])

    const { data: lins } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(nombre),
        academia_campeonato(academia:academia(nombre, codigo_prefijo)),
        miembros:linea_inscripcion_miembro(id_perfil, perfil:competidor_perfil(nombres, apellidos, documento_numero))
      `)
      .eq('id_campeonato', idCampeonato)
      .neq('estado', 'anulado')
      .order('created_at', { ascending: true })
    setLineas(lins || [])
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

  const resumen = useMemo(() => ({
    pagadas: lineas.filter((l) => ['pagado', 'aprobado'].includes(l.estado)).length,
    pendientes: lineas.filter((l) => l.estado === 'pendiente_pago').length,
    aprobadas: lineas.filter((l) => l.estado === 'aprobado').length,
  }), [lineas])

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

  return (
    <AdminLayout title="Pagos inscripción" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, margin: '16px 0' }}>
          <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.aprobadas}</strong><div className="ios-caption">Con dorsal</div></div>
          <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.pagadas}</strong><div className="ios-caption">Pagadas</div></div>
          <div className="ios-card" style={{ padding: 12 }}><strong>{resumen.pendientes}</strong><div className="ios-caption">Pend. pago</div></div>
        </div>

        <h3 style={{ marginBottom: 12 }}>Comprobantes pendientes</h3>
        <div className="ios-card" style={{ padding: 16, marginBottom: 24 }}>
          {comprobantes.filter((c) => c.estado === 'pendiente').map((c) => (
            <div key={c.id_comprobante} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--separator)', gap: 12 }}>
              <div>
                <strong>{c.academia_campeonato?.academia?.nombre}</strong>
                <div style={{ fontSize: 13 }}>S/ {c.monto_declarado} · Op. {c.numero_operacion || '—'}</div>
              </div>
              <button type="button" className="ios-btn ios-btn-primary" onClick={() => validarComprobante(c)}>
                Validar (dorsal automático)
              </button>
            </div>
          ))}
          {!comprobantes.some((c) => c.estado === 'pendiente') && (
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
      </div>
    </AdminLayout>
  )
}
