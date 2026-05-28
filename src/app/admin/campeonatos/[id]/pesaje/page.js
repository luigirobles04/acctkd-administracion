'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { getSupabase } from '@/lib/supabase'

function nombreCompetidor(l) {
  const m = l.miembros?.[0]?.perfil
  if (!m) return 'Sin nombre'
  return `${m.nombres || ''} ${m.apellidos || ''}`.trim()
}

export default function CampeonatoPesajePage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [lineas, setLineas] = useState([])
  const [form, setForm] = useState({ id_linea: '', peso: '' })

  const cargar = useCallback(async () => {
    const camp = await obtenerCampeonato(idCampeonato)
    setCampeonato(camp)
    const { data } = await getSupabase()
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(nombre),
        academia_campeonato(academia:academia(nombre)),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos, documento_numero))
      `)
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi_individual')
      .eq('estado', 'aprobado')
      .order('dorsal_numero', { ascending: true })
    setLineas(data || [])
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function registrarPesaje(e) {
    e.preventDefault()
    const peso = Number(form.peso)
    const idLinea = Number(form.id_linea)
    if (!idLinea || !peso) return

    const { error } = await getSupabase()
      .from('linea_inscripcion')
      .update({ peso_declarado: peso, updated_at: new Date().toISOString() })
      .eq('id_linea', idLinea)

    if (error) {
      alert(error.message)
      return
    }

    alert('Peso registrado')
    setForm({ id_linea: '', peso: '' })
    cargar()
  }

  return (
    <AdminLayout title="Pesaje" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        <form className="ios-card" style={{ padding: 20, marginTop: 16 }} onSubmit={registrarPesaje}>
          <h3 style={{ marginBottom: 16 }}>Registrar peso oficial</h3>
          <label className="ios-label">Competidor kyorugi (con dorsal)</label>
          <select
            className="ios-input"
            value={form.id_linea}
            onChange={(e) => setForm({ ...form, id_linea: e.target.value })}
            required
          >
            <option value="">Seleccionar…</option>
            {lineas.map((l) => (
              <option key={l.id_linea} value={l.id_linea}>
                {l.dorsal_display || '—'} — {nombreCompetidor(l)} — {l.categoria?.nombre || 'Sin cat.'}
              </option>
            ))}
          </select>
          <label className="ios-label" style={{ marginTop: 12 }}>Peso oficial (kg)</label>
          <input
            className="ios-input"
            type="number"
            step="0.1"
            value={form.peso}
            onChange={(e) => setForm({ ...form, peso: e.target.value })}
            required
          />
          <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }}>
            Guardar peso
          </button>
        </form>

        <div className="ios-card" style={{ padding: 16, marginTop: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Lista de pesaje ({lineas.length})</h4>
          {lineas.map((l) => (
            <div key={l.id_linea} style={{ padding: '10px 0', borderBottom: '1px solid var(--separator)', fontSize: 14 }}>
              <strong>{l.dorsal_display}</strong> — {nombreCompetidor(l)}
              <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 4 }}>
                {l.academia_campeonato?.academia?.nombre} · {l.categoria?.nombre}
                {l.peso_declarado != null && ` · ${l.peso_declarado} kg`}
              </div>
            </div>
          ))}
          {lineas.length === 0 && (
            <p style={{ color: 'var(--label3)' }}>No hay competidores kyorugi con dorsal aprobado aún.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
