'use client'

import { useRef, useState } from 'react'
import { portalFetch } from '@/lib/portal-client'
import { readJsonResponse } from '@/lib/public-app-url'
import { FESTCUP_DOCS } from '@/lib/site-config'
import { LoadingSpinner } from '@/components/ui/LoadingState'

const COMMIT_CHUNK = 80

export default function PortalImportExcel({ slug, onSuccess, disabled = false }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [progress, setProgress] = useState(null)

  async function analizar() {
    if (!file) return
    setLoading(true)
    setError(null)
    setPreview(null)
    setProgress(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await portalFetch(`/api/portal/campeonato/${slug}/import-excel`, {
        method: 'POST',
        body: fd,
      })
      const json = await readJsonResponse(res)
      if (!res.ok) throw new Error(json.error || 'Error al procesar Excel')
      setPreview(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmar() {
    if (!file || !preview) return
    setLoading(true)
    setError(null)
    setProgress(null)

    const total = preview.resumen?.ok || 0
    let offset = 0
    let importado = 0
    let dorsales = 0
    const fallidas = []
    const omitidas = []

    try {
      while (true) {
        setProgress({
          hechos: Math.min(offset, total),
          total,
          lote: Math.floor(offset / COMMIT_CHUNK) + 1,
          lotes: Math.max(1, Math.ceil(total / COMMIT_CHUNK)),
        })

        const fd = new FormData()
        fd.append('file', file)
        fd.append('commit', 'true')
        fd.append('offset', String(offset))
        fd.append('limit', String(COMMIT_CHUNK))

        const res = await portalFetch(`/api/portal/campeonato/${slug}/import-excel`, {
          method: 'POST',
          body: fd,
        })
        const json = await readJsonResponse(res)
        if (!res.ok) throw new Error(json.error || 'Error al importar Excel')

        importado += json.importado || 0
        dorsales += json.dorsales || 0
        if (json.fallidas?.length) fallidas.push(...json.fallidas)
        if (json.omitidas?.length) omitidas.push(...json.omitidas)

        if (json.done) break
        offset = json.nextOffset ?? offset + COMMIT_CHUNK
      }

      setDone({ importado, dorsales, fallidas, omitidas })
      setPreview(null)
      setFile(null)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
      onSuccess?.()
    } catch (e) {
      setError(
        importado > 0
          ? `${e.message} (se importaron ${importado} línea(s) antes del corte; vuelve a confirmar — las ya creadas se omiten).`
          : e.message,
      )
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="portal-card portal-import-excel">
      <h3 className="portal-section-title">Importar plantel desde Excel</h3>
      <p className="portal-section-lead">
        Usa la misma ficha de inscripción de años anteriores (Kyorugi, Poomsae, parejas, equipos, festival y entrenadores).
      </p>

      <div className="portal-import-docs">
        <a href={FESTCUP_DOCS.plantillaExcel} download className="ios-btn ios-btn-secondary" style={{ fontSize: 13 }}>
          ⬇ Descargar plantilla Excel
        </a>
        <a href={FESTCUP_DOCS.bases} target="_blank" rel="noreferrer" className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }}>
          Bases PDF
        </a>
        <a href={FESTCUP_DOCS.programa} target="_blank" rel="noreferrer" className="ios-btn ios-btn-ghost" style={{ fontSize: 13 }}>
          Programa PDF
        </a>
      </div>

      <div
        className="portal-import-drop"
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag') }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('drag')
          const f = e.dataTransfer.files?.[0]
          if (f) { setFile(f); setPreview(null); setDone(null) }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          disabled={disabled}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setPreview(null)
            setDone(null)
          }}
        />
        <span className="portal-import-drop-icon">📊</span>
        <strong>{file ? file.name : 'Arrastra tu Excel o haz clic para elegir'}</strong>
        <span className="portal-field-hint">Formato .xlsx · hojas POOMSAE, KYORUGUI, FESTIVAL, ENTRENADORES</span>
      </div>

      {error && <p className="portal-alert portal-alert--error">{error}</p>}

      {done && (
        <div className="portal-alert portal-alert--ok">
          <strong>Importación completada</strong>
          <p>{done.importado} inscripción(es) creada(s).</p>
          {done.dorsales > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              {done.dorsales} dorsal(es) asignado(s) automáticamente.
            </p>
          )}
          {done.omitidas?.length > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              {done.omitidas.length} duplicada(s) omitida(s) (ya estaban inscritas).
            </p>
          )}
          {done.fallidas?.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {done.fallidas.map((f, i) => (
                <li key={i}>{f.label}: {f.error}</li>
              ))}
            </ul>
          )}
          <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600 }}>
            Siguiente paso: ve a <b>Plantel</b> y sube las fotos carnet de cada deportista para la credencial.
          </p>
        </div>
      )}

      {preview && (
        <div className="portal-import-preview">
          <div className="portal-import-stats">
            <span><b>{preview.resumen?.perfiles || 0}</b> competidores</span>
            <span><b>{preview.resumen?.ok || 0}</b> líneas OK</span>
            <span className={preview.resumen?.errores ? 'warn' : ''}><b>{preview.resumen?.errores || 0}</b> con error</span>
          </div>
          {preview.advertencias?.map((a) => (
            <p key={a} className="portal-field-hint portal-field-hint--warn">{a}</p>
          ))}
          {(preview.resumen?.ok || 0) > COMMIT_CHUNK && (
            <p className="portal-field-hint">
              Se importará en {Math.ceil((preview.resumen?.ok || 0) / COMMIT_CHUNK)} lotes automáticos (no cierres esta pestaña).
            </p>
          )}
          <div className="portal-import-table-wrap">
            <table className="portal-import-table">
              <thead>
                <tr>
                  <th>Inscripción</th>
                  <th>Hoja</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(preview.lineas || []).slice(0, 80).map((l) => (
                  <tr key={l.id} className={l.valido ? '' : 'err'}>
                    <td>{l.label}</td>
                    <td>{l.hoja}</td>
                    <td>
                      {l.valido ? '✓ OK' : l.errores?.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(preview.lineasTotal || preview.lineas?.length || 0) > (preview.lineas?.length || 0) && (
            <p className="portal-field-hint">
              Mostrando {preview.lineas.length} de {preview.lineasTotal || preview.lineas.length} líneas
              (primero las que tienen error).
            </p>
          )}
        </div>
      )}

      <div className="portal-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="ios-btn ios-btn-secondary portal-btn-spinner"
          disabled={!file || loading || disabled}
          onClick={analizar}
        >
          {loading && !preview && !progress ? <><LoadingSpinner size={16} /> Analizando…</> : 'Vista previa'}
        </button>
        <button
          type="button"
          className="ios-btn ios-btn-primary portal-btn-spinner"
          disabled={!preview || loading || disabled || !(preview.resumen?.ok > 0)}
          onClick={confirmar}
        >
          {loading && progress
            ? <><LoadingSpinner size={16} light /> Lote {progress.lote}/{progress.lotes}…</>
            : `Confirmar importación (${preview?.resumen?.ok || 0})`}
        </button>
      </div>
      {loading && (
        <p className="portal-field-hint" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LoadingSpinner size={16} />
          {progress
            ? `Importando ${progress.hechos} de ${progress.total}… (lote ${progress.lote}/${progress.lotes})`
            : preview
              ? 'Preparando importación…'
              : 'Leyendo Excel…'}
        </p>
      )}
    </div>
  )
}
