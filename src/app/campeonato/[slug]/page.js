'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PortalLayout from '@/components/campeonatos/PortalLayout'
import { formatFecha } from '@/lib/utils/format'

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
            <p><strong>Lugar:</strong> {camp.lugar || 'Por confirmar'}</p>
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
            {camp.bases_pdf_url && (
              <a href={camp.bases_pdf_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 16, color: 'var(--red)' }}>
                Descargar bases (PDF)
              </a>
            )}
          </>
        ) : (
          <p>Cargando…</p>
        )}
      </div>
    </PortalLayout>
  )
}
