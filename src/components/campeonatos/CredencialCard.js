'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  credencialTemplateSrc,
  DEFAULT_CREDENCIAL_LAYOUT,
  normalizeCredencialLayout,
} from '@/lib/campeonato/credencial-layout'

function formatNombre(nombre) {
  if (!nombre) return ''
  return nombre.trim().toUpperCase()
}

function iniciales(nombre) {
  const parts = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('')
}

function formatCategoria(nombre) {
  return (nombre || '').toUpperCase().replace(/\s+/g, ' ')
}

export default function CredencialCard({ competidor: c, templateUrl, layout: layoutProp }) {
  const [fotoOk, setFotoOk] = useState(Boolean(c.foto_url))
  const nombre = useMemo(() => formatNombre(c.nombres), [c.nombres])
  const layout = useMemo(
    () => normalizeCredencialLayout(layoutProp || DEFAULT_CREDENCIAL_LAYOUT),
    [layoutProp]
  )
  const plantillaSrc = credencialTemplateSrc(templateUrl)

  useEffect(() => {
    setFotoOk(Boolean(c.foto_url))
  }, [c.foto_url])

  const fotoStyle = {
    left: `${layout.foto.left}%`,
    top: `${layout.foto.top}%`,
    width: `${layout.foto.width}%`,
    borderRadius: layout.foto.type === 'circle' ? '50%' : '2px',
  }

  const datosStyle = {
    left: `${layout.datos.left}%`,
    top: `${layout.datos.top}%`,
    width: `${layout.datos.width}%`,
    height: `${layout.datos.height}%`,
  }

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className="credencial-frente">
        <img src={plantillaSrc} alt="" className="cred-plantilla-bg" />

        <div className="cred-foto-slot" style={fotoStyle}>
          {c.foto_url && fotoOk ? (
            <img
              src={c.foto_url}
              alt=""
              className="cred-foto-img"
              onError={() => setFotoOk(false)}
            />
          ) : (
            <div className="cred-foto-img cred-foto-img--empty">{iniciales(c.nombres)}</div>
          )}
        </div>

        <div className="cred-datos-slot" style={datosStyle}>
          <p className="cred-datos-nombre">{nombre || 'COMPETIDOR'}</p>
          <p className="cred-datos-categoria">{formatCategoria(c.categoria)}</p>
          <p className="cred-datos-extra">
            {c.dorsal}
            {c.academia ? ` · ${c.codigo_academia ? `${c.codigo_academia}. ` : ''}${c.academia}` : ''}
          </p>
        </div>
      </div>
    </article>
  )
}
