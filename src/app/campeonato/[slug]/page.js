'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PortalLayout from '@/components/campeonatos/PortalLayout'
import { formatFecha } from '@/lib/utils/format'
import { FESTCUP_DOCS, FESTCUP_VENUE } from '@/lib/site-config'

export default function CampeonatoPublicoPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`/api/inscripcion/campeonato/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [slug])

  const camp = data?.campeonato

  return (
    <PortalLayout titulo={camp?.nombre || 'Campeonato'} subtitulo={camp?.ciudad}>
      <div className="ios-card" style={{ padding: 24 }}>
        {camp ? (
          <>
            <p style={{ marginBottom: 12 }}>{camp.descripcion || 'Campeonato oficial ACCTKD.'}</p>
            <p><strong>Fechas evento:</strong> {formatFecha(camp.fecha_inicio)} – {formatFecha(camp.fecha_fin)}</p>
            <p><strong>Lugar:</strong> {camp.lugar || FESTCUP_VENUE.name}</p>
            <a
              href={FESTCUP_VENUE.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="ios-btn ios-btn-secondary"
              style={{ display: 'inline-flex', marginTop: 12, justifyContent: 'center' }}
            >
              📍 Ver en Google Maps
            </a>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--label3)' }}>
              Inscripciones hasta {formatFecha(camp.fecha_cierre_inscripcion)}
            </p>
            {data?.inscripcion?.ok && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                <Link
                  href={`/registro-academia?slug=${slug}`}
                  className="ios-btn ios-btn-primary"
                  style={{ display: 'inline-flex', justifyContent: 'center' }}
                >
                  Registrar mi academia
                </Link>
                <Link
                  href="/login"
                  className="ios-btn ios-btn-secondary"
                  style={{ display: 'inline-flex', justifyContent: 'center' }}
                >
                  Ya tengo cuenta (DNI)
                </Link>
              </div>
            )}
            {camp?.slug && (
              <>
                <Link
                  href={`/campeonato/${slug}/resultados`}
                  className="ios-btn ios-btn-primary"
                  style={{ display: 'inline-flex', justifyContent: 'center', marginTop: 16 }}
                >
                  Resultados y medallero
                </Link>
                <Link
                  href={`/campeonato/${slug}/canchas`}
                  className="ios-btn ios-btn-secondary"
                  style={{ display: 'inline-flex', justifyContent: 'center', marginTop: 10 }}
                >
                  Pantallas por área (TV)
                </Link>
              </>
            )}
            {camp.bases_pdf_url && (
              <a href={camp.bases_pdf_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 16, color: 'var(--red)' }}>
                Descargar bases (PDF)
              </a>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <a href={FESTCUP_DOCS.bases} target="_blank" rel="noreferrer" style={{ color: 'var(--red)' }}>
                Bases FestCup 2026 (PDF)
              </a>
              <a href={FESTCUP_DOCS.programa} target="_blank" rel="noreferrer" style={{ color: 'var(--red)' }}>
                Programa del evento (PDF)
              </a>
              <a
                href={FESTCUP_DOCS.plantillaExcel}
                download="Ficha-inscripcion-FestCup-2026-poomsae-kyorugi.xlsx"
                style={{ color: 'var(--red)' }}
              >
                Plantilla inscripción Excel 2026
              </a>
            </div>
          </>
        ) : (
          <p>Cargando…</p>
        )}
      </div>
    </PortalLayout>
  )
}
