'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import { obtenerCampeonato } from '@/lib/services/campeonato.service'
import { evaluarPesoEnCategoria, etiquetaPesaje, MAX_INTENTOS_PESAJE } from '@/lib/campeonato/pesaje'
import { readJsonResponse } from '@/lib/public-app-url'

function nombreCompetidor(l) {
  const m = l.miembros?.[0]?.perfil
  if (!m) return 'Sin nombre'
  return `${m.nombres || ''} ${m.apellidos || ''}`.trim()
}

function badgePesaje(estado) {
  if (estado === 'ok') return 'badge-green'
  if (estado === 'subido') return 'badge-blue'
  if (estado === 'reintento') return 'badge-yellow'
  if (estado === 'descalificado') return 'badge-red'
  return 'badge-gray'
}

export default function CampeonatoPesajePage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [lineas, setLineas] = useState([])
  const [form, setForm] = useState({ id_linea: '', peso: '' })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ultimoResultado, setUltimoResultado] = useState(null)
  const [categoriaSugerida, setCategoriaSugerida] = useState(null)
  const [modoCorregir, setModoCorregir] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const camp = await obtenerCampeonato(idCampeonato)
      setCampeonato(camp)
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pesaje`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setLineas(json.lineas || [])
    } catch (e) {
      alert(e.message)
      setLineas([])
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const lineaSeleccionada = useMemo(
    () => lineas.find((l) => String(l.id_linea) === String(form.id_linea)),
    [lineas, form.id_linea]
  )

  const preview = useMemo(() => {
    if (!lineaSeleccionada || !form.peso) return null
    return evaluarPesoEnCategoria(form.peso, lineaSeleccionada.categoria)
  }, [lineaSeleccionada, form.peso])

  async function registrarPesaje(e, recategorizar = false, forzar = false) {
    e.preventDefault()
    const peso = Number(form.peso)
    const idLinea = Number(form.id_linea)
    if (!idLinea || !peso) return

    setGuardando(true)
    setUltimoResultado(null)
    setCategoriaSugerida(null)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pesaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLinea, peso, recategorizar, forzar: forzar || modoCorregir }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)

      setUltimoResultado(json)
      if (json.categoriaSugerida && json.linea?.pesaje_estado === 'descalificado') {
        setCategoriaSugerida(json.categoriaSugerida)
      } else {
        setForm({ id_linea: '', peso: '' })
        setCategoriaSugerida(null)
      }
      await cargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function reiniciarPesaje(idLinea) {
    if (!confirm('¿Reiniciar oportunidades de pesaje para este competidor?')) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pesaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLinea, reiniciar: true }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      await cargar()
      alert(json.mensaje)
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }
  async function recategorizarYaprobar() {
    if (!form.id_linea || !form.peso) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/pesaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLinea: Number(form.id_linea), peso: Number(form.peso), recategorizar: true, forzar: true }),
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setUltimoResultado(json)
      setCategoriaSugerida(null)
      setForm({ id_linea: '', peso: '' })
      await cargar()
    } catch (err) {
      alert(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AdminLayout title="Pesaje" subtitle={campeonato?.nombre}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 8px 24px' }}>
        <Link href={`/admin/campeonatos/${id}`} style={{ color: 'var(--red)', fontSize: 13 }}>← Campeonato</Link>

        {loading ? (
          <p style={{ marginTop: 16 }}>Cargando…</p>
        ) : (
          <>
            <form className="ios-card" style={{ padding: 20, marginTop: 16 }} onSubmit={(e) => registrarPesaje(e, false)}>
              <h3 style={{ marginBottom: 8 }}>Registrar peso oficial</h3>
              <p className="ios-caption" style={{ color: 'var(--label3)', marginBottom: 16 }}>
                Máximo {MAX_INTENTOS_PESAJE} oportunidades por competidor. Se valida contra la categoría inscrita.
              </p>

              <label className="ios-label">Competidor kyorugi (con dorsal)</label>
              <select
                className="ios-input"
                value={form.id_linea}
                onChange={(e) => {
                  setForm({ id_linea: e.target.value, peso: '' })
                  setUltimoResultado(null)
                  setCategoriaSugerida(null)
                }}
                required
              >
                <option value="">Seleccionar…</option>
                {lineas.map((l) => (
                  <option key={l.id_linea} value={l.id_linea} disabled={l.pesaje_estado === 'ok'}>
                    {l.dorsal_display || '—'} — {nombreCompetidor(l)} — {l.categoria?.nombre || 'Sin cat.'}
                    {l.pesaje_intentos > 0 ? ` (${l.pesaje_intentos}/${MAX_INTENTOS_PESAJE})` : ''}
                  </option>
                ))}
              </select>

              {lineaSeleccionada && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--fill2, rgba(0,0,0,0.04))', fontSize: 13 }}>
                  <div>Categoría: <strong>{lineaSeleccionada.categoria?.nombre || '—'}</strong></div>
                  {lineaSeleccionada.categoria?.peso_max != null && (
                    <div style={{ marginTop: 4, color: 'var(--label2)' }}>
                      Rango permitido: {lineaSeleccionada.categoria.peso_min || 0}–{lineaSeleccionada.categoria.peso_max} kg
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    Oportunidades usadas: <strong>{lineaSeleccionada.pesaje_intentos || 0}/{MAX_INTENTOS_PESAJE}</strong>
                    {' · '}
                    <span className={`badge ${badgePesaje(lineaSeleccionada.pesaje_estado)}`}>
                      {etiquetaPesaje(lineaSeleccionada.pesaje_estado, lineaSeleccionada.pesaje_intentos)}
                    </span>
                  </div>
                </div>
              )}

              <label className="ios-label" style={{ marginTop: 12 }}>Peso en báscula (kg)</label>
              <input
                className="ios-input"
                type="number"
                step="0.1"
                min="0"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
                required
              />

              {preview && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: preview.ok ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)',
                    color: preview.ok ? '#1B7D3A' : '#C0000A',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {preview.ok ? '✓ ' : '✗ '}{preview.mensaje}
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
                <input type="checkbox" checked={modoCorregir} onChange={(e) => setModoCorregir(e.target.checked)} />
                Consolidación / corrección manual (ignora límite de intentos)
              </label>

              <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={guardando}>
                {guardando ? 'Registrando…' : modoCorregir ? 'Corregir pesaje' : 'Registrar pesaje'}
              </button>
            </form>

            {ultimoResultado?.mensaje && (
              <div className="ios-card" style={{ padding: 16, marginTop: 12, fontSize: 14 }}>
                <strong>Resultado:</strong> {ultimoResultado.mensaje}
                {categoriaSugerida && (
                  <button
                    type="button"
                    className="ios-btn ios-btn-primary"
                    style={{ display: 'block', marginTop: 12, width: '100%' }}
                    disabled={guardando}
                    onClick={recategorizarYaprobar}
                  >
                    Recategorizar a {categoriaSugerida.nombre} y aprobar
                  </button>
                )}
              </div>
            )}

            <div className="ios-card" style={{ padding: 16, marginTop: 16 }}>
              <h4 style={{ marginBottom: 12 }}>Lista de pesaje ({lineas.length})</h4>
              {lineas.map((l) => (
                <div key={l.id_linea} style={{ padding: '10px 0', borderBottom: '1px solid var(--separator)', fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <strong>{l.dorsal_display}</strong> — {nombreCompetidor(l)}
                      <div style={{ fontSize: 12, color: 'var(--label3)', marginTop: 4 }}>
                        {l.academia_campeonato?.academia?.nombre} · {l.categoria?.nombre}
                        {l.peso_oficial != null && ` · Oficial: ${l.peso_oficial} kg`}
                        {l.peso_declarado != null && l.peso_oficial == null && ` · Declarado: ${l.peso_declarado} kg`}
                      </div>
                    </div>
                    <span className={`badge ${badgePesaje(l.pesaje_estado)}`}>
                      {etiquetaPesaje(l.pesaje_estado, l.pesaje_intentos)}
                    </span>
                    {(l.pesaje_estado === 'descalificado' || l.pesaje_intentos >= MAX_INTENTOS_PESAJE) && (
                      <button
                        type="button"
                        className="ios-btn ios-btn-ghost"
                        style={{ fontSize: 11, marginTop: 6, padding: '2px 8px' }}
                        onClick={() => reiniciarPesaje(l.id_linea)}
                      >
                        Reiniciar oportunidades
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {lineas.length === 0 && (
                <p style={{ color: 'var(--label3)' }}>No hay competidores kyorugi con dorsal aprobado aún.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
