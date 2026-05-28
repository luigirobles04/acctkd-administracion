'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

function modalidadLabel(modalidad) {
  if (modalidad === 'poomsae_individual' || modalidad === 'poomsae') return 'POOMSAE'
  return 'KYORUGUI'
}

function formatCategoria(nombre) {
  return (nombre || '').toUpperCase().replace(/\s+/g, '_')
}

function ubicacionEvento(campeonato) {
  const ciudad = (campeonato?.ciudad || '').trim()
  const lugar = (campeonato?.lugar || '').trim()
  if (ciudad && lugar) return `${lugar} · ${ciudad}`.toUpperCase()
  return (ciudad || lugar || 'EVENTO OFICIAL').toUpperCase()
}

export default function CredencialCard({ competidor: c, campeonato, dia = 1 }) {
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(c.qr_data || String(c.dorsal || c.id_linea), {
      width: 128,
      margin: 0,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [c.qr_data, c.dorsal, c.id_linea])

  const cancha = c.cancha || null

  return (
    <article className="credencial-sheet" data-academia={c.id_academia_campeonato}>
      <div className="credencial-card">
        <header className="credencial-header">
          <div className="credencial-header-top">T A E K W O N D O</div>
          <div className="credencial-header-row">
            <div className="credencial-header-left">
              <span className="credencial-peru">PERÚ</span>
              <strong>CAMPEONATO</strong>
              <strong>NACIONAL</strong>
            </div>
            <div className="credencial-header-center">
              <div className="credencial-helmets" aria-hidden>
                <span className="helmet blue" />
                <span className="helmet red" />
              </div>
              <span className="credencial-disciplina">{modalidadLabel(c.modalidad)}</span>
            </div>
            <div className="credencial-header-right">
              <span className="credencial-lugar">{ubicacionEvento(campeonato)}</span>
              <span className="credencial-dia">DÍA {String(dia).padStart(2, '0')}</span>
            </div>
          </div>
        </header>

        <div className="credencial-body">
          <div className="credencial-photo-wrap">
            {c.foto_url ? (
              <img src={c.foto_url} alt="" className="credencial-photo" />
            ) : (
              <div className="credencial-photo credencial-photo-empty">SIN FOTO</div>
            )}
          </div>

          <div className="credencial-info">
            <h2 className="credencial-nombre">{c.nombres}</h2>
            <p className="credencial-rol">COMPETITOR</p>
            <p className="credencial-academia">
              {c.codigo_academia ? `${c.codigo_academia}. ` : ''}
              {c.academia}
            </p>
          </div>

          <div className="credencial-qr-wrap">
            {qrSrc ? <img src={qrSrc} alt="" className="credencial-qr" /> : <div className="credencial-qr credencial-qr-loading" />}
            <span className="credencial-dorsal-num">{c.dorsal_numero || c.dorsal}</span>
          </div>

          <p className="credencial-categoria">{formatCategoria(c.categoria)}</p>
        </div>

        <footer className="credencial-footer">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`credencial-cancha-badge cancha-${n}${cancha === n ? ' activa' : ''}`}
            >
              {n}
            </span>
          ))}
        </footer>
      </div>
    </article>
  )
}
