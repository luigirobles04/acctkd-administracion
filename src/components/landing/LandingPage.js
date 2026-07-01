'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
      { threshold: 0.12 }
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

const FEATURES = [
  {
    ic: '⚡',
    h: 'Llaves al instante',
    p: 'Brackets de kyorugi generados automáticamente tras el pesaje, con numeración de combates por área.',
    items: ['Sorteo de siembra automático', 'Exportación por cancha 1 · 2 · 3', 'PDF y Excel con logos oficiales'],
  },
  {
    ic: '⚖️',
    h: 'Pesaje digital',
    p: 'Control de pesaje seguro, con filtros por categoría y academia e informes exportables.',
    items: ['Recategorización asistida', 'Historial de intentos', 'Lista exportable en Excel y PDF'],
  },
  {
    ic: '📺',
    h: 'Resultados en vivo',
    p: 'Pantallas por área con combates en curso, próximos y podios que se actualizan en tiempo real.',
    items: ['Seguimiento por pista', 'Podios automáticos', 'Nombres y fotos de competidores'],
  },
  {
    ic: '🏫',
    h: 'Inscripción por academia',
    p: 'Cada academia gestiona su plantel, dorsales y pagos desde su propio portal.',
    items: ['Perfiles reutilizables', 'Validación de licencias', 'Credenciales digitales'],
  },
]

export default function LandingPage() {
  const [camps, setCamps] = useState([])
  const [loaded, setLoaded] = useState(false)
  const navRef = useRef(null)
  useReveal()

  useEffect(() => {
    fetch('/api/public/campeonatos', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setCamps(j.campeonatos || []))
      .catch(() => setCamps([]))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const destacado = camps.find((c) => c.inscripciones_abiertas) || camps[0] || null

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="lp-nav" ref={navRef}>
        <Link href="/" className="lp-brand">
          <img src="/branding/academia-logo.png" alt="Christopher Cabrera Taekwondo" />
          <span className="lp-brand-txt">
            ACCTKD
            <small>TAEKWONDO FESTCUP</small>
          </span>
        </Link>
        <div className="lp-nav-links">
          <a href="#campeonatos">Campeonatos</a>
          <a href="#plataforma">Plataforma</a>
          <a href="#accesos">Resultados & TV</a>
          <Link href="/login" className="lp-btn lp-btn-ghost">Entrar al ERP</Link>
          <Link href="/registro-academia" className="lp-btn lp-btn-primary">Inscríbete</Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-hero-grid">
          <div>
            <span className="lp-eyebrow lp-anim-1"><span className="dot" /> Trujillo · Perú · Uniendo Campeones</span>
            <h1 className="lp-h1 lp-anim-2">
              Taekwondo
              <span className="accent">FestCup 2026</span>
            </h1>
            <p className="lp-sub lp-anim-3">
              El evento más importante de la Academia Christopher Cabrera. Poomsae, Kyorugi y Free Style
              gestionados con tecnología de vanguardia: inscripción, pesaje, llaves y resultados en vivo,
              sin margen de error.
            </p>
            <div className="lp-hero-cta lp-anim-3">
              <Link href="/registro-academia" className="lp-btn lp-btn-primary">Inscribir mi academia →</Link>
              <a href="#campeonatos" className="lp-btn lp-btn-ghost">Ver campeonatos</a>
            </div>
            <div className="lp-hero-meta lp-anim-4">
              <div><b>+4</b><span>Ediciones</span></div>
              <div><b>3</b><span>Áreas simultáneas</span></div>
              <div><b>WT</b><span>Reglamento oficial</span></div>
            </div>
          </div>
          <div className="lp-hero-poster lp-anim-2">
            <img src="/branding/festcup-2026-flyer.png" alt="Taekwondo FestCup 2026" />
          </div>
        </div>
      </header>

      {/* CAMPEONATOS */}
      <section className="lp-section" id="campeonatos">
        <div className="lp-container">
          <p className="lp-kicker reveal">Campeonatos</p>
          <h2 className="lp-h2 reveal d1">Compite en el FestCup</h2>
          <p className="lp-lead reveal d1">
            Revisa los campeonatos, inscríbete, consulta resultados, descarga las llaves y sigue las peleas en vivo.
          </p>

          {!loaded ? (
            <p className="lp-lead reveal">Cargando campeonatos…</p>
          ) : camps.length === 0 ? (
            <p className="lp-lead reveal">Pronto anunciaremos el próximo campeonato. ¡Mantente atento!</p>
          ) : (
            <div className="lp-cards">
              {camps.map((c, i) => (
                <article className={`lp-card reveal d${(i % 3) + 1}`} key={c.id_campeonato}>
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

      {/* PLATAFORMA */}
      <section className="lp-section alt" id="plataforma">
        <div className="lp-container">
          <p className="lp-kicker reveal">Plataforma</p>
          <h2 className="lp-h2 reveal d1">Tecnología de vanguardia para tu torneo</h2>
          <p className="lp-lead reveal d1">
            Automatizamos cada etapa del evento —inscripción, pesaje, llaves, combates y podios— reduciendo
            errores y agilizando la experiencia para competidores y organizadores.
          </p>
          <div className="lp-features">
            {FEATURES.map((f, i) => (
              <div className={`lp-feature reveal d${(i % 4) + 1}`} key={f.h}>
                <div className="ic">{f.ic}</div>
                <h4>{f.h}</h4>
                <p>{f.p}</p>
                <ul>{f.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESOS */}
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
            <a href="#campeonatos" className="reveal d3">
              <span className="ic">🗂️</span><b>Llaves</b><span>Descarga los brackets en PDF</span>
            </a>
            <Link href="/registro-academia" className="reveal d4">
              <span className="ic">📝</span><b>Inscripción</b><span>Registra a tu academia</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section">
        <div className="lp-cta-band reveal">
          <h2>¿Listo para competir?</h2>
          <p>Inscribe a tu academia en el Taekwondo FestCup 2026 y forma parte de la mejor experiencia de taekwondo del norte del país.</p>
          <div className="lp-hero-cta">
            <Link href="/registro-academia" className="lp-btn lp-btn-primary">Inscribir mi academia</Link>
            <Link href="/login" className="lp-btn lp-btn-ghost">Acceso organizadores</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="logos">
            <img src="/branding/academia-logo.png" alt="Christopher Cabrera Taekwondo" />
            <img src="/branding/wt-logo.png" alt="World Taekwondo" />
          </div>
          <small>
            © {new Date().getFullYear()} Academia Christopher Cabrera Taekwondo · Taekwondo FestCup · Trujillo, Perú<br />
            Reglamentado por World Taekwondo · #UniendoCampeones
          </small>
        </div>
      </footer>
    </div>
  )
}
