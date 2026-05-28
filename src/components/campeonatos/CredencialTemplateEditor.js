'use client'

import { useCallback, useRef, useState } from 'react'
import CredencialCard from '@/components/campeonatos/CredencialCard'
import { DEFAULT_CREDENCIAL_LAYOUT, normalizeCredencialLayout, credencialTemplateSrc } from '@/lib/campeonato/credencial-layout'

const SAMPLE = {
  id_linea: 0,
  id_academia_campeonato: 0,
  nombres: 'NOMBRE APELLIDO',
  categoria: 'JUVENIL D M +73KG',
  dorsal: 'CHA-001',
  codigo_academia: 'CHA',
  academia: 'ACADEMIA EJEMPLO',
  foto_url: null,
}

function ZoneOverlay({ zone, label, color, onDrag, previewRef }) {
  const dragging = useRef(false)
  const start = useRef({ x: 0, y: 0, left: zone.left, top: zone.top })

  const onMouseDown = (e) => {
    e.preventDefault()
    dragging.current = true
    start.current = { x: e.clientX, y: e.clientY, left: zone.left, top: zone.top }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onMove = useCallback(
    (e) => {
      if (!dragging.current || !previewRef.current) return
      const rect = previewRef.current.getBoundingClientRect()
      const dx = ((e.clientX - start.current.x) / rect.width) * 100
      const dy = ((e.clientY - start.current.y) / rect.height) * 100
      onDrag({
        left: Math.min(95, Math.max(5, start.current.left + dx)),
        top: Math.min(95, Math.max(5, start.current.top + dy)),
      })
    },
    [onDrag, previewRef]
  )

  const onUp = () => {
    dragging.current = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  const isCircle = zone.type === 'circle'
  const w = zone.width || 34
  const h = isCircle ? w : zone.height || 22

  return (
    <div
      role="presentation"
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: `${zone.left}%`,
        top: `${zone.top}%`,
        width: `${w}%`,
        height: isCircle ? undefined : `${h}%`,
        aspectRatio: isCircle ? '1' : undefined,
        transform: 'translate(-50%, -50%)',
        border: `2px dashed ${color}`,
        borderRadius: isCircle ? '50%' : 4,
        background: `${color}22`,
        cursor: 'move',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color,
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  )
}

export default function CredencialTemplateEditor({
  idCampeonato,
  templateUrl,
  layout: initialLayout,
  onSaved,
}) {
  const [open, setOpen] = useState(false)
  const [layout, setLayout] = useState(() => normalizeCredencialLayout(initialLayout))
  const [previewSrc, setPreviewSrc] = useState(templateUrl || '/credenciales/plantilla-frente.png')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const previewRef = useRef(null)
  const fileRef = useRef(null)

  async function subirPlantilla(file) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('credencial_layout', JSON.stringify(layout))
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/credenciales/plantilla`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const url = credencialTemplateSrc(json.campeonato?.template_competidor_url) || json.publicUrl || previewSrc
      setPreviewSrc(url)
      setLayout(normalizeCredencialLayout(json.campeonato?.credencial_layout))
      onSaved?.(json.campeonato, url)
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function guardarLayout() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/credenciales/plantilla`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credencial_layout: layout }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onSaved?.(json.campeonato, previewSrc)
      setOpen(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  function resetLayout() {
    setLayout({ ...DEFAULT_CREDENCIAL_LAYOUT })
  }

  if (!open) {
    return (
      <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setOpen(true)}>
        Plantilla y zonas
      </button>
    )
  }

  return (
    <div className="cred-editor-panel no-print">
      <div className="cred-editor-head">
        <h3>Plantilla de credencial</h3>
        <button type="button" className="ios-btn ios-btn-secondary" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>

      <p className="cred-editor-hint">
        Sube tu PNG/JPG (54×86 mm recomendado). Arrastra las zonas punteadas para ubicar la foto (círculo) y los datos del participante.
      </p>

      <div className="cred-editor-grid">
        <div className="cred-editor-preview-wrap">
          <div ref={previewRef} className="cred-editor-preview">
            <img src={previewSrc} alt="" className="cred-editor-preview-img" />
            <ZoneOverlay
              zone={layout.foto}
              label="FOTO"
              color="#2563eb"
              previewRef={previewRef}
              onDrag={(patch) => setLayout((l) => ({ ...l, foto: { ...l.foto, ...patch } }))}
            />
            <ZoneOverlay
              zone={{ ...layout.datos, type: 'rect', left: layout.datos.left + layout.datos.width / 2, top: layout.datos.top + layout.datos.height / 2, width: layout.datos.width, height: layout.datos.height }}
              label="DATOS"
              color="#f59e0b"
              previewRef={previewRef}
              onDrag={(patch) =>
                setLayout((l) => ({
                  ...l,
                  datos: {
                    ...l.datos,
                    left: patch.left - l.datos.width / 2,
                    top: patch.top - l.datos.height / 2,
                  },
                }))
              }
            />
          </div>

          <div className="cred-editor-controls">
            <label>
              Ancho foto (%)
              <input
                type="range"
                min={20}
                max={45}
                step={0.5}
                value={layout.foto.width}
                onChange={(e) =>
                  setLayout((l) => ({ ...l, foto: { ...l.foto, width: Number(e.target.value) } }))
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={layout.foto.type === 'circle'}
                onChange={(e) =>
                  setLayout((l) => ({
                    ...l,
                    foto: { ...l.foto, type: e.target.checked ? 'circle' : 'rect' },
                  }))
                }
              />
              Foto circular
            </label>
          </div>
        </div>

        <div className="cred-editor-sample">
          <p className="cred-editor-sample-label">Vista previa credencial</p>
          <CredencialCard
            competidor={SAMPLE}
            templateUrl={previewSrc}
            layout={layout}
          />
        </div>
      </div>

      <div className="cred-editor-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => subirPlantilla(e.target.files?.[0])}
        />
        <button
          type="button"
          className="ios-btn ios-btn-secondary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Subiendo…' : 'Subir plantilla'}
        </button>
        <button type="button" className="ios-btn ios-btn-secondary" onClick={resetLayout}>
          Restaurar zonas
        </button>
        <button type="button" className="ios-btn ios-btn-primary" disabled={saving} onClick={guardarLayout}>
          {saving ? 'Guardando…' : 'Guardar zonas'}
        </button>
      </div>
    </div>
  )
}
