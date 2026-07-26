'use client'

import { adminFetch } from '@/lib/admin-client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import { TARIFAS_FDPTKD_DEFAULT, RETENCION_ORGANIZADOR } from '@/lib/campeonato/constants'

export default function TarifasCampeonatoPage() {
  const { id } = useParams()
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${id}/tarifas`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTarifas(json.tarifas || [])
    } catch (e) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  function setPrecio(idx, field, value) {
    setTarifas((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: Number(value) } : t)))
  }

  function aplicarDefaultRetencion() {
    const byMod = new Map(TARIFAS_FDPTKD_DEFAULT.map((t) => [t.modalidad, t]))
    setTarifas((prev) => prev.map((t) => {
      const d = byMod.get(t.modalidad)
      if (!d) return t
      return { ...t, precio_regular: d.precio_regular, precio_tardia: d.precio_tardia }
    }))
  }

  async function guardar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${id}/tarifas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarifas }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMsg(`Guardado (${json.actualizadas} modalidades). Las nuevas inscripciones usarán estos precios.`)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Tarifas" subtitle="Lo que pagan los coaches por modalidad">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 8px 32px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link href={`/admin/campeonatos/${id}`} className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }}>← Volver</Link>
        </div>

        {loading ? (
          <LoadingState mensaje="Cargando tarifas…" />
        ) : (
          <div className="ios-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <p className="ios-caption" style={{ color: 'var(--label3)', margin: 0 }}>
                Default = FDPTKD menos S/ {RETENCION_ORGANIZADOR}. No recalcula líneas ya inscritas.
              </p>
              <button type="button" className="ios-btn ios-btn-secondary" style={{ fontSize: 12 }} onClick={aplicarDefaultRetencion}>
                Aplicar −S/ {RETENCION_ORGANIZADOR}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tarifas.map((t, idx) => (
                <div key={t.modalidad} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
                  <span className="ios-caption" style={{ paddingBottom: 8, fontWeight: 600 }}>{t.label || t.modalidad}</span>
                  <label>
                    <span className="ios-caption" style={{ display: 'block', marginBottom: 4 }}>Regular</span>
                    <input className="ios-input" type="number" min={0} value={t.precio_regular} onChange={(e) => setPrecio(idx, 'precio_regular', e.target.value)} />
                  </label>
                  <label>
                    <span className="ios-caption" style={{ display: 'block', marginBottom: 4 }}>Tardía</span>
                    <input className="ios-input" type="number" min={0} value={t.precio_tardia} onChange={(e) => setPrecio(idx, 'precio_tardia', e.target.value)} />
                  </label>
                </div>
              ))}
            </div>

            {msg && (
              <p className="ios-caption" style={{ marginTop: 14, color: msg.startsWith('Guardado') ? '#166534' : '#C0000A' }}>{msg}</p>
            )}

            <button type="button" className="ios-btn ios-btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={saving} onClick={guardar}>
              {saving ? 'Guardando…' : 'Guardar tarifas'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
