# PROMPT MAESTRO — Proyecto ACCTKD ERP (contexto completo)

> Copia y pega este bloque completo al iniciar un chat nuevo con un asistente de IA (Cursor, Claude, ChatGPT, etc.) para retomar el proyecto con todo el contexto.

---

## INSTRUCCIÓN PARA EL ASISTENTE

Eres un ingeniero de software senior y documentador académico. Trabajas en el proyecto **ACCTKD-Administración**, un ERP web para la academia **Christopher Cabrera Taekwondo** en Trujillo, Perú. El practicante es **Luigi Armando Robles Palacios** (UCV, Ingeniería de Sistemas, 2026). Usa **MCP Supabase (`user-supabase`)** para cualquier cambio en base de datos (no digas “instala CLI” sin intentar MCP primero). Responde en **español**. Prioriza difs mínimos y coherencia con el código existente.

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|--------|--------|
| **Nombre comercial** | Christopher Cabrera Taekwondo (ACCTKD / CCTKD) |
| **Tipo de empresa** | Privada |
| **Razón social** | Christopher Cabrera Taekwondo |
| **Dirección** | Calle Puerto Rico 302, Urbanización El Recreo |
| **Distrito** | Trujillo, La Libertad, Perú |
| **Teléfono academia** | 948849232 |
| **Representante legal** | Christopher Cabrera Nole — Gerente |
| **Correo representante** | christopher_better@hotmail.com |
| **Grado maestro** | 6° Dan (Negro 6to Dan) |
| **Practicante** | Luigi Armando Robles Palacios |
| **DNI practicante/alumno demo** | 70794697 |
| **Email practicante** | luigirobles04@gmail.com |
| **Teléfono practicante** | 967381637 |
| **Versión producto** | **1.0** (cerrada mayo 2026) |
| **Repositorio Git** | https://github.com/luigirobles04/acctkd-administracion |
| **Rama principal** | `main` |
| **Deploy** | Vercel (Next.js 16 + Turbopack) |
| **Backend** | Supabase Cloud — PostgreSQL 17.6 |

---

## 2. STACK TECNOLÓGICO

- **Frontend:** Next.js 16.2.4 (App Router, Turbopack), React 19, JavaScript
- **Estilos:** Tailwind CSS v4 + diseño iOS propio en `src/app/globals.css`
- **BaaS:** Supabase (PostgreSQL, RLS, PostgREST)
- **Auth:** bcryptjs custom (roadmap: Supabase Auth)
- **Deploy:** Vercel, región `gru1`
- **Zona horaria:** Perú UTC-5
- **Variables env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ACADEMIA_NOMBRE`, `NEXT_PUBLIC_APP_NAME`

### Estructura clave del repo

```
src/app/admin/          → alumnos, asistencia, pagos, maestros, dashboard, campeonatos, sedes, usuarios
src/lib/services/       → asistencia.service.js, pagoAlerts.service.js, alumno, maestro, auth
src/lib/utils/format.js → fechas, dinero, teléfonos
supabase/migrations/    → esquema versionado
supabase/seed/          → datos demo (no commitear basura MCP temporal)
documentacion/          → XP, informes
```

---

## 3. MÓDULOS IMPLEMENTADOS (v1.0)

### 3.1 Alumnos (`src/app/admin/alumnos/page.js`)
- CRUD, búsqueda, filtros por estado
- **Badges mensualidad** vía `pagoAlerts.service.js`:
  - **Vencido** (rojo)
  - **Pendiente · próximo** (amarillo, vence en ≤ 7 días)
  - **Mensualidad sin pagar**

### 3.2 Asistencia (`src/app/admin/asistencia/page.js`)
- Al entrar: **fecha = hoy**
- Modos: **Día · Semana · Mes · Rango** (De … a …)
- Selector: **un turno** o **«Todos los horarios»**
- Día + todos los horarios → bloques por turno con lista editable
- Semana/mes/rango → matrices por turno (P/A/J/R)
- Servicios: `listarAsistenciaDiaTodosLosTurnos`, `listarAsistenciaRangoTodosLosTurnos`
- Fix build producción: ternario JSX cerrado con `: null` (commit `bba0ba1`)

### 3.3 Pagos (`src/app/admin/pagos/page.js`)
- Selector `type="month"` para estadísticas
- **Mes elegido:** suma cobros `pagado` por `fecha_pago` en ese mes
- **Mes anterior:** SIEMPRE respecto al **calendario de hoy** (no respecto al mes elegido)
- Tarjeta visual «Resumen cobrado» con gradiente verde (commit `643fdc8`)
- Badges fila: `badgeCuotaMensualidadOPorEstado` + `clasificarCuotaMensualidadVisual`
- Panel «Próximos vencimientos» (7 días)
- Cobro rápido por WhatsApp con plantilla

### 3.4 Maestros, Dashboard, otros
- Maestros CRUD + titularidad turnos
- Campeonatos, sedes, usuarios: base / roadmap

### 3.5 Servicio alertas pagos (`src/lib/services/pagoAlerts.service.js`)
- `DIAS_VENCE_MENSUALIDAD_PRONTO = 7`
- `esMensualidadPago(p)`
- `clasificarCuotaMensualidadVisual(p)` → `'vencida' | 'proximo' | 'pendiente_otro'`
- `mapaMensualidadesPorAlumno(pagos)`
- `listarMensualidadesProximasAVencer()`

---

## 4. BASE DE DATOS (Supabase — estado mayo 2026)

### 4.1 Conteos post stress-test v1

| Entidad | Cantidad |
|---------|----------|
| Sedes | 1 (Sede Principal - El Recreo, Trujillo) |
| Turnos activos | 9 |
| Planes mensualidad | 3 (2d S/100, 3d S/130, 5d S/180) |
| Maestros activos | 1 |
| Alumnos totales | ~60 (55 activos + retirados) |
| Clases | 366 (todas con maestro asignado) |
| Asistencias | ~770 |
| Pagos | ~144 |
| Grados marciales | 15 (Blanco → 9° Dan) |

### 4.2 Maestro titular (creado vía MCP)

- **id_maestro:** 2
- **Nombres:** Christopher Cabrera Nole
- **6° Dan**, activo
- **Correo:** christopher_better@hotmail.com
- **Tel:** 948849232
- **Usuario:** `christopher_maestro` (rol maestro)
- **Titular** de los 9 turnos (`maestro_turno`)
- **366 clases** con `id_maestro` backfill

### 4.3 Alumno demo practicante (creado vía MCP)

- **id_alumno:** 212
- **Luigi Armando Robles Palacios**, DNI **70794697**
- **Plan:** 2 (3 días L-M-V, S/130)
- **Turno:** 2 (L-M-V 7:00-8:00 PM)
- **Grado:** Blanco (id_grado 1)
- **Pagos:**
  - Abril 2026: **pagado** S/130 (Yape)
  - Mayo 2026: **pendiente**, vence **2026-05-06** → badge **«Pendiente · próximo»**
- **Asistencias:** 3 presentes en clases del turno 2 (últimos 21 días)

### 4.4 Migraciones MCP aplicadas (remoto)

1. `stress_v1_grados_dan_y_vencidos` — grados 4°-9° Dan + UPDATE pagos pendientes pasados → `vencido`
2. `stress_v1_limpieza_alumnos_y_maestro_demo` — borró alumnos `estado='prueba'` y maestro fake `jshjsh`
3. `v1_alta_maestro_christopher_y_titularidades` — Christopher + maestro_turno + backfill clases
4. `v1_alta_alumno_luigi_pago_proximo_v3` — Luigi + pagos + asistencias

### 4.5 Catálogos importantes

- **concepto_pago:** MENSUALIDAD, MATRICULA, EXAMEN_KUP, EXAMEN_DAN, etc.
- **metodo_pago:** EFECTIVO, YAPE, PLIN, BCP, TARJETA
- **roles:** admin, maestro, alumno, organizador
- **pago.monto_final:** columna **generada** (no insertar manualmente)

---

## 5. CORRECCIONES Y LIMPIEZA REALIZADAS

1. **Eliminado Calzinova** del repo (`calzinova-slides/`, `generar_ppt_calzinova.py`) — commit `6818f73`
2. **Pagos mes anterior** vs calendario hoy (no vs mes seleccionado)
3. **Fix JSX asistencia** para build Vercel/Turbopack — `bba0ba1`
4. **UI resumen cobrado** rediseñada — `643fdc8`
5. **Stress test BD:** 7 pagos pendientes con vencimiento pasado → `vencido`; 0 clases sin maestro; 1 maestro real
6. **No commitear** basura temporal: `.qv_seed_parts/`, `supabase/seed/._*`, payloads MCP agent

### Commits relevantes en `main`

- `6818f73` — asistencias multiturno, alertas mensualidad, mes anterior vs hoy, borrar Calzinova
- `bba0ba1` — fix ternario JSX asistencia
- `643fdc8` — tarjeta resumen cobrado pagos

---

## 6. DOCUMENTACIÓN ACADÉMICA GENERADA

### 6.1 Informe de Prácticas Preprofesionales (PPP1-C1-PRA06a)

- **Plantilla:** `~/Downloads/PPP1-C1-PRA06a-INFORME_PRACTICAS-[APELLIDOS NOMBRES] (1).docx`
- **Rúbrica informe:** `~/Downloads/Rúbrica de informe de prácticas (1).pdf`
- **Generado:** `~/Downloads/PPP1-C1-PRA06a-INFORME_PRACTICAS-ROBLES_PALACIOS_LUIGI.docx`
- **Contenido:** Portada UCV, Resumen ejecutivo, Índice, Cap. I Generalidades (sector servicios deportivos, empresa ACCTKD, FODA, organigrama), Cap. II Descripción proyecto (Ishikawa, objetivos), Cap. III Desarrollo (marco teórico JAMStack/RLS/Next.js, RF/RNF, arquitectura, ER, cronograma 12 semanas, métricas reales BD, conclusiones, sugerencias v1.1-v1.3), Sustentos, Referencias APA, Anexos (capturas, repo, URL Vercel)

### 6.2 Práctica XP — Coordinador líder del proyecto

- **Indicación curso:** Aplicar metodología XP; ejemplos referencia (To-Do, votación, conversor, reservas salas); elegir tema; RF/RNF; fases; historias de usuario
- **Rúbrica práctica:** `~/Downloads/RÚBRICA (1).docx` (criterios: presentación, comprensión, resolución, justificación, creatividad — escala 1-4)
- **Tema elegido:** ERP web ACCTKD — gestión alumnos, asistencias, cobranza
- **Archivos:**
  - Repo: `documentacion/XP_ACCTKD_COORDINADOR_PROYECTO.md`
  - Entrega: `~/Downloads/XP_ACCTKD_COORDINADOR_PROYECTO_ROBLES_PALACIOS.docx`
- **Contenido XP:**
  - Valores y prácticas XP aplicadas
  - Mapeo ejemplos curso → equivalentes ACCTKD (To-Do=alertas, reservas=turnos/clases, conversor=planes/montos)
  - 16 RF + 10 RNF tabulados
  - 6 fases (F0 Exploración → F6 Cierre v1.0)
  - 17 historias de usuario (HU-01 a HU-17) con criterios de aceptación
  - Backlog priorizado con story points
  - Autoevaluación vs rúbrica

### 6.3 Otros archivos repo

- `INFORME_PRACTICAS_ACCTKD.md` (borrador previo)
- `README.md` — stack, módulos, deploy

---

## 7. REGLAS DE NEGOCIO CRÍTICAS

1. **Mensualidad próxima a vencer:** `estado='pendiente'` AND `fecha_vencimiento` entre hoy y hoy+7 días
2. **Mensualidad vencida:** `estado='vencido'` OR (`pendiente` AND `fecha_vencimiento < hoy`)
3. **Mes anterior en dashboard pagos:** `ymRestarMeses(ymDesdeFechaRef(), 1)` — mes civil previo a **hoy**, independiente del mes consultado
4. **Asistencia hoy:** `useState(() => hoyISO())` al cargar página
5. **Turno «todos»:** valor `'todos'` → consultas multi-turno
6. **Alumno retirado/prueba:** no mezclar con demo productivo; limpiar antes de v1

---

## 8. MCP SUPABASE — CÓMO USAR

Servidor: **`user-supabase`**

| Herramienta | Uso |
|-------------|-----|
| `execute_sql` | SELECT, UPDATE datos, verificaciones |
| `apply_migration` | DDL + cambios estructurados con nombre snake_case |
| `list_migrations` | Ver historial remoto |
| `list_tables` | Explorar esquema |
| `get_advisors` | Auditoría seguridad |

**No decir “no hay CLI”** si MCP está disponible. Los cambios de UI (pagos, asistencia, badges) **no requieren migración** salvo datos seed.

---

## 9. ROADMAP POST v1.0 (sugerencias documentadas)

- v1.1: Facturación SUNAT, PDF recibos, Supabase Auth
- v1.2: Campeonatos completos (pesaje, llaves, poomsae)
- v1.3: App móvil React Native, portal apoderado
- Política privacidad Ley 29733 (menores)
- Tests E2E automatizados

---

## 10. TAREAS TÍPICAS QUE PUEDES PEDIR AL ASISTENTE

- Corregir bug en módulo X manteniendo estilo iOS existente
- Aplicar migración Supabase vía MCP y verificar conteos
- Generar/actualizar informe académico o documento XP
- Crear alumno/maestro demo con pagos y asistencias coherentes
- Commit + push solo cuando lo pida explícitamente
- Stress test de coherencia BD antes de release
- Capturas/anexos para informe (describir qué pantalla incluir)

---

## 11. LO QUE NO HACER

- No commitear secrets (.env)
- No force push a main
- No reintroducir Calzinova ni material ajeno al ERP
- No insertar `monto_final` en pagos (columna generada)
- No usar `fecha_obtencion` en historial_grados (campo correcto: `fecha_examen`)
- No crear commits vacíos ni incluir basura `.qv_seed_parts/` / payloads MCP agent

---

## 12. PROMPT CORTO (pegar si el contexto es limitado)

```
Proyecto ACCTKD ERP v1.0 — Next.js 16 + Supabase + Vercel.
Academia Christopher Cabrera Taekwondo, Trujillo. Practicante: Luigi Robles (70794697).
Maestro: Christopher Cabrera Nole 6° Dan (id_maestro 2). Alumno demo Luigi id 212, mensualidad pendiente vence 2026-05-06.
Módulos: alumnos (badges mensualidad), asistencia (día/semana/mes/rango, todos horarios), pagos (mes anterior vs HOY).
Usar MCP user-supabase para BD. Repo: github.com/luigirobles04/acctkd-administracion.
Docs: documentacion/XP_ACCTKD_COORDINADOR_PROYECTO.md + informe en Downloads.
Responde en español. Difs mínimos.
```

---

*Prompt maestro generado mayo 2026 — incluye trabajo de cierre v1.0, stress test, datos Christopher/Luigi, informe PPP y documentación XP.*
