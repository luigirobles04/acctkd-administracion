'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FESTCUP_STATS,
  FESTCUP_EDICIONES,
  FESTCUP_GALERIA,
  FESTCUP_RAZONES,
} from '@/lib/campeonato/landing-data'
import './landing.css'

function useReveal() {
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
      { threshold: 0.1 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
}

function fmtFecha(d) {
  if (!d) return 'Por confirmar'
  try {
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return d
  }
}

const CFG_DEFAULTS = {
  heroBadge: 'Trujillo · Perú · #UniendoCampeones',
  heroTitulo: 'Taekwondo',
  heroTituloAccent: 'FestCup 2026',
  heroSubtitulo:
    'La marca de campeonato más importante del norte del Perú. Cuatro ediciones formando campeones ' +
    'con reglamento World Taekwondo, tecnología en vivo y la experiencia ACCTKD que ya conoces.',
  ctaPrimario: 'Inscribir mi academia',
  ctaSecundario: 'Ver ediciones',
  heroImagen: null,
  ctaTitulo: '¿Tu academia compite en FestCup?',
  ctaTexto:
    'Únete a las academias que ya confían en la marca FestCup. Inscripción en línea, dorsales automáticos ' +
    'y resultados en tiempo real desde el primer combate.',
}

export default function LandingPage() {
  const [camps, setCamps] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [cfg, setCfg] = useState(CFG_DEFAULTS)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const navRef = useRef(null)
  useReveal()

  useEffect(() => {
    fetch('/api/public/campeonatos', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setCamps(j.campeonatos || []))
      .catch(() => setCamps([]))
      .finally(() => setLoaded(true))
    fetch('/api/landing', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => j.config && setCfg({ ...CFG_DEFAULTS, ...j.config }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  const heroImgSrc = cfg.heroImagen
    ? `/api/fotos/competidor?path=${encodeURIComponent(cfg.heroImagen)}`
    : '/landing/festcup-2026-flyer.png'

  const destacado = camps.find((c) => c.inscripciones_abiertas) || camps[0] || null
  const edicionActual = FESTCUP_EDICIONES.find((e) => e.highlight) || FESTCUP_EDICIONES[0]
  const edicionesPasadas = FESTCUP_EDICIONES.filter((e) => !e.highlight)

  const galeriaItems = (cfg.galeria?.length ? cfg.galeria : FESTCUP_GALERIA).map((g) => ({
    ...g,
    src: g.path
      ? `/api/fotos/competidor?path=${encodeURIComponent(g.path)}`
      : g.src,
  }))

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <Link href="/" className="lp-brand">
          <img src="/branding/academia-logo.png" alt="Christopher Cabrera Taekwondo" />
          <span className="lp-brand-txt">
            FEST<span className="lp-brand-red">CUP</span>
            <small>by ACCTKD · Trujillo</small>
          </span>
        </Link>
        <div className={`lp-nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#legado" onClick={() => setMenuOpen(false)}>Legado</a>
          <a href="#galeria" onClick={() => setMenuOpen(false)}>Galería</a>
          <a href="#campeonatos" onClick={() => setMenuOpen(false)}>Campeonatos</a>
          <a href="#inscribete" onClick={() => setMenuOpen(false)}>Inscríbete</a>
          <Link href="/login" className="lp-btn lp-btn-ghost" onClick={() => setMenuOpen(false)}>ERP</Link>
          <Link href="/registro-academia" className="lp-btn lp-btn-primary" onClick={() => setMenuOpen(false)}>
            Inscribir academia
          </Link>
        </div>
        <button type="button" className="lp-nav-toggle" aria-label="Menú" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-hero-bg" aria-hidden />
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
              <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-lg">
                {cfg.ctaPrimario} →
              </Link>
              <a href="#legado" className="lp-btn lp-btn-ghost lp-btn-lg">{cfg.ctaSecundario}</a>
            </div>
            <div className="lp-hero-meta lp-anim-4">
              {FESTCUP_STATS.map((s) => (
                <div key={s.label}>
                  <b>{s.value}{s.suffix}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-hero-visual lp-anim-2">
            <div className="lp-hero-poster">
              <img src={heroImgSrc} alt="Taekwondo FestCup 2026" />
            </div>
            <div className="lp-hero-float-card">
              <span className="lp-hero-float-tag">Próxima edición</span>
              <strong>{edicionActual.title}</strong>
              <span>{edicionActual.subtitle}</span>
            </div>
          </div>
        </div>
        <div className="lp-marquee" aria-hidden>
          <div className="lp-marquee-track">
            {[...Array(2)].map((_, i) => (
              <span key={i}>
                FESTCUP · TRUJILLO · WORLD TAEKWONDO · KYORUGI · POOMSAE · FREE STYLE · #UniendoCampeones · ACCTKD ·
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* LOGOS STRIP */}
      <section className="lp-logos-strip">
        <div className="lp-container lp-logos-inner reveal">
          <img src="/branding/wt-logo.png" alt="World Taekwondo" />
          <img src="/branding/academia-logo.png" alt="Christopher Cabrera Taekwondo" />
          <span className="lp-logos-text">Reglamentado por World Taekwondo · Organizado por ACCTKD</span>
        </div>
      </section>

      {/* LEGADO / EDICIONES */}
      <section className="lp-section" id="legado">
        <div className="lp-container">
          <p className="lp-kicker reveal">Nuestra historia</p>
          <h2 className="lp-h2 reveal d1">El legado FestCup</h2>
          <p className="lp-lead reveal d1">
            Desde 2022, FestCup reúne a academias de todo el Perú en Trujillo. Cada edición deja huella —
            campeones, recuerdos y la pasión del taekwondo en su máxima expresión.
          </p>

          {/* Edición destacada */}
          <article className="lp-edition-featured reveal d2">
            <div className="lp-edition-featured-img">
              <img src={edicionActual.imagen} alt={edicionActual.title} />
              <span className="lp-edition-year">{edicionActual.year}</span>
            </div>
            <div className="lp-edition-featured-body">
              <span className="lp-badge open">{edicionActual.tag}</span>
              <h3>{edicionActual.title}</h3>
              <p className="lp-edition-sub">{edicionActual.subtitle}</p>
              <p className="lp-edition-desc">{edicionActual.desc}</p>
              <div className="lp-hero-cta">
                <Link href="/registro-academia" className="lp-btn lp-btn-primary">Inscribir mi academia</Link>
                {destacado && (
                  <Link href={`/campeonato/${destacado.slug}`} className="lp-btn lp-btn-ghost">Ver evento en vivo</Link>
                )}
              </div>
            </div>
          </article>

          {/* Timeline ediciones pasadas */}
          <div className="lp-timeline reveal d3">
            {edicionesPasadas.map((ed) => (
              <article className="lp-timeline-item" key={ed.year}>
                <div className="lp-timeline-dot" />
                <div className="lp-timeline-card">
                  <div className="lp-timeline-img">
                    <img src={ed.imagen} alt={ed.title} loading="lazy" />
                  </div>
                  <div className="lp-timeline-body">
                    <span className="lp-timeline-year">{ed.year}</span>
                    <h4>{ed.title}</h4>
                    <p className="lp-timeline-sub">{ed.subtitle}</p>
                    <p>{ed.desc}</p>
                    <span className="lp-timeline-tag">{ed.tag}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      <section className="lp-section alt" id="galeria">
        <div className="lp-container">
          <p className="lp-kicker reveal">Momentos FestCup</p>
          <h2 className="lp-h2 reveal d1">La emoción del campeonato</h2>
          <p className="lp-lead reveal d1">
            Combates, podios, credenciales y la energía de cientos de competidores dándolo todo en el tatami.
          </p>
          <div className="lp-gallery">
            {galeriaItems.map((g, i) => (
              <button
                type="button"
                key={g.src}
                className={`lp-gallery-item reveal d${(i % 4) + 1} ${i === 0 ? 'wide' : ''}`}
                onClick={() => setLightbox(g)}
                aria-label={`Ver ${g.caption}`}
              >
                <img src={g.src} alt={g.alt} loading="lazy" />
                <span className="lp-gallery-cap">{g.caption}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ FESTCUP */}
      <section className="lp-section" id="inscribete">
        <div className="lp-container">
          <p className="lp-kicker reveal">Para academias</p>
          <h2 className="lp-h2 reveal d1">¿Por qué inscribirte en FestCup?</h2>
          <div className="lp-reasons">
            {FESTCUP_RAZONES.map((r, i) => (
              <div className={`lp-reason reveal d${(i % 4) + 1}`} key={r.title}>
                <span className="lp-reason-ic">{r.ic}</span>
                <h4>{r.title}</h4>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPEONATOS ACTIVOS (API) */}
      <section className="lp-section alt" id="campeonatos">
        <div className="lp-container">
          <p className="lp-kicker reveal">En curso</p>
          <h2 className="lp-h2 reveal d1">Campeonatos activos</h2>
          <p className="lp-lead reveal d1">
            Consulta resultados, descarga llaves, sigue las peleas en TV en vivo e inscribe a tu academia.
          </p>

          {!loaded ? (
            <p className="lp-lead reveal">Cargando campeonatos…</p>
          ) : camps.length === 0 ? (
            <p className="lp-lead reveal">Pronto anunciaremos el próximo campeonato. ¡Mantente atento!</p>
          ) : (
            <div className="lp-cards">
              {camps.map((c, i) => (
                <article className={`lp-card reveal d${(i % 3) + 1}`} key={c.id_campeonato}>
                  <div className="lp-card-cover">
                    <img
                      src={c.foto_url || '/landing/festcup-2026-flyer.png'}
                      alt={c.nombre}
                      loading="lazy"
                    />
                  </div>
                  <div className="lp-card-top">
                    <h3>{c.nombre}</h3>
                    <span className={`lp-badge ${c.inscripciones_abiertas ? 'open' : 'soon'}`}>
                      {c.inscripciones_abiertas ? 'Inscripciones' : c.estado || 'Próximo'}
                    </span>
                  </div>
                  <div className="lp-card-meta">
                    <span>📅 {fmtFecha(c.fecha_inicio)}</span>
                    {(c.ciudad || c.lugar) && <span>📍 {c.lugar || c.ciudad}</span>}
                  </div>
                  <div className="lp-card-actions">
                    {c.inscripciones_abiertas && (
                      <Link href={`/registro-academia?slug=${c.slug}`} className="lp-chip primary">Inscribirse</Link>
                    )}
                    <Link href={`/campeonato/${c.slug}`} className="lp-chip">Ver evento</Link>
                    <Link href={`/campeonato/${c.slug}/podios`} className="lp-chip">Resultados</Link>
                    <Link href={`/campeonato/${c.slug}/canchas`} className="lp-chip">TV en vivo</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ACCESOS RÁPIDOS */}
      <section className="lp-section" id="accesos">
        <div className="lp-container">
          <p className="lp-kicker reveal">Acceso rápido</p>
          <h2 className="lp-h2 reveal d1">Todo el evento, a un clic</h2>
          <div className="lp-access">
            <Link href={destacado ? `/campeonato/${destacado.slug}/canchas` : '#campeonatos'} className="reveal d1">
              <span className="ic">📺</span><b>TV en vivo</b><span>Peleas por área en tiempo real</span>
            </Link>
            <Link href={destacado ? `/campeonato/${destacado.slug}/podios` : '#campeonatos'} className="reveal d2">
              <span className="ic">🏆</span><b>Resultados & Podios</b><span>Medallero actualizado</span>
            </Link>
            <Link href="/registro-academia" className="reveal d3">
              <span className="ic">📝</span><b>Inscripción</b><span>Registra a tu academia ahora</span>
            </Link>
            <Link href="/login" className="reveal d4">
              <span className="ic">⚙️</span><b>Panel ERP</b><span>Organizadores y staff</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="lp-section">
        <div className="lp-cta-band reveal">
          <div className="lp-cta-logos">
            <img src="/branding/academia-logo.png" alt="ACCTKD" />
            <img src="/branding/wt-logo.png" alt="WT" />
          </div>
          <h2>{cfg.ctaTitulo}</h2>
          <p>{cfg.ctaTexto}</p>
          <div className="lp-hero-cta">
            <Link href="/registro-academia" className="lp-btn lp-btn-primary lp-btn-lg">{cfg.ctaPrimario}</Link>
            <Link href="/login" className="lp-btn lp-btn-ghost">Acceso organizadores</Link>
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
              <span>by Academia Christopher Cabrera Taekwondo</span>
            </div>
          </div>
          <div className="lp-footer-links">
            <a href="#legado">Legado</a>
            <a href="#galeria">Galería</a>
            <a href="#campeonatos">Campeonatos</a>
            <Link href="/registro-academia">Inscripción</Link>
            <Link href="/login">ERP</Link>
          </div>
          <div className="logos">
            <img src="/branding/wt-logo.png" alt="World Taekwondo" />
          </div>
          <small>
            © {new Date().getFullYear()} Academia Christopher Cabrera Taekwondo · Taekwondo FestCup · Trujillo, Perú<br />
            Reglamentado por World Taekwondo · #UniendoCampeones
          </small>
        </div>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div className="lp-lightbox" role="dialog" onClick={() => setLightbox(null)}>
          <button type="button" className="lp-lightbox-close" aria-label="Cerrar">✕</button>
          <img src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} />
          <p>{lightbox.caption}</p>
        </div>
      )}
    </div>
  )
}
