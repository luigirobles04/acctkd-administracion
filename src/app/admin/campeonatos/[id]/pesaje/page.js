'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'
import { encolarOffline, listarColaOffline, eliminarDeCola, registerServiceWorker } from '@/lib/offline/queue'

export default function CampeonatoPesajePage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [lineas, setLineas] = useState([])
  const [form, setForm] = useState({ id_linea: '', peso: '', intento: '1' })
  const [cola, setCola] = useState([])

  const cargar = useCallback(async () => {
    const camp = await obtenerCampeonato(idCampeonato)
    setCampeonato(camp)
    const { data } = await getSupabase()
      .from('linea_inscripcion')
      .select('*, miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi_individual')
      .eq('estado', 'aprobado')
    setLineas(data || [])
    if (typeof window !== 'undefined') {
      setCola(await listarColaOffline())
    }
  }, [idCampeonato])

  useEffect(() => {
    registerServiceWorker()
    cargar()
  }, [cargar])

  async function registrarPesaje(e) {
    e.preventDefault()
    const payload = {
      id_campeonato: idCampeonato,
      id_linea: Number(form.id_linea),
      peso: Number(form.peso),
      intento: Number(form.intento),
    }

    if (!navigator.onLine) {
      await encolarOffline('pesaje', payload)
      alert('Pesaje guardado offline')
      setCola(await listarColaOffline())
      return
    }

    const linea = lineas.find((l) => l.id_linea === Number(form.id_linea))
    const idCompetidor = linea?.id_competidor_legacy
    if (idCompetidor) {
      await getSupabase().from('pesaje_campeonato').insert({
        id_competidor: idCompetidor,
        peso_oficial: payload.peso,
        observaciones: `Intento ${payload.intento}`,
        resultado: 'ok',
      })
    }

    await getSupabase().from('cola_offline').insert({
      id_campeonato: idCampeonato,
      tipo: 'pesaje',
      payload,
      estado: 'procesado',
    })

    alert('Pesaje registrado')
    setForm({ id_linea: '', peso: '', intento: '1' })
  }

  return (
    <AdminLayout title="Pesaje" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <form className="ios-card" style={{ padding: 20, marginTop: 16 }} onSubmit={registrarPesaje}>
          <h3 style={{ marginBottom: 16 }}>Registrar peso (offline OK)</h3>
          <label className="ios-label">Competidor aprobado kyorugi</label>
          <select className="ios-input" value={form.id_linea} onChange={(e) => setForm({ ...form, id_linea: e.target.value })} required>
            <option value="">Seleccionar…</option>
            {lineas.map((l) => (
              <option key={l.id_linea} value={l.id_linea}>
                {l.dorsal_display || l.id_linea} — {l.miembros?.[0]?.perfil?.nombres} {l.miembros?.[0]?.perfil?.apellidos}
              </option>
            ))}
          </select>
          <label className="ios-label" style={{ marginTop: 12 }}>Peso (kg, 1 decimal)</label>
          <input className="ios-input" type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} required />
          <label className="ios-label" style={{ marginTop: 12 }}>Intento</label>
          <select className="ios-input" value={form.intento} onChange={(e) => setForm({ ...form, intento: e.target.value })}>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
          <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>Registrar</button>
        </form>

        {cola.length > 0 && (
          <div className="ios-card" style={{ padding: 16, marginTop: 16 }}>
            <strong>Cola offline ({cola.length})</strong>
            {cola.map((item) => (
              <div key={item.id} style={{ fontSize: 13, padding: '8px 0' }}>
                {item.tipo} · {item.createdAt}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
