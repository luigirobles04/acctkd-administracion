'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  credencialRolFestcup2026,
  credencialTemplateSrc,
  DEFAULT_CREDENCIAL_LAYOUT,
  isFestcup2026Credencial,
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
    () => normalizeCredencialLayout(layoutProp || DEFAULT_CREDENCIAL_LAYOUT, { templateUrl }),
    [layoutProp, templateUrl]
  )
  const isFestcup2026 = isFestcup2026Credencial({ layout, templateUrl })
  const plantillaSrc = useMemo(() => {
    const src = credencialTemplateSrc(templateUrl)
    return isFestcup2026 ? `${src}${src.includes('?') ? '&' : '?'}v=20261015k` : src
  }, [templateUrl, isFestcup2026])

  useEffect(() => {
    setFotoOk(Boolean(c.foto_url))
  }, [c.foto_url])

  const fotoStyle = {
    left: `${layout.foto.left}%`,
    top: `${layout.foto.top}%`,
    width: `${layout.foto.width}%`,
    ...(layout.foto.height ? { height: `${layout.foto.height}%`, aspectRatio: 'auto' } : {}),
    borderRadius: layout.foto.type === 'circle' ? '50%' : '1px',
  }

  const rolOnTemplate = isFestcup2026 && layout.rolOnTemplate

  const festcupZoneStyle = (zone) =>
    zone
      ? {
          left: `${zone.left}%`,
          top: `${zone.top}%`,
          width: `${zone.width ?? 90}%`,
          transform: 'translateX(-50%)',
        }
      : null

  const datosStyle = {
    left: `${layout.datos.left}%`,
    top: `${layout.datos.top}%`,
    width: `${layout.datos.width}%`,
    ...(isFestcup2026 && !rolOnTemplate
      ? { transform: 'translateX(-50%)' }
      : !isFestcup2026
        ? { height: `${layout.datos.height}%` }
        : {}),
  }

  const nombreZoneStyle = rolOnTemplate ? festcupZoneStyle(layout.nombre || layout.datos) : null
  const categoriaZoneStyle = rolOnTemplate ? festcupZoneStyle(layout.categoria) : null

  const academiaLogoStyle = isFestcup2026 && layout.academiaLogo
    ? {
        left: `${layout.academiaLogo.left}%`,
        top: `${layout.academiaLogo.top}%`,
        width: `${layout.academiaLogo.width}%`,
        opacity: layout.academiaLogo.opacity ?? 0.32,
        borderRadius: layout.academiaLogo.borderRadius ?? '22%',
        transform: 'translate(-50%, -50%)',
      }
    : null
  const rolLabel =
    isFestcup2026 && !rolOnTemplate ? credencialRolFestcup2026(c.modalidad) : null
  const categoriaLabel = isFestcup2026 ? formatCategoria(c.categoria) : ''

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className={`credencial-frente${isFestcup2026 ? ' credencial-frente--festcup2026' : ''}`}>
        <img src={plantillaSrc} alt="" className="cred-plantilla-bg" />

        {isFestcup2026 && c.academia_logo_url && academiaLogoStyle ? (
          <img
            src={c.academia_logo_url}
            alt=""
            className="cred-academia-logo"
            style={academiaLogoStyle}
          />
        ) : null}

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

        {rolOnTemplate ? (
          <>
            <p className="cred-datos-nombre cred-festcup-nombre" style={nombreZoneStyle || undefined}>
              {nombre || 'COMPETIDOR'}
            </p>
            {categoriaLabel ? (
              <p
                className="cred-datos-categoria-festcup cred-festcup-categoria"
                style={categoriaZoneStyle || undefined}
              >
                {categoriaLabel}
              </p>
            ) : null}
          </>
        ) : (
          <div
            className={`cred-datos-slot${isFestcup2026 ? ' cred-datos-slot--festcup' : ''}`}
            style={datosStyle}
          >
            {isFestcup2026 ? (
              <>
                {rolLabel ? <p className="cred-datos-rol">{rolLabel}</p> : null}
                <p className="cred-datos-nombre">{nombre || 'COMPETIDOR'}</p>
                {categoriaLabel ? (
                  <p className="cred-datos-categoria-festcup">{categoriaLabel}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="cred-datos-nombre">{nombre || 'COMPETIDOR'}</p>
                <p className="cred-datos-categoria">{formatCategoria(c.categoria)}</p>
                <p className="cred-datos-extra">
                  {c.dorsal}
                  {c.academia ? ` · ${c.codigo_academia ? `${c.codigo_academia}. ` : ''}${c.academia}` : ''}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
