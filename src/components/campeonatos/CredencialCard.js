'use client'

import { useEffect, useMemo, useState } from 'react'

function formatNombre(nombre) {
  if (!nombre) return ''
  return nombre
    .trim()
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase()
      if (['de', 'del', 'la', 'los', 'las', 'y'].includes(lower)) return lower
      if (part.length <= 3) return part.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function iniciales(nombre) {
  const parts = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('')
}

function anioEvento(campeonato) {
  const f = campeonato?.fecha_inicio
  if (!f) return String(new Date().getFullYear()).slice(-2)
  const y = new Date(f).getFullYear()
  return String(y).slice(-2)
}

function tituloEvento(campeonato) {
  const n = (campeonato?.nombre || 'ACCTKD').toUpperCase()
  if (n.includes('FEST')) return n.replace(/^TAEKWONDO\s*/i, '').trim() || n
  return n.length > 18 ? n.split(/\s+/).slice(0, 2).join(' ') : n
}

function formatCategoria(nombre) {
  return (nombre || '').toUpperCase().replace(/\s+/g, ' ')
}

export default function CredencialCard({ competidor: c, campeonato }) {
  const [fotoOk, setFotoOk] = useState(Boolean(c.foto_url))
  const nombreBonito = useMemo(() => formatNombre(c.nombres), [c.nombres])
  const anio = anioEvento(campeonato)
  const subtitulo = tituloEvento(campeonato)

  useEffect(() => {
    setFotoOk(Boolean(c.foto_url))
  }, [c.foto_url])

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className="credencial-par">
        {/* ── FRENTE ── */}
        <div className="credencial-frente">
          <div className="cred-fest-bg" aria-hidden />
          <div className="cred-fest-hangul cred-fest-hangul--izq" aria-hidden>태권도</div>
          <div className="cred-fest-hangul cred-fest-hangul--der" aria-hidden>跆拳道</div>

          <header className="cred-fest-header">
            <div className="cred-fest-kicker" aria-hidden>🥋</div>
            <p className="cred-fest-taekwondo">TAEKWONDO</p>
            <p className="cred-fest-evento">{subtitulo}</p>
            <p className="cred-fest-anio">{anio}</p>
          </header>

          <div className="cred-fest-foto-ring">
            {c.foto_url && fotoOk ? (
              <img
                src={c.foto_url}
                alt=""
                className="cred-fest-foto"
                onError={() => setFotoOk(false)}
              />
            ) : (
              <div className="cred-fest-foto cred-fest-foto--empty">
                <span>{iniciales(c.nombres)}</span>
              </div>
            )}
          </div>

          <div className="cred-fest-datos">
            <p className="cred-fest-nombre">{nombreBonito || 'Competidor'}</p>
            <p className="cred-fest-rol">COMPETITOR</p>
            <p className="cred-fest-categoria">{formatCategoria(c.categoria)}</p>
            <p className="cred-fest-meta">
              <span className="cred-fest-dorsal">{c.dorsal}</span>
              {c.academia && (
                <>
                  <span className="cred-fest-sep">·</span>
                  <span className="cred-fest-academia">
                    {c.codigo_academia ? `${c.codigo_academia}. ` : ''}
                    {c.academia}
                  </span>
                </>
              )}
            </p>
          </div>

          <footer className="cred-fest-footer">
            <img src="/logo-cctkd.png" alt="" className="cred-fest-logo" />
            <span className="cred-fest-footer-text">ACCTKD</span>
          </footer>
        </div>

        {/* ── REVERSO (sponsors fijos) ── */}
        <div className="credencial-reverso">
          <img
            src="/credenciales/reverso-sponsors.png"
            alt=""
            className="cred-reverso-img"
          />
        </div>
      </div>
    </article>
  )
}
