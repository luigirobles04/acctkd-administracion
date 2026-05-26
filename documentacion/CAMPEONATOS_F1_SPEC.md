# Campeonatos F1 — Especificación ACCTKD

> Módulo de inscripciones estilo FestCup / FDPTKD · Christopher Cabrera Taekwondo  
> Versión: F1 · Mayo 2026

## Resumen

F1 entrega inscripciones por academia (link genérico + link propio), perfiles reutilizables por documento, modalidades completas, pago parcial con vouchers, portal móvil ACCTKD, admin de pagos, pesaje offline base y campeonato de prueba.

## Rutas

| Ruta | Uso |
|------|-----|
| `/campeonato/{slug}` | Info pública + botón inscribir |
| `/inscripcion/{slug}` | Link genérico (alta / recuperar) |
| `/inscripcion/a/{token}` | Portal propio de academia |
| `/admin/campeonatos/{id}` | Gestión evento |
| `/admin/campeonatos/{id}/academias` | Academias, links, QR |
| `/admin/campeonatos/{id}/pagos` | Vouchers, FIFO, aprobación |
| `/admin/campeonatos/{id}/pesaje` | Pesaje offline |
| `/admin/academias` | Catálogo maestro |

## Academias

- Catálogo maestro `academia` (nombre, teléfono +51, prefijo dorsal auto por iniciales).
- Colisión prefijo → sufijo numérico (`CC`, `CC2`).
- Cambio nombre → recalcula prefijo y dorsales aprobados.
- Link genérico: cualquier academia se registra al instante (límite 20/día/campeonato).
- Tras alta → link propio `/inscripcion/a/{token}`.
- Regenerar token: convivencia 24 h con token anterior.
- ACCTKD: una fila por sede marcada por admin; puede usar link o panel interno.

## Competidores

- Perfil `competidor_perfil` por academia + tipo documento + número (DNI, CE, pasaporte).
- Re-inscripción: buscar documento → autocompletar → elegir modalidad.
- Transferencia de perfil entre academias: solo admin.
- Historial de campeonatos conserva academia original.

## Modalidades y tarifas (FDPTKD)

| Modalidad | Regular | Tardía |
|-----------|---------|--------|
| Kyorugi individual | S/ 90 | S/ 120 |
| Poomsae individual | S/ 90 | S/ 120 |
| Pareja reconocida | S/ 140 | S/ 160 |
| Pareja freestyle (solo mixta) | S/ 140 | S/ 160 |
| Equipo WT (3) | S/ 150 | S/ 180 |
| Oficiales (≤3) | S/ 0 | S/ 0 |

Precio fijado al crear línea. Sin descuentos. Moneda PEN.

## Flujo inscripción

1. Edición libre hasta cierre de lista.
2. Notificar envío solo si hubo cambios desde última notificación.
3. Varios vouchers; coach declara monto; FIFO auto + override admin.
4. Aprobación parcial por línea; dorsal al aprobar (`CC-01`).
5. Gracia 7 días post-cierre: solo pagos (también subir vouchers).
6. Anular línea libera dorsal y recalcula saldo FIFO.

## Validaciones

- Kyorugi: bloqueo si categoría no calza (edad WT 31-dic, peso).
- Pareja reconocida: misma división edad; mixta o mismo sexo.
- Pareja freestyle: exactamente 1 M + 1 F.
- Equipo: 3 integrantes, mismo sexo, grados compatibles, misma división edad.
- Foto: máx 2 MB, min 400×400, fondo blanco, rostro visible (validación navegador).

## Legal

- Checkbox + texto similar FDPTKD.
- PDF bases subido por admin; registro fecha/IP/versión.

## WhatsApp

- Plantillas editables por campeonato.
- Teléfonos staff manual; avisos configurables.
- Coach también recibe avisos (falta pago, aprobación).
- F1: enlaces wa.me; F1.5: API Business.

## Medallero (F6)

- Default FDPTKD: oro 120, plata 50, bronce 20 (configurable).
- Cada medalla suma entero (2 bronces = 40 pts).
- General y por modalidad si ≥ 4 academias.

## Offline (F1)

- PWA + IndexedDB cola sync.
- Portal, admin lectura, pesaje registro peso + intento 1/2.
- Conflicto sync: gana servidor.
- Marcar ganador: cola F1, UI F4.

## Backup

- Manual JSON en admin.
- Vercel Cron nocturno → bucket `backups-campeonato`.

## Campeonato de prueba

**FestCup ACCTKD — Prueba 2026**

- Inscripción regular: 2026-05-18 → 2026-06-17
- Tardía: 2026-06-18 → 2026-06-24
- Gracia pago: hasta 2026-07-01
- Evento: 2026-07-19 → 2026-07-20
- Slug: `festcup-acctkd-prueba-2026`

## Modelo de datos (nuevo)

- `academia`, `academia_campeonato`, `competidor_perfil`
- `linea_inscripcion`, `linea_inscripcion_miembro`
- `campeonato_tarifa`, `comprobante_pago`, `asignacion_pago`
- `campeonato_registro_academia_dia`, `bitacora_inscripcion`, `cola_offline`
