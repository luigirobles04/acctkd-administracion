'use client'

import { useRef, useState } from 'react'
import { portalFetch } from '@/lib/portal-client'
import { FESTCUP_DOCS } from '@/lib/site-config'

export default function PortalImportExcel({ slug, onSuccess, disabled = false }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  async function enviar(commit = false) {
    if (!file) return
    setLoading(true)
    setError(null)
    if (!commit) setPreview(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      if (commit) fd.append('commit', 'true')

      const res = await portalFetch(`/api/portal/campeonato/${slug}/import-excel`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al procesar Excel')

      if (commit) {
        setDone(json)
        setPreview(null)
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        onSuccess?.()
      } else {
        setPreview(json)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
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
          {(preview.lineas?.length || 0) > 80 && (
            <p className="portal-field-hint">Mostrando 80 de {preview.lineas.length} líneas.</p>
          )}
        </div>
      )}

      <div className="portal-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="ios-btn ios-btn-secondary"
          disabled={!file || loading || disabled}
          onClick={() => enviar(false)}
        >
          {loading && !preview ? 'Analizando…' : 'Vista previa'}
        </button>
        <button
          type="button"
          className="ios-btn ios-btn-primary"
          disabled={!preview || loading || disabled || !(preview.resumen?.ok > 0)}
          onClick={() => enviar(true)}
        >
          {loading && preview ? 'Importando…' : `Confirmar importación (${preview?.resumen?.ok || 0})`}
        </button>
      </div>
    </div>
  )
}
