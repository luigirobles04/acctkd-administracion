'use client'

import { adminFetch } from '@/lib/admin-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import IconAction from '@/components/ui/IconAction'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import { readJsonResponse } from '@/lib/public-app-url'
import { whatsappUrl } from '@/lib/campeonato/constants'
import {
  credencialTemplateSrc,
  FESTCUP_2026_CREDENCIAL_LAYOUT,
  FESTCUP_2026_TEMPLATE_ENTRENADOR,
} from '@/lib/campeonato/credencial-layout'
import { useFestcupAdmin } from '@/lib/use-festcup-admin'
import '@/components/campeonatos/credenciales.css'

const FUNCIONES = [
  'Árbitro Kyorugi',
  'Árbitro Poomsae',
  'Juez',
  'Mesa de control',
  'Referente técnico',
  'Staff',
]

const FORM_VACIO = {
  nombres: '',
  apellidos: '',
  documento: '',
  telefono: '',
  email: '',
  funcion: 'Árbitro Kyorugi',
  pais: 'Perú',
  codigo: '',
}

export default function CampeonatoArbitrosPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const festcupMode = useFestcupAdmin()
  const [campeonato, setCampeonato] = useState(null)
  const [arbitros, setArbitros] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [buscar, setBuscar] = useState('')
  const [tab, setTab] = useState('planilla')

  const templateUrl = useMemo(() => {
    const coach = campeonato?.template_coach_url
    if (coach?.includes('festcup-2026')) return FESTCUP_2026_TEMPLATE_ENTRENADOR
    return credencialTemplateSrc(coach) || FESTCUP_2026_TEMPLATE_ENTRENADOR
  }, [campeonato])

  const layout = campeonato?.credencial_layout || FESTCUP_2026_CREDENCIAL_LAYOUT

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/arbitros`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setArbitros(json.arbitros || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!q) return arbitros
    return arbitros.filter((a) =>
      [a.nombre_completo, a.funcion, a.documento, a.codigo, a.telefono].join(' ').toLowerCase().includes(q),
    )
  }, [arbitros, buscar])

  async function registrar(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/arbitros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setForm(FORM_VACIO)
      await cargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(a) {
    if (!confirm(`¿Quitar a ${a.nombre_completo} de la planilla?`)) return
    const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/arbitros/${a.id_arbitro}`, { method: 'DELETE' })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      alert(json.error)
      return
    }
    await cargar()
  }

  function exportarCsv() {
    const rows = [['Código', 'Nombres', 'Apellidos', 'DNI', 'Función', 'Teléfono', 'Email', 'País']]
    for (const a of arbitros) {
      rows.push([a.codigo || '', a.nombres, a.apellidos, a.documento || '', a.funcion, a.telefono || '', a.email || '', a.pais || ''])
    }
    const csv = rows.map((r) => r.map((c) => `"${`${c}`.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arbitros-campeonato-${idCampeonato}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const backHref = festcupMode ? '/admin/festcup' : `/admin/campeonatos/${id}`

  return (
    <AdminLayout title="Árbitros" subtitle={campeonato?.nombre}>
      <div className="camp-page">
        <Link href={backHref} className="camp-back">
          <span className="material-symbols-rounded">arrow_back</span>
          {festcupMode ? 'Centro de control' : 'Campeonato'}
        </Link>

        <div className="festcup-segment no-print" style={{ marginBottom: 20, maxWidth: 420 }}>
          <button type="button" className={`festcup-segment-item ${tab === 'planilla' ? 'active' : ''}`} onClick={() => setTab('planilla')}>
            Planilla
          </button>
          <button type="button" className={`festcup-segment-item ${tab === 'credenciales' ? 'active' : ''}`} onClick={() => setTab('credenciales')}>
            Credenciales
          </button>
        </div>

        {loading ? (
          <LoadingState mensaje="Cargando planilla…" />
        ) : tab === 'planilla' ? (
          <>
            <div className="ios-card no-print" style={{ padding: 16, marginBottom: 16, fontSize: 13, color: 'var(--label2)', lineHeight: 1.45 }}>
              Registra jurado y staff del evento. Las credenciales usan la plantilla de entrenador/staff; la función (Kyorugi, Poomsae, etc.) se imprime bajo el nombre.
            </div>

            <form className="ios-card no-print" onSubmit={registrar} style={{ padding: 16, marginBottom: 20 }}>
              <p className="app-section-title" style={{ marginBottom: 12 }}>
                <span className="material-symbols-rounded">person_add</span>
                Nuevo registro
              </p>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                <input className="ios-input" placeholder="Nombres *" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required />
                <input className="ios-input" placeholder="Apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
                <input className="ios-input" placeholder="DNI" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
                <input className="ios-input" placeholder="Código credencial (ej. ARB-01)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                <select className="ios-input" value={form.funcion} onChange={(e) => setForm({ ...form, funcion: e.target.value })}>
                  {FUNCIONES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input className="ios-input" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                <input className="ios-input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="ios-input" placeholder="País" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
              </div>
              <button type="submit" className="ios-btn ios-btn-primary" style={{ marginTop: 14 }} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Agregar a la planilla'}
              </button>
            </form>

            <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                className="ios-input"
                placeholder="Buscar árbitro…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                style={{ flex: '1 1 200px', maxWidth: 320 }}
              />
              <button type="button" className="ios-btn ios-btn-secondary" onClick={exportarCsv} disabled={!arbitros.length}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>download</span>
                Exportar CSV
              </button>
            </div>

            <div className="ios-card" style={{ padding: 4, overflow: 'hidden' }}>
              <table className="admin-data-table">
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th>Nombre</th>
                    <th>Función</th>
                    <th>Código</th>
                    <th>Contacto</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((a) => (
                    <tr key={a.id_arbitro}>
                      <td>
                        <strong>{a.nombre_completo}</strong>
                        {a.documento ? <div className="ios-caption" style={{ color: 'var(--label3)' }}>DNI {a.documento}</div> : null}
                      </td>
                      <td style={{ padding: 10 }}>{a.funcion}</td>
                      <td style={{ padding: 10, fontWeight: 700, color: 'var(--red)' }}>{a.codigo || '—'}</td>
                      <td style={{ padding: 10, fontSize: 12, color: 'var(--label2)' }}>{a.telefono || a.email || '—'}</td>
                      <td style={{ padding: 10 }}>
                        <div className="icon-action-row">
                          {a.telefono ? (
                            <IconAction
                              icon="chat"
                              title="WhatsApp"
                              variant="wa"
                              href={whatsappUrl(a.telefono, `Hola ${a.nombre_completo}, información FestCup 2026.`)}
                              target="_blank"
                              rel="noreferrer"
                            />
                          ) : null}
                          <IconAction icon="delete" title="Quitar de la planilla" variant="danger" onClick={() => quitar(a)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtrados.length === 0 && (
                <p style={{ padding: 24, textAlign: 'center', color: 'var(--label3)' }}>Sin árbitros registrados. Agrega el primero arriba.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="credenciales-toolbar no-print" style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--label2)' }}>
                {filtrados.length} credencial(es) · imprimir desde el navegador (Ctrl/Cmd+P)
              </p>
            </div>
            <div className="credenciales-grid">
              {filtrados.map((a) => (
                <CredencialCard
                  key={a.id_arbitro}
                  templateUrl={templateUrl}
                  layout={layout}
                  competidor={{
                    id_linea: a.id_arbitro,
                    id_academia_campeonato: `arb-${a.id_arbitro}`,
                    nombres: a.nombre_completo,
                    categoria: a.funcion,
                    modalidad: 'oficial',
                    dorsal: a.codigo || '',
                    foto_url: a.foto_url,
                    academia: a.pais || 'Perú',
                    academia_logo_url: null,
                  }}
                />
              ))}
            </div>
            {filtrados.length === 0 && <LoadingState mensaje="Registra árbitros en la pestaña Planilla." />}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
