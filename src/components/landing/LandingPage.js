'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FESTCUP_STATS,
  FESTCUP_LEGADO,
  FESTCUP_POSTERS,
  FESTCUP_MOMENTOS,
  FESTCUP_RAZONES,
} from '@/lib/campeonato/landing-data'
import './landing.css'

function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useCounters(active) {
  const [vals, setVals] = useState(FESTCUP_STATS.map(() => 0))
  useEffect(() => {
    if (!active) return
    const duration = 1400
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - (1 - t) ** 3
      setVals(FESTCUP_STATS.map((s) => Math.round(s.value * ease)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return vals
}

const CFG_DEFAULTS = {
  heroBadge: 'Trujillo · Perú · #UniendoCampeones',
  heroTitulo: 'Tu academia',
  heroTituloAccent: 'merece FestCup',
  heroSubtitulo:
    'El campeonato más grande del norte del Perú. Lleva a tus atletas a competir donde nacen los campeones — ' +
    'con la marca que ya conocen cientos de competidores.',
  ctaPrimario: 'Inscribir mi academia',
  ctaSecundario: 'Ver el legado',
  heroImagen: null,
  ctaTitulo: '¿Listos para el tatami?',
  ctaTexto:
    'No te quedes fuera. Inscribe a tu academia en FestCup 2026 y forma parte del campeonato que reúne ' +
    'a las mejores academias del país.',
}

export default function LandingPage() {
  const [cfg, setCfg] = useState(CFG_DEFAULTS)
  const [camps, setCamps] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const navRef = useRef(null)
  const statsRef = useRef(null)
  const counterVals = useCounters(statsVisible)
  useReveal([cfg])

  useEffect(() => {
    fetch('/api/landing', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => j.config && setCfg({ ...CFG_DEFAULTS, ...j.config }))
      .catch(() => {})
    fetch('/api/public/campeonatos', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setCamps(j.campeonatos || []))
      .catch(() => setCamps([]))
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 20)
      setShowSticky(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setStatsVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsVisible(true); io.disconnect() } },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const heroPoster = cfg.heroImagen
    ? `/api/fotos/competidor?path=${encodeURIComponent(cfg.heroImagen)}`
    : '/landing/galeria/festcup-2026-poster.png'

  const poster2026 = FESTCUP_LEGADO.find((e) => e.highlight) || FESTCUP_LEGADO[0]
  const campActivo = camps.find((c) => c.inscripciones_abiertas) || camps[0] || null
  const campSlug = campActivo?.slug
  const campNombre = campActivo?.nombre || 'FestCup'

  return (
    <div className="lp">
      {/* Orbes animados de fondo */}
      <div className="lp-orbs" aria-hidden>
        <span className="lp-orb lp-orb-1" />
        <span className="lp-orb lp-orb-2" />
        <span className="lp-orb lp-orb-3" />
      </div>

      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <Link href="/" className="lp-brand">
          <img src="/branding/academia-logo.png" alt="ACCTKD" />
          <span className="lp-brand-txt">
            FEST<span className="lp-brand-red">CUP</span>
            <small>Trujillo · Perú</small>
          </span>
        </Link>
        <div className={`lp-nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#ver-en-vivo" onClick={() => setMenuOpen(false)}>Ver en vivo</a>
          <a href="#legado" onClick={() => setMenuOpen(false)}>Legado</a>
          <a href="#por-que" onClick={() => setMenuOpen(false)}>¿Por qué?</a>
          <Link href="/login" className="lp-btn lp-btn-ghost" onClick={() => setMenuOpen(false)}>
            Ingresar
          </Link>
          <Link href="/registro-academia" className="lp-btn lp-btn-primary" onClick={() => setMenuOpen(false)}>
            Inscribir academia
          </Link>
        </div>
        <button type="button" className="lp-nav-toggle" aria-label="Menú" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* HERO — poster + CTA emocional */}
      <header className="lp-hero">
        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow lp-anim-1">
              <span className="dot" /> {cfg.heroBadge}
            </span>
            <h1 className="lp-h1 lp-anim-2">
              {cfg.heroTitulo}
              <span className="accent">{cfg.heroTituloAccent}</span>
            </h1>
            <p className="lp-sub lp-anim-3">{cfg.heroSubtitulo}</p>
            <div className="lp-hero-cta lp-anim-3">
              <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-shine">
                {cfg.ctaPrimario} →
              </Link>
              <a href="#legado" className="lp-btn lp-btn-ghost lp-btn-lg">{cfg.ctaSecundario}</a>
            </div>
            <div className="lp-hero-meta lp-anim-4" ref={statsRef}>
              {FESTCUP_STATS.map((s, i) => (
                <div key={s.label} className="lp-stat">
                  <b>{counterVals[i]}{s.suffix}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-hero-visual lp-anim-2">
            <div className="lp-hero-poster-wrap">
              <div className="lp-hero-glow" aria-hidden />
              <div className="lp-hero-poster">
                <img src={heroPoster} alt="Taekwondo FestCup 2026" />
              </div>
              <div className="lp-hero-badge-live">
                <span className="pulse" /> Inscripciones abiertas
              </div>
            </div>
          </div>
        </div>

        {/* Marquee de posters mini */}
        <div className="lp-poster-marquee" aria-hidden>
          <div className="lp-poster-marquee-track">
            {[...FESTCUP_POSTERS, ...FESTCUP_POSTERS].map((p, i) => (
              <img key={`${p.src}-${i}`} src={p.src} alt="" loading="lazy" />
            ))}
          </div>
        </div>
      </header>

      {/* WT strip */}
      <section className="lp-logos-strip">
        <div className="lp-container lp-logos-inner reveal">
          <img src="/branding/wt-logo.png" alt="World Taekwondo" />
          <span className="lp-logos-text">Reglamentado por World Taekwondo · Organizado por ACCTKD</span>
          <img src="/branding/academia-logo.png" alt="ACCTKD" />
        </div>
      </section>

      {/* ACCESO — academia inscrita + ver en vivo */}
      <section className="lp-acceso-section" id="ver-en-vivo">
        <div className="lp-container">
          <div className="lp-acceso-grid">
            <article className="lp-acceso-box reveal">
              <div className="lp-acceso-head">
                <span className="lp-acceso-icon">🥋</span>
                <div>
                  <p className="lp-kicker" style={{ margin: 0 }}>Academias</p>
                  <h3>¿Ya inscribiste tu academia?</h3>
                </div>
              </div>
              <p className="lp-acceso-desc">
                Ingresa con el DNI del representante para gestionar plantel, fotos, pagos y credenciales de tus competidores.
              </p>
              <div className="lp-acceso-actions">
                <Link href="/login" className="lp-btn lp-btn-primary lp-btn-shine">
                  Ingresar al sistema →
                </Link>
                <Link href="/portal" className="lp-acceso-link">Portal de academias</Link>
              </div>
            </article>

            <article className="lp-acceso-box lp-acceso-vivo reveal d1">
              <div className="lp-acceso-head">
                <span className="lp-acceso-icon">📺</span>
                <div>
                  <p className="lp-kicker" style={{ margin: 0 }}>Público</p>
                  <h3>Ver el campeonato en vivo</h3>
                </div>
              </div>
              <p className="lp-acceso-desc">
                {campActivo
                  ? `Sigue ${campNombre}: peleas por área, podios, llaves y resultados actualizados.`
                  : 'Cuando el evento esté activo podrás seguir las peleas y resultados aquí.'}
              </p>
              {campSlug ? (
                <div className="lp-acceso-chips">
                  <Link href={`/campeonato/${campSlug}/canchas`} className="lp-acceso-chip live">
                    <b>📺 TV en vivo</b>
                    <span>Peleas por área</span>
                  </Link>
                  <Link href={`/campeonato/${campSlug}/podios`} className="lp-acceso-chip">
                    <b>🏆 Resultados</b>
                    <span>Podios y medallero</span>
                  </Link>
                  <Link href={`/campeonato/${campSlug}`} className="lp-acceso-chip">
                    <b>📋 Evento</b>
                    <span>Info · Bases · Llaves</span>
                  </Link>
                </div>
              ) : (
                <p className="lp-acceso-desc" style={{ marginTop: 12, opacity: 0.7 }}>
                  Próximamente disponible cuando abra el campeonato.
                </p>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* LEGADO — posters grandes edición por edición */}
      <section className="lp-legado-section" id="legado">
        <div className="lp-container lp-legado-intro">
          <p className="lp-kicker reveal">Nuestra historia</p>
          <h2 className="lp-h2 reveal d1">El legado FestCup</h2>
          <p className="lp-lead reveal d1">
            Desde 2022, edición tras edición, FestCup reúne a academias de todo el Perú en Trujillo.
            <strong> Cuatro años uniendo campeones.</strong> Cada poster cuenta una historia — la tuya empieza en 2026.
          </p>
        </div>

        {/* Carrusel horizontal de posters gigantes */}
        <div className="lp-legado-scroll reveal d2">
          <div className="lp-legado-scroll-hint">← Desliza para ver cada edición →</div>
          <div className="lp-legado-scroll-track">
            {FESTCUP_LEGADO.map((ed) => (
              <article
                key={ed.year + ed.poster}
                className={`lp-legado-slide ${ed.highlight ? 'current' : ''}`}
              >
                <button
                  type="button"
                  className="lp-legado-slide-poster"
                  onClick={() => setLightbox({ src: ed.poster, alt: ed.alt, caption: ed.title })}
                >
                  <span className="lp-legado-slide-glow" aria-hidden />
                  <img src={ed.poster} alt={ed.alt} loading="lazy" />
                  <span className="lp-legado-slide-year">{ed.year}</span>
                </button>
                <div className="lp-legado-slide-info">
                  <span className={`lp-badge ${ed.highlight ? 'open' : ''}`}>{ed.tag}</span>
                  <h3>{ed.title}</h3>
                  <p>{ed.fecha} · {ed.lugar}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Timeline vertical — poster + texto alternado */}
        <div className="lp-legado-timeline">
          {FESTCUP_LEGADO.map((ed, i) => (
            <article
              key={`tl-${ed.year}`}
              className={`lp-legado-block reveal ${i % 2 === 1 ? 'reverse' : ''} ${ed.highlight ? 'highlight' : ''}`}
            >
              <div className="lp-legado-block-year" aria-hidden>{ed.year}</div>
              <button
                type="button"
                className="lp-legado-block-poster"
                onClick={() => setLightbox({ src: ed.poster, alt: ed.alt, caption: ed.title })}
              >
                <span className="lp-legado-block-glow" aria-hidden />
                <img src={ed.poster} alt={ed.alt} loading="lazy" />
              </button>
              <div className="lp-legado-block-body">
                <span className="lp-legado-node">{ed.year}</span>
                <span className={`lp-badge ${ed.highlight ? 'open' : ''}`}>{ed.tag}</span>
                <h3>{ed.title}</h3>
                <p className="lp-legado-fecha">{ed.fecha}</p>
                <p className="lp-legado-lugar">{ed.lugar}</p>
                <p className="lp-legado-desc">{ed.desc}</p>
                {ed.highlight ? (
                  <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-shine">
                    Inscribir mi academia →
                  </Link>
                ) : (
                  <span className="lp-legado-tag-pill">{ed.tag}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* MOMENTOS — emoción del evento */}
      <section className="lp-section alt" id="momentos">
        <div className="lp-container">
          <p className="lp-kicker reveal">Así se vive FestCup</p>
          <h2 className="lp-h2 reveal d1">Esto es lo que tus atletas van a recordar</h2>
          <p className="lp-lead reveal d1">
            Podios, medallas, el grito de la grada y la emoción de competir al máximo nivel en Trujillo.
          </p>
          <div className="lp-momentos">
            {FESTCUP_MOMENTOS.map((m, i) => (
              <button
                type="button"
                key={m.src}
                className={`lp-momento reveal d${(i % 4) + 1} ${i === 0 ? 'wide' : ''}`}
                onClick={() => setLightbox(m)}
              >
                <img src={m.src} alt={m.alt} loading="lazy" />
                <span>{m.caption}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ INSCRIBIRSE */}
      <section className="lp-section lp-porque-section" id="por-que">
        <div className="lp-container">
          <p className="lp-kicker reveal">Para academias</p>
          <h2 className="lp-h2 reveal d1">¿Por qué inscribirte en FestCup?</h2>
          <p className="lp-lead reveal d1">
            No es solo un campeonato — es <strong>4 años de experiencia</strong>, organización de primer nivel
            y la marca que está <strong>#UniendoCampeones</strong> en todo el norte del Perú.
          </p>
          <div className="lp-reasons">
            {FESTCUP_RAZONES.map((r, i) => (
              <div className={`lp-reason reveal d${(i % 4) + 1}`} key={r.title}>
                <span className="lp-reason-stat">{r.stat}</span>
                <span className="lp-reason-ic">{r.ic}</span>
                <h4>{r.title}</h4>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
          <div className="lp-hashtag-banner reveal d3">
            <span className="lp-hashtag">#UniendoCampeones</span>
            <p>Únete a las academias que ya confían en FestCup</p>
            <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-shine">
              Inscribir mi academia →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL con poster */}
      <section className="lp-section">
        <div className="lp-cta-final reveal">
          <div className="lp-cta-final-poster">
            <img src={poster2026.poster} alt="FestCup 2026" />
          </div>
          <div className="lp-cta-final-body">
            <img src="/branding/wt-logo.png" alt="WT" className="lp-cta-wt" />
            <h2>{cfg.ctaTitulo}</h2>
            <p>{cfg.ctaTexto}</p>
            <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-xl lp-btn-shine">
              {cfg.ctaPrimario} →
            </Link>
            <span className="lp-cta-note">Coliseo Gran Chimú · Trujillo · World Taekwondo</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <img src="/branding/academia-logo.png" alt="ACCTKD" />
            <div>
              <strong>FESTCUP</strong>
              <span>Academia Christopher Cabrera Taekwondo</span>
            </div>
          </div>
          <div className="lp-footer-links">
            <Link href="/registro-academia">Inscribir academia</Link>
            <Link href="/login">Academia inscrita</Link>
            <a href="#ver-en-vivo">Ver en vivo</a>
            <a href="#legado">Legado</a>
            <Link href="/login">Organizadores</Link>
          </div>
          <small>
            © {new Date().getFullYear()} FestCup · Trujillo, Perú · #UniendoCampeones
          </small>
        </div>
      </footer>

      {/* Sticky CTA móvil */}
      <div className={`lp-sticky-cta ${showSticky ? 'visible' : ''}`}>
        <span>FestCup 2026 · Inscripciones abiertas</span>
        <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-shine">
          Inscribir →
        </Link>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lp-lightbox lp-lightbox-in" role="dialog" onClick={() => setLightbox(null)}>
          <button type="button" className="lp-lightbox-close" aria-label="Cerrar">✕</button>
          <img src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} />
          {lightbox.caption && <p>{lightbox.caption}</p>}
        </div>
      )}
    </div>
  )
}
