import Link from 'next/link'
import { formatFecha } from '@/lib/utils/format'
import PortalStatusChips from './PortalStatusChips'

function EventMeta({ ciudad, fecha }) {
  return (
    <p className="portal-event-meta">
      {[ciudad, fecha && formatFecha(fecha)].filter(Boolean).join(' · ')}
    </p>
  )
}

export function PortalEventCardLink({ href, nombre, ciudad, fecha, item }) {
  return (
    <Link href={href} className="portal-event-card portal-event-card--link">
      <div className="portal-event-accent" aria-hidden />
      <div className="portal-event-body">
        <h3 className="portal-event-title">{nombre}</h3>
        <EventMeta ciudad={ciudad} fecha={fecha} />
        <PortalStatusChips
          estado_aprobacion={item.estado_aprobacion}
          estado_lista={item.estado_lista}
          estado_pago={item.estado_pago}
          monto_total={item.monto_total}
          showPago={item.estado_aprobacion === 'aprobada'}
        />
      </div>
      <span className="portal-event-arrow" aria-hidden>→</span>
    </Link>
  )
}

export function PortalEventCardJoin({ nombre, ciudad, fecha, onJoin, joining }) {
  return (
    <div className="portal-event-card">
      <div className="portal-event-accent" aria-hidden />
      <div className="portal-event-body">
        <h3 className="portal-event-title">{nombre}</h3>
        <EventMeta ciudad={ciudad} fecha={fecha} />
      </div>
      <button
        type="button"
        className="portal-btn-join"
        disabled={joining}
        onClick={onJoin}
      >
        {joining ? '…' : 'Unirme'}
      </button>
    </div>
  )
}
