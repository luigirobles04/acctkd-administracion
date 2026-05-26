# Campeonatos Hayllis-style — ACCTKD

> Portal con usuarios (DNI) · Sin links mágicos · Mayo 2026

## Roles

| Rol | Acceso |
|-----|--------|
| `admin` | ERP + campeonatos + aprobar academias |
| `organizador` | Staff evento (pagos, pesaje) |
| `representante` | 1 DNI = 1 academia; inscribe todo el club |
| `arbitro` / `juez_poomsae` | Mesas (F3+, solo admin crea) |

## Flujo representante

1. `/registro-academia` — elige campeonato, datos academia + DNI + contraseña
2. `/login` — DNI + contraseña
3. `/portal` — Mis campeonatos (+ unirse a eventos publicados)
4. `/portal/{slug}` — wizard inscripción, vouchers, enviar lista

## Estados

**Academia en campeonato (`estado_aprobacion`):**
- `pendiente` — puede armar lista (borrador)
- `aprobada` — puede enviar lista y subir vouchers
- `rechazada` — bloqueada

**Lista (`estado_lista`):**
- `en_edicion` → `enviada` (notificada a ACCTKD)

## ACCTKD interno

Admin inscribe sedes desde `/admin/campeonatos/{id}` (sin portal representante).

## Pagos

Voucher + FIFO + aprobación admin. Sin pasarela online.

## Fases

- **H1** (actual): Auth DNI, registro, aprobación, portal wizard
- **H2**: Admin crear eventos, Excel, config tarifas
- **H3**: Pesaje + acreditación
- **H4**: Llaves + poomsae + mesas
- **H5**: Resultados en vivo + medallero público
