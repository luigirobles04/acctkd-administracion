# Práctica XP — Coordinador líder del proyecto  
## Sistema web ERP «ACCTKD-Administración»

**Practicante:** Robles Palacios, Luigi Armando  
**Empresa:** Christopher Cabrera Taekwondo (ACCTKD) — Trujillo, Perú  
**Metodología:** Extreme Programming (XP)  
**Versión del producto:** 1.0 (mayo 2026)

---

## 1. Rol del coordinador y marco XP

Como **coordinador líder del proyecto**, se aplicó **Extreme Programming (XP)** adaptada a un equipo reducido (1 practicante de sistemas + 1 gerente/maestro como *cliente on-site*). XP prioriza entregas frecuentes, retroalimentación continua y calidad técnica.

### 1.1 Valores XP aplicados

| Valor | Aplicación en ACCTKD |
|--------|----------------------|
| **Comunicación** | Reuniones semanales con Christopher Cabrera Nole (gerente) para validar pantallas y reglas de negocio. |
| **Simplicidad** | Versión 1.0 solo cubre alumnos, asistencia, pagos y maestros; campeonatos y exámenes quedan para iteraciones posteriores. |
| **Retroalimentación** | Demos al final de cada iteración; correcciones inmediatas (p. ej. «mes anterior» respecto al calendario de hoy). |
| **Coraje** | Refactor del módulo de asistencia multi-turno y eliminación de datos de prueba antes del cierre v1. |

### 1.2 Prácticas XP utilizadas

- **Historias de usuario** escritas con el cliente y priorizadas en backlog.
- **Planificación por iteraciones** de 1 semana (timebox).
- **Entregas pequeñas** desplegadas en Vercel al cerrar cada iteración.
- **Diseño simple** con capa de servicios (`*.service.js`) y componentes reutilizables.
- **Pruebas manuales + stress test** de coherencia de datos en Supabase antes del release.
- **Integración continua** desde GitHub → Vercel.
- **Propiedad colectiva del código** (repositorio único, rama `main` protegida).

### 1.3 Relación con los ejemplos del enunciado

El curso propone cuatro dominios de referencia. **El tema elegido no es uno de esos cuatro de forma aislada**, sino un **sistema integral** que resuelve necesidades equivalentes en la academia:

| Ejemplo del enunciado | Equivalente funcional en ACCTKD |
|------------------------|----------------------------------|
| Agenda de tareas (To-Do List) | Panel de alertas: mensualidades por vencer, pendientes/vencidos, próximos cobros; agenda de clases por turno. |
| Sistema de votación simple | Base para futuras decisiones/inscripciones (campeonatos, categorías); en v1.0 se priorizó cobranza y asistencia. |
| Conversor de divisas/unidades | Conversión y normalización de montos (planes 2/3/5 días, descuentos, `monto_final` generado en BD). |
| Reservas de salas de estudio | **Reserva de cupo horario**: asignación de alumno a **turno** (slot L-M-V o Ma-J) y generación automática de **clases** por fecha. |

---

## 2. Tema del proyecto

### Tema elegido

**«Implementación de un sistema web ERP para la gestión de alumnos, asistencias y cobranza de mensualidades en la academia Christopher Cabrera Taekwondo, Trujillo — 2026».**

### Objeto

Digitalizar los procesos administrativos diarios de una academia de Taekwondo (matrícula, control de asistencia por turno, cobro de mensualidades y reportes financieros).

### Lugar / contexto

Sede única: Calle Puerto Rico 302, Urbanización El Recreo, distrito de Trujillo, La Libertad, Perú. Operación presencial con acceso remoto del gerente desde celular.

### Justificación de la elección

La academia atiende ~60 alumnos en 9 turnos semanales. Antes del proyecto, la operación dependía de cuadernos y Excel, generando atrasos en cobranza y pérdida de trazabilidad de asistencia. Un ERP acotado responde al problema real del cliente y permite demostrar ingeniería de software con datos productivos.

---

## 3. Requerimientos de usuario

### 3.1 Actores

| Actor | Descripción |
|--------|-------------|
| **Administrador / Gerente** | Christopher Cabrera Nole. Acceso total: alumnos, pagos, asistencia, maestros, usuarios. |
| **Maestro titular** | Instructor de turno. Consulta asistencia y lista de alumnos (roadmap v1.1). |
| **Practicante TI** | Desarrollo, despliegue y soporte del sistema. |
| **Alumno / Apoderado** | Beneficiario indirecto; no accede al panel en v1.0 (futuro portal). |

### 3.2 Requerimientos funcionales (RF)

| ID | Requerimiento | Prioridad (XP) | Estado v1.0 |
|----|---------------|----------------|-------------|
| RF-01 | Autenticar usuarios con rol (admin, maestro) y sesión segura. | Alta | ✅ |
| RF-02 | Registrar, editar y listar alumnos con plan, turno, grado y datos de contacto. | Alta | ✅ |
| RF-03 | Filtrar y buscar alumnos; mostrar badges de estado de mensualidad (Vencido / Pendiente · próximo / sin pagar). | Alta | ✅ |
| RF-04 | Configurar y consultar turnos horarios (días y franjas) por sede. | Alta | ✅ |
| RF-05 | Generar clases por turno y fecha; marcar asistencia (Presente, Ausente, Justificada, Recuperación). | Alta | ✅ |
| RF-06 | Visualizar asistencia por **día, semana, mes y rango**; opción **«Todos los horarios»** del día. | Alta | ✅ |
| RF-07 | Marcar «todos presentes» en un turno/clase. | Media | ✅ |
| RF-08 | Registrar pagos (mensualidad y otros conceptos) con método (efectivo, Yape, Plin, transferencia). | Alta | ✅ |
| RF-09 | Listar pagos con filtros por estado (pagado, pendiente, vencido). | Alta | ✅ |
| RF-10 | Mostrar resumen de cobranza por mes (fecha de pago) y comparativo con **mes anterior calendario**. | Alta | ✅ |
| RF-11 | Alertar mensualidades próximas a vencer (7 días) y clasificar vencidas automáticamente. | Alta | ✅ |
| RF-12 | Enviar recordatorio de cobro por WhatsApp con plantilla prellenada. | Media | ✅ |
| RF-13 | Gestionar maestros (CRUD), grado Dan y titularidad de turnos. | Alta | ✅ |
| RF-14 | Dashboard con indicadores operativos (alumnos, cobros, pendientes). | Media | ✅ |
| RF-15 | Gestionar campeonatos (Kyorugi/Poomsae), pesaje e inscripciones. | Baja | 🟡 base |
| RF-16 | Gestionar exámenes de grado e historial de promociones. | Baja | ⬜ esquema |

### 3.3 Requerimientos no funcionales (RNF)

| ID | Requerimiento | Criterio de aceptación |
|----|---------------|------------------------|
| RNF-01 | **Usabilidad** | Interfaz tipo iOS, usable en móvil durante la clase; máximo 3 toques para marcar asistencia. |
| RNF-02 | **Rendimiento** | Carga inicial del panel admin < 3 s en conexión 4G. |
| RNF-03 | **Disponibilidad** | Despliegue en Vercel con uptime objetivo ≥ 99 % (plan gratuito). |
| RNF-04 | **Seguridad** | HTTPS; variables sensibles solo en servidor; RLS en tablas expuestas vía Supabase. |
| RNF-05 | **Integridad de datos** | Claves foráneas; `monto_final` como columna generada; estados de pago consistentes. |
| RNF-06 | **Mantenibilidad** | Código modular (`services/`, componentes); migraciones versionadas en `supabase/migrations/`. |
| RNF-07 | **Escalabilidad** | Arquitectura serverless (Next.js + PostgreSQL administrado) sin servidor propio. |
| RNF-08 | **Portabilidad** | Funciona en Chrome/Safari móvil y escritorio; PWA instalable. |
| RNF-09 | **Auditabilidad** | Timestamps `created_at`; historial de grados; trazabilidad de pagos por alumno. |
| RNF-10 | **Legal / privacidad** | Datos de menores; consentimiento del apoderado (política documentada en roadmap). |

---

## 4. Fases del proyecto (ciclo de vida XP)

| Fase | Duración | Entregables | Práctica XP |
|------|----------|-------------|-------------|
| **F0 — Exploración** | Semana 1 | Acta de inicio, entrevistas al gerente, mapa de procesos actuales (cuaderno → digital). | User stories iniciales |
| **F1 — Iteración 1: Fundamentos** | Semanas 2–3 | Repo GitHub, Supabase, login, CRUD alumnos, seed de catálogos. | Spike técnico + primera release |
| **F2 — Iteración 2: Asistencia** | Semanas 4–5 | Módulo asistencia día/semana; turnos; clases automáticas. | Planning game + demo |
| **F3 — Iteración 3: Pagos** | Semanas 6–7 | Registro de pagos, filtros, badges de mensualidad. | Refactoring + integración |
| **F4 — Iteración 4: Reportes y multi-turno** | Semanas 8–9 | Vista mes/rango, «todos los horarios», resumen cobranza. | Small releases |
| **F5 — Iteración 5: Maestros y datos reales** | Semana 10 | Alta Christopher Cabrera (6° Dan), limpieza demo, stress test BD. | Customer acceptance |
| **F6 — Iteración 6: Cierre v1.0** | Semanas 11–12 | Fix build producción, UI resumen pagos, informe de prácticas, tag `v1.0`. | Release planning + retrospectiva |

### 4.1 Retrospectiva v1.0 (lecciones aprendidas)

- **Qué funcionó:** despliegue continuo, feedback semanal del gerente, MCP Supabase para migraciones controladas.
- **Qué mejorar:** automatizar pruebas E2E; migrar auth a Supabase Auth; completar módulo campeonatos.
- **Deuda técnica:** algunos módulos en estado «base» (sedes, usuarios); documentar política de privacidad.

---

## 5. Historias de usuario (requerimientos funcionales)

Formato: **Como** [rol], **quiero** [acción], **para** [beneficio].  
Incluye **criterios de aceptación (CA)** y **prioridad** (Must / Should / Could).

---

### Épica E1 — Autenticación y acceso

**HU-01 — Inicio de sesión**  
Como **administrador**, quiero **iniciar sesión con usuario y contraseña**, para **acceder al panel sin exponer datos de alumnos**.  
- CA-01: Credenciales válidas redirigen a `/admin/dashboard`.  
- CA-02: Credenciales inválidas muestran mensaje claro.  
- CA-03: Sesión persiste hasta cerrar o expirar.  
- **Prioridad:** Must | **Iteración:** 1

---

### Épica E2 — Gestión de alumnos

**HU-02 — Alta de alumno**  
Como **administrador**, quiero **registrar un alumno con DNI, contacto, plan y turno**, para **tener su ficha digital desde el primer día**.  
- CA-01: Campos obligatorios validados (nombres, apellidos).  
- CA-02: Plan y turno se seleccionan de catálogos activos.  
- CA-03: El alumno aparece en la lista tras guardar.  
- **Prioridad:** Must | **Iteración:** 1

**HU-03 — Estado de mensualidad visible**  
Como **administrador**, quiero **ver en la lista si la mensualidad está vencida, próxima a vencer o sin pagar**, para **priorizar cobranza sin revisar Excel**.  
- CA-01: Badge rojo «Vencido» si `fecha_vencimiento < hoy`.  
- CA-02: Badge amarillo «Pendiente · próximo» si vence en ≤ 7 días.  
- CA-03: Badge «Mensualidad sin pagar» si no hay cuota del mes.  
- **Prioridad:** Must | **Iteración:** 3

**HU-04 — Búsqueda de alumnos**  
Como **administrador**, quiero **buscar por nombre, DNI o teléfono**, para **localizar un alumno en segundos**.  
- CA-01: Búsqueda en tiempo real sobre la lista cargada.  
- **Prioridad:** Should | **Iteración:** 2

---

### Épica E3 — Asistencia (equivalente a agenda + reservas de cupo)

**HU-05 — Lista del día por turno**  
Como **maestro/administrador**, quiero **ver la lista de alumnos del turno seleccionado en la fecha de hoy**, para **pasar asistencia al inicio de clase**.  
- CA-01: Al entrar, la fecha por defecto es **hoy**.  
- CA-02: Solo se listan alumnos asignados al turno.  
- CA-03: Estados P / A / J / R se guardan al tocar.  
- **Prioridad:** Must | **Iteración:** 2

**HU-06 — Todos los horarios del día**  
Como **administrador**, quiero **ver todos los turnos que tienen clase en un mismo día**, para **supervisar la operación completa sin cambiar de pantalla**.  
- CA-01: Opción «Todos los horarios» muestra un bloque por turno.  
- CA-02: Cada bloque permite marcar asistencia independiente.  
- **Prioridad:** Must | **Iteración:** 4

**HU-07 — Vista semanal/mensual/rango**  
Como **administrador**, quiero **consultar asistencia por semana, mes o rango de fechas**, para **detectar alumnos con baja asistencia**.  
- CA-01: Modos Día / Semana / Mes / Rango con línea «De … a …».  
- CA-02: Matriz alumno × fecha con símbolos P/A/J/R.  
- CA-03: Estadísticas de celdas y porcentaje de cobertura.  
- **Prioridad:** Must | **Iteración:** 4

**HU-08 — Todos presentes**  
Como **maestro**, quiero **marcar todos los alumnos de una clase como presentes con un botón**, para **ahorrar tiempo cuando el grupo completo asistió**.  
- CA-01: Botón visible solo si hay alumnos en la lista.  
- CA-02: Actualiza todos los registros de la clase.  
- **Prioridad:** Should | **Iteración:** 2

---

### Épica E4 — Pagos y cobranza (equivalente a conversor de montos + alertas tipo To-Do)

**HU-09 — Registrar pago**  
Como **administrador**, quiero **registrar un pago de mensualidad con monto, método y mes correspondiente**, para **dejar constancia oficial del cobro**.  
- CA-01: Monto sugerido según plan del alumno.  
- CA-02: Estado «pagado» al confirmar; aparece en historial.  
- CA-03: `monto_final` calculado en BD (monto − descuento).  
- **Prioridad:** Must | **Iteración:** 3

**HU-10 — Cuota pendiente con vencimiento**  
Como **administrador**, quiero **generar cuotas pendientes con fecha de vencimiento**, para **saber cuándo debe pagar cada alumno**.  
- CA-01: Estado `pendiente` con `fecha_vencimiento` futura.  
- CA-02: Pasado el vencimiento, el sistema clasifica como vencida (UI + BD).  
- **Prioridad:** Must | **Iteración:** 3

**HU-11 — Resumen de cobranza mensual**  
Como **gerente**, quiero **elegir un mes y ver cuánto se cobró**, para **controlar ingresos sin sumar manualmente**.  
- CA-01: Selector `type="month"`.  
- CA-02: Total = suma de pagos `pagado` con `fecha_pago` en ese mes.  
- **Prioridad:** Must | **Iteración:** 4

**HU-12 — Comparativo mes anterior (calendario)**  
Como **gerente**, quiero **ver el cobro del mes anterior respecto a hoy**, para **comparar con el mes que estoy analizando**.  
- CA-01: Tarjeta «Mes anterior» usa siempre el mes civil previo al día actual.  
- CA-02: Independiente del mes elegido en el selector.  
- **Prioridad:** Must | **Iteración:** 4

**HU-13 — Alertas próximas a vencer**  
Como **administrador**, quiero **un panel de mensualidades que vencen en 7 días**, para **contactar alumnos antes del corte**.  
- CA-01: Lista ordenada por fecha de vencimiento.  
- CA-02: Muestra nombre, monto y mes correspondiente.  
- **Prioridad:** Must | **Iteración:** 3

**HU-14 — Cobro por WhatsApp**  
Como **administrador**, quiero **abrir WhatsApp con un mensaje de cobro prellenado**, para **agilizar la gestión de morosos**.  
- CA-01: Solo disponible si hay teléfono válido y pago pendiente/vencido.  
- CA-02: Mensaje incluye nombre, monto y mes.  
- **Prioridad:** Should | **Iteración:** 3

---

### Épica E5 — Maestros y turnos

**HU-15 — Registrar maestro titular**  
Como **administrador**, quiero **registrar maestros con grado Dan y asignarlos a turnos**, para **saber quién imparte cada horario**.  
- CA-01: Maestro activo con `dan_nivel` y contacto.  
- CA-02: Relación `maestro_turno` con flag `es_titular`.  
- CA-03: Clases nuevas heredan `id_maestro` del titular.  
- **Prioridad:** Must | **Iteración:** 5

**HU-16 — Planes de mensualidad (conversión de tarifas)**  
Como **administrador**, quiero **planes de 2, 3 y 5 días con montos distintos**, para **cobrar según frecuencia de asistencia del alumno**.  
- CA-01: Plan 2d = S/100; 3d = S/130; 5d = S/180 (catálogo seed).  
- CA-02: Al seleccionar alumno en pago, se sugiere monto del plan.  
- **Prioridad:** Must | **Iteración:** 1

---

### Épica E6 — Dashboard

**HU-17 — Vista general**  
Como **gerente**, quiero **un dashboard con totales de alumnos, pagos pendientes y actividad reciente**, para **tener una foto rápida del negocio**.  
- CA-01: Indicadores numéricos visibles al login.  
- CA-02: Enlaces a módulos principales.  
- **Prioridad:** Should | **Iteración:** 2

---

## 6. Backlog priorizado (Planning Game — release v1.0)

| Orden | Historia | Story points | Iteración |
|-------|----------|--------------|-----------|
| 1 | HU-01 | 3 | 1 |
| 2 | HU-02, HU-16 | 5 | 1 |
| 3 | HU-05, HU-08 | 8 | 2 |
| 4 | HU-04, HU-17 | 3 | 2 |
| 5 | HU-09, HU-10, HU-03 | 8 | 3 |
| 6 | HU-13, HU-14 | 5 | 3 |
| 7 | HU-06, HU-07 | 13 | 4 |
| 8 | HU-11, HU-12 | 5 | 4 |
| 9 | HU-15 | 5 | 5 |
| 10 | Stress test + cierre | 3 | 6 |

**Velocidad promedio:** ~10 story points / iteración.

---

## 7. Criterios de evaluación (autoevaluación según rúbrica)

| Criterio rúbrica | Evidencia en este documento |
|------------------|----------------------------|
| Presentación y formato | Estructura numerada, tablas, historias separadas por épica. |
| Comprensión de temas | XP explicado con valores, prácticas y fases aplicadas al caso real. |
| Resolución de lo solicitado | Tema, RF, RNF, fases e historias de usuario completos. |
| Justificación | Cada RF/HU ligado a problema del cliente (cuadernos → ERP). |
| Creatividad y análisis | Mapeo de ejemplos del curso a equivalentes ACCTKD; retrospectiva v1.0. |

---

## 8. Referencias

- Beck, K. (2000). *Extreme Programming Explained: Embrace Change*. Addison-Wesley.
- Supabase Inc. (2025). Documentación oficial. https://supabase.com/docs
- Vercel Inc. (2026). Next.js 16 Documentation. https://nextjs.org/docs
- Repositorio del proyecto: https://github.com/luigirobles04/acctkd-administracion

---

*Documento elaborado por Robles Palacios, Luigi Armando — Coordinador líder del proyecto ACCTKD · Mayo 2026.*
