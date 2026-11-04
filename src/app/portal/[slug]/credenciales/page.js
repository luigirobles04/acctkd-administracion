'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import PortalLayout from '@/components/campeonatos/PortalLayout'
import LoadingState from '@/components/ui/LoadingState'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import { portalFetch } from '@/lib/portal-client'
import { readJsonResponse } from '@/lib/public-app-url'
import {
  descargarCredencialesPdf,
  descargarCredencialesZipPorAlumno,
} from '@/lib/campeonato/export-credenciales-pdf-client'
import '@/components/campeonatos/credenciales.css'

export default function PortalCredencialesPage() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [campeonato, setCampeonato] = useState(null)
  const [academia, setAcademia] = useState(null)
  const [templateUrl, setTemplateUrl] = useState('/credenciales/plantilla-frente.png')
  const [credencialLayout, setCredencialLayout] = useState(null)
  const [exportando, setExportando] = useState(false)
  const [progresoPdf, setProgresoPdf] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await portalFetch(`/api/portal/campeonato/${slug}/credenciales`, { cache: 'no-store' })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error)
      setCampeonato(json.campeonato)
      setTemplateUrl(json.campeonato?.template_url || '/credenciales/plantilla-frente.png')
      setCredencialLayout(json.campeonato?.credencial_layout || null)
      setAcademia(json.academias?.[0] || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    cargar()
  }, [cargar])

  function contarAlumnosUnicos(lineas) {
    const keys = new Set()
    for (const c of lineas || []) {
      if (c.id_perfil) keys.add(`p-${c.id_perfil}`)
      else keys.add(`n-${(c.nombres || c.dorsal || c.id_linea).toString()}`)
    }
    return keys.size
  }

  async function confirmarLoteGrande(nCredenciales, nAlumnos) {
    if (nCredenciales <= 25) return true
    return confirm(
      `Vas a generar archivos para ${nAlumnos} alumno(s) (${nCredenciales} credencial(es)). ` +
        `Puede tardar 1–3 minutos: no cierres la pestaña y usa Chrome en computadora si puedes.\n\n¿Continuar?`
    )
  }

  async function descargarZipAlumnos() {
    if (!academia?.competidores?.length) return
    const lineas = academia.competidores
    const nAlumnos = contarAlumnosUnicos(lineas)
    if (!(await confirmarLoteGrande(lineas.length, nAlumnos))) return
    setExportando(true)
    setProgresoPdf(null)
    try {
      const acSlug = (academia.nombre || 'academia').replace(/\s+/g, '-').slice(0, 40)
      await descargarCredencialesZipPorAlumno({
        filename: `credenciales-por-alumno-${slug}-${acSlug}.zip`,
        onProgress: (n, total, meta) =>
          setProgresoPdf({
            n,
            total,
            fase: meta?.fase === 'zip' ? 'Comprimiendo ZIP…' : 'Generando',
          }),
      })
    } catch (e) {
      alert(e.message || 'No se pudo generar el ZIP')
    } finally {
      setExportando(false)
      setProgresoPdf(null)
    }
  }

  async function descargarPdfUnico() {
    if (!academia?.competidores?.length) return
    const lineas = academia.competidores
    const nAlumnos = contarAlumnosUnicos(lineas)
    if (!(await confirmarLoteGrande(lineas.length, nAlumnos))) return
    setExportando(true)
    setProgresoPdf(null)
    try {
      const acSlug = (academia.nombre || 'academia').replace(/\s+/g, '-').slice(0, 40)
      await descargarCredencialesPdf({
        filename: `credenciales-${slug}-${acSlug}.pdf`,
        onProgress: (n, total) => setProgresoPdf({ n, total, fase: 'Generando' }),
      })
    } catch (e) {
      alert(e.message || 'No se pudo generar el PDF')
    } finally {
      setExportando(false)
      setProgresoPdf(null)
    }
  }

  return (
    <PortalLayout titulo="Credenciales" subtitulo={campeonato?.nombre || 'FestCup'} backHref={`/portal/${slug}?tab=documentos`}>
      <div className="credenciales-root">
        <div className="no-print credenciales-toolbar" style={{ marginBottom: 16 }}>
          <Link href={`/portal/${slug}?tab=documentos`} className="credenciales-back">
            ← Volver al portal
          </Link>
          <div className="credenciales-actions">
            <button type="button" className="ios-btn ios-btn-secondary" onClick={cargar} disabled={loading}>
              Actualizar
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-primary portal-btn-spinner"
              onClick={descargarZipAlumnos}
              disabled={!academia?.competidores?.length || exportando}
            >
              {exportando
                ? progresoPdf
                  ? `${progresoPdf.fase || 'Generando'} ${progresoPdf.n}/${progresoPdf.total}`
                  : 'Preparando…'
                : `ZIP: 1 PDF por alumno (${contarAlumnosUnicos(academia?.competidores) || 0})`}
            </button>
            <button
              type="button"
              className="ios-btn ios-btn-secondary"
              onClick={descargarPdfUnico}
              disabled={!academia?.competidores?.length || exportando}
            >
              PDF único ({academia?.competidores?.length || 0} págs.)
            </button>
          </div>
          <p className="credenciales-hint">
            Solo inscripciones con <strong>dorsal asignado</strong>. El <strong>ZIP</strong> incluye la carpeta{' '}
            <code style={{ fontSize: 12 }}>credenciales/</code> con un PDF por alumno (54×86 mm por página; si tiene
            kyorugi y poomsae, van varias páginas en el mismo PDF). Con muchos alumnos usa <strong>Chrome en PC</strong>{' '}
            y no cierres la pestaña hasta que baje el archivo.
          </p>
        </div>

        {loading ? (
          <LoadingState mensaje="Cargando credenciales…" />
        ) : error ? (
          <p style={{ color: '#C0000A' }}>{error}</p>
        ) : !academia?.competidores?.length ? (
          <p>Aún no hay credenciales listas (falta dorsal o aprobación).</p>
        ) : (
          <section className="credenciales-academia is-open">
            <header className="no-print credenciales-academia-head">
              <div className="credenciales-academia-titles">
                <h2>{academia.nombre}</h2>
                <p>{academia.competidores.length} credencial(es)</p>
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
        )}
      </div>
    </PortalLayout>
  )
}
