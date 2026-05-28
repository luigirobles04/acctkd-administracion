'use client'

import { useEffect, useMemo, useState } from 'react'

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

export default function CredencialCard({ competidor: c }) {
  const [fotoOk, setFotoOk] = useState(Boolean(c.foto_url))
  const nombre = useMemo(() => formatNombre(c.nombres), [c.nombres])

  useEffect(() => {
    setFotoOk(Boolean(c.foto_url))
  }, [c.foto_url])

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className="credencial-frente">
        <img
          src="/credenciales/plantilla-frente.png"
          alt=""
          className="cred-plantilla-bg"
        />

        {/* Foto en el círculo blanco de la plantilla */}
        <div className="cred-foto-slot">
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

        {/* Tapar "JUEZ" y poner datos del participante */}
        <div className="cred-datos-slot">
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
