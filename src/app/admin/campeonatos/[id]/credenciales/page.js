'use client'
import { adminFetch } from '@/lib/admin-client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layout/AdminLayout'
import LoadingState from '@/components/ui/LoadingState'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import CredencialTemplateEditor from '@/components/campeonatos/CredencialTemplateEditor'
import { readJsonResponse } from '@/lib/public-app-url'
import {
  descargarCredencialesPdf,
  descargarCredencialesZipPorAlumno,
  slugArchivo,
} from '@/lib/campeonato/export-credenciales-pdf-client'
import '@/components/campeonatos/credenciales.css'

export default function CredencialesPage() {
  const { id } = useParams()
  const idCampeonato = Number(id)
  const [campeonato, setCampeonato] = useState(null)
  const [templateUrl, setTemplateUrl] = useState('/credenciales/plantilla-frente.png')
  const [credencialLayout, setCredencialLayout] = useState(null)
  const [academias, setAcademias] = useState([])
  const [totalCargado, setTotalCargado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [expandidas, setExpandidas] = useState({})
  const [exportando, setExportando] = useState(false)
  const [progresoPdf, setProgresoPdf] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/campeonatos/${idCampeonato}/credenciales`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setTemplateUrl(json.campeonato?.template_url || '/credenciales/plantilla-frente.png')
      setCredencialLayout(json.campeonato?.credencial_layout || null)
      setAcademias(json.academias || [])
      setTotalCargado(json.total ?? json.competidores?.length ?? 0)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }, [idCampeonato])

  useEffect(() => {
    cargar()
  }, [cargar])

  const academiasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return academias
    return academias
      .map((a) => ({
        ...a,
        competidores: a.competidores.filter((c) =>
          [c.dorsal, c.nombres, c.categoria, a.nombre, c.codigo_academia].join(' ').toLowerCase().includes(q)
        ),
      }))
      .filter((a) => a.competidores.length > 0)
  }, [academias, filtro])

  const totalCredenciales = academiasFiltradas.reduce((n, a) => n + a.competidores.length, 0)
  const todasExpandidas = academiasFiltradas.length > 0 && academiasFiltradas.every((a) => expandidas[a.id_academia_campeonato])

  useEffect(() => {
    const q = filtro.trim()
    if (!q) return
    setExpandidas((prev) => {
      const next = { ...prev }
      for (const a of academiasFiltradas) {
        next[a.id_academia_campeonato] = true
      }
      return next
    })
  }, [filtro, academiasFiltradas])

  function toggleAcademia(idAcademia) {
    setExpandidas((e) => ({ ...e, [idAcademia]: !e[idAcademia] }))
  }

  function expandirTodas() {
    setExpandidas(Object.fromEntries(academiasFiltradas.map((a) => [a.id_academia_campeonato, true])))
  }

  function colapsarTodas() {
    setExpandidas({})
  }

  function contarAlumnos(lineas) {
    const keys = new Set()
    for (const c of lineas || []) {
      if (c.id_perfil) keys.add(`p-${c.id_perfil}`)
      else keys.add(`n-${(c.nombres || c.dorsal || c.id_linea).toString()}`)
    }
    return keys.size
  }

  function lineasEnScope(scope) {
    if (scope === 'all') {
      return academiasFiltradas.flatMap((a) => a.competidores)
    }
    const ac = academiasFiltradas.find((a) => String(a.id_academia_campeonato) === String(scope))
    return ac?.competidores || []
  }

  async function confirmarLoteGrande(nCred, nAlumnos) {
    if (nCred <= 25) return true
    return confirm(
      `Generar archivos para ${nAlumnos} alumno(s) (${nCred} credencial(es)). ` +
        `Puede tardar varios minutos: no cierres la pestaña (Chrome en PC recomendado).\n\n¿Continuar?`
    )
  }

  async function withExportScope(scope, fn) {
    const root = document.querySelector('.credenciales-root')
    const sheets = document.querySelectorAll('.credencial-sheet')
    root?.classList.add('credenciales-export-mode')
    sheets.forEach((el) => {
      if (scope === 'all') el.classList.remove('print-hide')
      else el.classList.toggle('print-hide', String(el.dataset.academia) !== String(scope))
    })
    try {
      await fn()
    } finally {
      sheets.forEach((el) => el.classList.remove('print-hide'))
      root?.classList.remove('credenciales-export-mode')
    }
  }

  async function exportarZip(scope) {
    const lineas = lineasEnScope(scope)
    if (!lineas.length) {
      alert('No hay credenciales en este alcance.')
      return
    }
    const nAlumnos = contarAlumnos(lineas)
    if (!(await confirmarLoteGrande(lineas.length, nAlumnos))) return

    setExportando(true)
    setProgresoPdf(null)
    try {
      const campSlug = slugArchivo(campeonato?.nombre || `campeonato-${idCampeonato}`)
      let suffix = ''
      if (scope !== 'all') {
        const ac = academiasFiltradas.find((a) => String(a.id_academia_campeonato) === String(scope))
        suffix = `-${slugArchivo(ac?.nombre || scope)}`
      }
      await withExportScope(scope, () =>
        descargarCredencialesZipPorAlumno({
          filename: `credenciales-por-alumno-${campSlug}${suffix}.zip`,
          onProgress: (n, total, meta) =>
            setProgresoPdf({
              n,
              total,
              fase: meta?.fase === 'zip' ? 'Comprimiendo ZIP…' : 'Generando',
            }),
        })
      )
    } catch (e) {
      alert(e.message || 'No se pudo generar el ZIP')
    } finally {
      setExportando(false)
      setProgresoPdf(null)
    }
  }

  async function exportarPdfUnico(scope) {
    const lineas = lineasEnScope(scope)
    if (!lineas.length) {
      alert('No hay credenciales en este alcance.')
      return
    }
    const nAlumnos = contarAlumnos(lineas)
    if (!(await confirmarLoteGrande(lineas.length, nAlumnos))) return

    setExportando(true)
    setProgresoPdf(null)
    try {
      const campSlug = slugArchivo(campeonato?.nombre || `campeonato-${idCampeonato}`)
      let suffix = ''
      if (scope !== 'all') {
        const ac = academiasFiltradas.find((a) => String(a.id_academia_campeonato) === String(scope))
        suffix = `-${slugArchivo(ac?.nombre || scope)}`
      }
      await withExportScope(scope, () =>
        descargarCredencialesPdf({
          filename: `credenciales-${campSlug}${suffix}.pdf`,
          onProgress: (n, total) => setProgresoPdf({ n, total, fase: 'Generando' }),
        })
      )
    } catch (e) {
      alert(e.message || 'No se pudo generar el PDF')
    } finally {
      setExportando(false)
      setProgresoPdf(null)
    }
  }

  const totalAlumnosFiltrados = contarAlumnos(academiasFiltradas.flatMap((a) => a.competidores))

  return (
    <AdminLayout title="Credenciales" subtitle={campeonato?.nombre}>
      <div className="credenciales-root">
        <div className="no-print credenciales-toolbar">
          <Link href={`/admin/campeonatos/${id}`} className="credenciales-back">
            ← Campeonato
          </Link>

          <div className="credenciales-actions">
            <input
              className="ios-input"
              placeholder="Buscar academia, dorsal, nombre…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <button type="button" className="ios-btn ios-btn-secondary" onClick={cargar} disabled={loading}>
              {loading ? '…' : 'Actualizar'}
            </button>
            <button type="button" className="ios-btn ios-btn-secondary" onClick={todasExpandidas ? colapsarTodas : expandirTodas} disabled={academiasFiltradas.length === 0}>
              {todasExpandidas ? 'Colapsar todas' : 'Expandir todas'}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-primary"
              disabled={exportando || totalCredenciales === 0}
              onClick={() => exportarZip('all')}
            >
              {exportando
                ? progresoPdf
                  ? `${progresoPdf.fase || 'Generando'} ${progresoPdf.n}/${progresoPdf.total}`
                  : 'Preparando…'
                : `ZIP por alumno (${totalAlumnosFiltrados})`}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              disabled={exportando || totalCredenciales === 0}
              onClick={() => exportarPdfUnico('all')}
            >
              PDF único ({totalCredenciales})
            </button>
          </div>

          {!loading && totalCargado > 0 && (
            <p className="credenciales-summary">
              <span className="material-symbols-rounded">badge</span>
              {totalCargado} credenciales · {academias.length} academias
              {filtro.trim() && ` · ${academiasFiltradas.length} coincidencias`}
            </p>
          )}

          <CredencialTemplateEditor
            idCampeonato={idCampeonato}
            templateUrl={templateUrl}
            layout={credencialLayout}
            onSaved={(camp, url) => {
              setCredencialLayout(camp?.credencial_layout || null)
              if (url) setTemplateUrl(url)
            }}
          />

          <p className="credenciales-hint">
            Solo aparecen inscripciones con <strong>dorsal asignado</strong>. Descarga <strong>ZIP (1 PDF por alumno)</strong> o{' '}
            <strong>PDF único</strong>; respeta el filtro de búsqueda. Academias colapsadas igual entran en la exportación.
          </p>
        </div>

        {loading ? (
          <div className="no-print"><LoadingState mensaje="Cargando credenciales…" /></div>
        ) : academiasFiltradas.length === 0 ? (
          <p className="no-print">No hay competidores con dorsal aprobado{filtro.trim() ? ' para esa búsqueda' : ''}.</p>
        ) : (
          academiasFiltradas.map((academia) => {
            const abierta = Boolean(expandidas[academia.id_academia_campeonato])
            return (
              <section
                key={academia.id_academia_campeonato}
                className={`credenciales-academia ${abierta ? 'is-open' : 'is-collapsed'}`}
                data-academia={academia.id_academia_campeonato}
              >
                <header className="no-print credenciales-academia-head">
                  <button
                    type="button"
                    className="credenciales-academia-toggle"
                    onClick={() => toggleAcademia(academia.id_academia_campeonato)}
                    aria-expanded={abierta}
                  >
                    <span className={`credenciales-chevron material-symbols-rounded ${abierta ? 'is-open' : ''}`}>
                      chevron_right
                    </span>
                    <div className="credenciales-academia-titles">
                      <h2>{academia.nombre}</h2>
                      <p>
                        {academia.codigo_academia ? `${academia.codigo_academia} · ` : ''}
                        {academia.competidores.length} credencial{academia.competidores.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </button>
                  <div className="credenciales-academia-actions">
                    <button
                      type="button"
                      className="ios-btn ios-btn-secondary cred-btn-sm"
                      disabled={exportando}
                      onClick={() => exportarZip(String(academia.id_academia_campeonato))}
                    >
                      ZIP
                    </button>
                    <button
                      type="button"
                      className="ios-btn ios-btn-secondary cred-btn-sm"
                      disabled={exportando}
                      onClick={() => exportarPdfUnico(String(academia.id_academia_campeonato))}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="ios-btn ios-btn-secondary cred-btn-sm"
                      onClick={() => toggleAcademia(academia.id_academia_campeonato)}
                    >
                      {abierta ? 'Ver menos' : 'Ver más'}
                    </button>
                  </div>
                </header>

                <div className="credenciales-stack">
                  {academia.competidores.map((c) => (
                    <CredencialCard
                      key={c.id_linea}
                      competidor={c}
                      templateUrl={c.template_url || templateUrl}
                      layout={credencialLayout}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>
    </AdminLayout>
  )
}
