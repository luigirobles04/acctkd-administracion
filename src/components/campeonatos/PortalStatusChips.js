import {
  labelEstadoAprobacion,
  labelEstadoLista,
  labelEstadoPago,
  portalChipClass,
} from '@/lib/campeonato/portal-labels'

export default function PortalStatusChips({
  estado_aprobacion,
  estado_lista,
  estado_pago,
  monto_total,
  showPago = true,
}) {
  const apro = labelEstadoAprobacion(estado_aprobacion)
  const lista = labelEstadoLista(estado_lista)
  const pago = labelEstadoPago(estado_pago)

  return (
    <div className="portal-event-chips">
      <span className={portalChipClass(apro.tone)}>{apro.label}</span>
      <span className={portalChipClass(lista.tone)}>{lista.label}</span>
      {showPago && estado_pago && estado_pago !== 'validado' && (
        <span className={portalChipClass(pago.tone)}>{pago.label}</span>
      )}
      {monto_total > 0 && (
        <span className={portalChipClass('blue')}>
          S/ {Number(monto_total).toFixed(0)}
        </span>
      )}
    </div>
  )
}
