# Mapa de tablas — ACCTKD ERP

**Practicante:** Robles Palacios, Luigi Armando  
**Versión producto:** v1.0 (core) + extensiones v1.1–v1.3  
**Base de datos:** PostgreSQL 17 — Supabase Cloud  
**Fuente:** Elaboración propia a partir del esquema en `supabase/migrations/` y uso real en la app (mayo 2026)

> Este documento clasifica las **~34 tablas** del proyecto para evitar confundir lo que ya opera en producción con lo que está preparado para iteraciones futuras. **No implica eliminar tablas**; solo ordena el alcance.

---

## Resumen ejecutivo

| Clasificación | Cantidad aprox. | Descripción |
|---------------|-----------------|-------------|
| **Core v1.0** | 16 | Operación diaria: alumnos, asistencia, cobranza, maestros |
| **Futuro v1.1** | 4 | Auth real, planillas, matrícula historial, descuentos |
| **Futuro v1.2** | 11 | Campeonatos completos + exámenes de grado |
| **Futuro v1.3** | 3 | Comunicados, anotaciones, portal apoderado |
| **Revisar** | 2 | Posible solapamiento con otras tablas |

---

## Core v1.0 — operación diaria

Tablas que soportan los módulos desplegados en `acctkd-administracion.vercel.app`.

| Tabla | Propósito | App / servicio | Acción |
|-------|-----------|----------------|--------|
| `sede` | Sede física de la academia | `alumno.service`, sedes | Mantener |
| `turno` | Horarios semanales (9 turnos) | Asistencia, alumnos | Mantener |
| `maestro` | Instructores (titular 6° Dan) | `maestro.service` | Mantener |
| `maestro_turno` | Titularidad por turno | `maestro.service` | Mantener |
| `alumno` | Ficha del practicante | `alumno.service` | Mantener |
| `apoderado` | Contacto del menor | `alumno.service` | Mantener |
| `grado_marcial` | Catálogo de grados (incl. Dan) | Alumnos | Mantener |
| `historial_grados` | Promociones (`fecha_examen`) | Ficha alumno | Mantener |
| `plan_mensualidad` | Planes S/100, S/130, S/180 | Alumnos, pagos | Mantener |
| `clase` | Sesión por turno y fecha | `asistencia.service` | Mantener |
| `asistencia_alumno` | Marca P/A/J/R por clase | `asistencia.service` | Mantener |
| `pago` | Cobros y cuotas (`monto_final` GENERATED) | Pagos, alertas | Mantener |
| `concepto_pago` | Catálogo (MENSUALIDAD, etc.) | Pagos | Mantener |
| `metodo_pago` | Yape, efectivo, Plin… | Pagos | Mantener |
| `usuario` | Login admin (bcrypt custom v1.0) | `auth.service` | Mantener → migrar v1.1 |
| `rol` | Roles de acceso | Esquema / RLS | Mantener |

**Volúmenes de referencia (mayo 2026):** 1 sede · 9 turnos · ~60 alumnos · 366 clases · ~770 asistencias · ~144 pagos.

---

## Futuro v1.1 — administración y seguridad

| Tabla | Propósito | Estado app | Acción |
|-------|-----------|------------|--------|
| `planilla_maestro` | Planillas del maestro | CRUD parcial en maestros | Implementar v1.1 |
| `asistencia_maestro` | Asistencia del instructor | Sin UI | Implementar v1.1 |
| `descuento` | Reglas de descuento | Descuento en `pago` directo | Evaluar unificar |
| `config_precios` | Precios por sede | Sin UI | Evaluar vs `plan_mensualidad` |

**Nota v1.1:** migrar auth a **Supabase Auth**; PDF de recibos; facturación SUNAT (nueva tabla posible).

---

## Futuro v1.2 — campeonatos y exámenes

Esquema **ya creado**; MVP en desarrollo (segunda parte del proyecto).

| Tabla | Propósito | Estado app |
|-------|-----------|------------|
| `campeonato` | Evento deportivo | ✅ Lista + detalle MVP |
| `categoria_campeonato` | Categorías edad/peso/modalidad | 🟡 MVP detalle |
| `inscripcion_campeonato` | Inscripción por academia | 🟡 MVP detalle |
| `competidor` | Participante / coach / staff | 🟡 MVP detalle |
| `pesaje_campeonato` | Pesaje oficial | ⬜ v1.2 |
| `llave_combate` | Llaves kyorugi | ⬜ v1.2 |
| `poomsae_ronda` | Rondas poomsae | ⬜ v1.2 |
| `poomsae_puntuacion` | Puntuación poomsae | ⬜ v1.2 |
| `medalla` | Medallero | ⬜ v1.2 |
| `examen_programado` | Examen de grado | ⬜ v1.2 |
| `examen_candidato` | Candidatos a examen | ⬜ v1.2 |

---

## Futuro v1.3 — comunicación y portal

| Tabla | Propósito | Estado app |
|-------|-----------|------------|
| `comunicado` | Avisos a familias / staff | ⬜ v1.3 |
| `anotacion` | Notas internas por alumno | ⬜ v1.3 |

Portal apoderado reutilizará `apoderado`, `usuario`, `alumno`, `pago` (solo lectura).

---

## Revisar — posible duplicado o sin uso

| Tabla | Observación | Recomendación |
|-------|-------------|---------------|
| `matricula` | `alumno` ya tiene `id_turno`, `fecha_ingreso` | Definir si es **historial** de cambios de turno o deprecar |
| `campeonato` (campos extra) | Templates credenciales, link público | Usar en v1.2 completo |

---

## Uso en código (referencia rápida)

```
src/lib/services/alumno.service.js     → alumno, apoderado, plan, turno, grado, historial_grados
src/lib/services/asistencia.service.js → turno, clase, asistencia_alumno, alumno
src/lib/services/pagoAlerts.service.js → pago, concepto_pago
src/lib/services/maestro.service.js    → maestro, maestro_turno, planilla_maestro
src/lib/services/auth.service.js       → usuario
src/lib/services/campeonato.service.js → campeonato, categoria_campeonato, inscripcion, competidor
src/app/admin/dashboard/page.js        → agregados multi-tabla
```

---

## Reglas de diseño (no refactorizar por “muchas tablas”)

1. **Normalización correcta** para ERP: integridad > contar tablas.
2. **`monto_final`** en `pago` es columna **GENERADA** — no insertar manualmente.
3. **`historial_grados`** usa **`fecha_examen`**, no `fecha_obtencion`.
4. **Rendimiento** a escala ACCTKD (~60 alumnos): optimizar consultas e índices, no fusionar tablas.
5. **Herencia PostgreSQL (`INHERITS`)** no recomendada en este proyecto.

---

*Elaborado por Robles Palacios, Luigi Armando — UCV Ingeniería de Sistemas — Trujillo, mayo 2026.*
