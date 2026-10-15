'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  credencialRolFestcup2026,
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
  const plantillaSrc = useMemo(() => {
    const src = credencialTemplateSrc(templateUrl)
    return layoutProp?.variant === 'festcup2026' || layout.variant === 'festcup2026'
      ? `${src}${src.includes('?') ? '&' : '?'}v=20261015b`
      : src
  }, [templateUrl, layoutProp?.variant, layout.variant])

  useEffect(() => {
    setFotoOk(Boolean(c.foto_url))
  }, [c.foto_url])

  const isFestcup2026 = layout.variant === 'festcup2026'
  const fotoStyle = {
    left: `${layout.foto.left}%`,
    top: `${layout.foto.top}%`,
    width: `${layout.foto.width}%`,
    ...(layout.foto.height ? { height: `${layout.foto.height}%`, aspectRatio: 'auto' } : {}),
    borderRadius: layout.foto.type === 'circle' ? '50%' : '1px',
  }

  const rolStyle = isFestcup2026
    ? {
        left: `${layout.rol?.left ?? 50}%`,
        top: `${layout.rol?.top ?? 62.6}%`,
        width: `${layout.rol?.width ?? 100}%`,
        transform: 'translateX(-50%)',
      }
    : null

  const datosStyle = {
    left: `${layout.datos.left}%`,
    top: `${layout.datos.top}%`,
    width: `${layout.datos.width}%`,
    height: `${layout.datos.height}%`,
    ...(isFestcup2026 ? { transform: 'translateX(-50%)' } : {}),
  }

  const rolLabel = isFestcup2026 ? credencialRolFestcup2026(c.modalidad) : null

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className={`credencial-frente${isFestcup2026 ? ' credencial-frente--festcup2026' : ''}`}>
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

        {isFestcup2026 && rolStyle ? (
          <p className="cred-datos-rol" style={rolStyle}>
            {rolLabel}
          </p>
        ) : null}

        <div className="cred-datos-slot" style={datosStyle}>
          <p className="cred-datos-nombre">{nombre || 'COMPETIDOR'}</p>
          {!isFestcup2026 && (
            <>
              <p className="cred-datos-categoria">{formatCategoria(c.categoria)}</p>
              <p className="cred-datos-extra">
                {c.dorsal}
                {c.academia ? ` · ${c.codigo_academia ? `${c.codigo_academia}. ` : ''}${c.academia}` : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
