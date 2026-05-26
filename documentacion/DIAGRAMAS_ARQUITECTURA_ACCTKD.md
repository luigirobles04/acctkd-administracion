# Diagramas de arquitectura — Proyecto ACCTKD ERP v1.0

**Practicante:** Robles Palacios, Luigi Armando  
**Empresa:** Christopher Cabrera Taekwondo (ACCTKD)  
**Docente:** Fernando Santiago Gonzales Zavaleta  
**Proyecto:** Sistema Web ERP «ACCTKD» — gestión de alumnos, asistencias y cobranza  
**Fuente:** Elaboración propia con base en el informe de prácticas y la implementación v1.0 (mayo 2026)

> **Nota sobre el enunciado:** La evaluación solicita diagramas de **arquitectura de negocio**, **arquitectura de aplicaciones** y **arquitectura de datos**. A continuación se presentan **tres diagramas** (uno por capa arquitectónica). Si el docente pide exactamente dos figuras, pueden combinarse **Aplicaciones + Datos** en una sola lámina técnica (ver Diagrama 2 compuesto al final).

---

## Diagrama 1 — Arquitectura de negocio

### 1.1 Descripción

La **arquitectura de negocio** representa **qué hace la academia**, **quién participa** y **cómo fluye la información** entre procesos, sin detallar tecnología. ACCTKD es una microempresa deportiva cuyo valor principal es la formación marcial; la capa de negocio del ERP digitaliza cuatro macroprocesos: **académico-operativo**, **cobranza**, **seguimiento deportivo** y **soporte a la gerencia**.

### 1.2 Actores del negocio

| Actor | Rol | Interacción con el ERP |
|--------|-----|-------------------------|
| **Gerente / Representante legal** (Christopher Cabrera Nole, 6° Dan) | Toma decisiones, supervisa ingresos y operación | Usuario principal: dashboard, pagos, alumnos, reportes |
| **Maestro titular** | Imparte clases, pasa lista | Asistencia por turno (móvil) |
| **Practicante TI** (Luigi Robles) | Soporte, evolución del sistema | Desarrollo, despliegue, migraciones |
| **Apoderado / Alumno** | Beneficiario del servicio | Indirecto v1.0 (WhatsApp cobro); portal futuro v1.3 |
| **Entidades externas** | FDNT, campeonatos, medios de pago | Referencia futura (exámenes, eventos) |

### 1.3 Capacidades de negocio (Business Capabilities)

```mermaid
flowchart TB
    subgraph ACCTKD["Christopher Cabrera Taekwondo — Capacidades de negocio"]
        direction TB
        C1["Capacidad: Formación marcial<br/>(clases, grados, valores)"]
        C2["Capacidad: Gestión de alumnos<br/>(matrícula, ficha, turno, plan)"]
        C3["Capacidad: Control operativo<br/>(horarios, turnos, asistencia)"]
        C4["Capacidad: Gestión financiera<br/>(mensualidades, cobros, alertas)"]
        C5["Capacidad: Gobierno y reportes<br/>(dashboard, comparativos, decisiones)"]
    end

    C1 --> C2
    C2 --> C3
    C2 --> C4
    C3 --> C5
    C4 --> C5
```

### 1.4 Mapa de procesos de negocio (macroprocesos)

```mermaid
flowchart LR
    subgraph Entrada["Entrada al servicio"]
        A1["Consulta / interés<br/>apoderado"]
        A2["Matrícula y<br/>asignación plan-turno"]
    end

    subgraph Operacion["Operación diaria"]
        B1["Planificación<br/>9 turnos semanales"]
        B2["Impartición<br/>de clase"]
        B3["Registro de<br/>asistencia P/A/J/R"]
    end

    subgraph Finanzas["Cobranza"]
        C1["Emisión cuota<br/>mensualidad"]
        C2["Registro de pago<br/>Yape/Efectivo/Plin"]
        C3["Alertas vencido /<br/>próximo 7 días"]
        C4["Resumen mensual<br/>vs mes anterior"]
    end

    subgraph Gestion["Gestión"]
        D1["Dashboard<br/>gerencia"]
        D2["Seguimiento<br/>alumnos activos"]
    end

    A1 --> A2 --> B1 --> B2 --> B3
    A2 --> C1 --> C2
    C1 --> C3 --> C4 --> D1
    B3 --> D2
    C4 --> D1
```

### 1.5 Diagrama de contexto de negocio (organización + sistema)

```mermaid
flowchart TB
    subgraph Externos["Actores externos"]
        APO["Apoderados / Alumnos"]
        FDNT["FDNT / Eventos<br/>(futuro)"]
    end

    subgraph Empresa["ACCTKD — Organización"]
        GER["Gerencia<br/>C. Cabrera Nole"]
        ACAD["Dirección académica<br/>Maestro 6° Dan"]
        ADM["Área Administrativa-TI<br/>Practicante Ing. Sistemas"]
    end

    ERP["Sistema ERP ACCTKD<br/>(procesos digitalizados)"]

    CANAL["WhatsApp / Teléfono<br/>(comunicación cobro)"]

    APO <-->|"Matrícula, pagos, consultas"| GER
    GER <-->|"Supervisión, reportes"| ERP
    ACAD <-->|"Lista, asistencia"| ERP
    ADM -->|"Desarrollo y soporte"| ERP
    ERP -->|"Recordatorio cobro"| CANAL
    CANAL --> APO
    FDNT -.->|"v1.2 campeonatos"| ERP
```

**Figura 1: Arquitectura de negocio — capacidades, procesos y contexto organizacional**  
*Fuente: Elaboración propia.*

---

## Diagrama 2 — Arquitectura de aplicaciones

### 2.1 Descripción

La **arquitectura de aplicaciones** describe **cómo se organiza el software**: capas, módulos, servicios, integraciones y despliegue. ACCTKD v1.0 sigue una arquitectura **JAMStack serverless** de tres capas: presentación (Next.js 16), lógica de aplicación (servicios JS) y persistencia (Supabase/PostgreSQL).

### 2.2 Vista por capas lógicas

```mermaid
flowchart TB
    subgraph Cliente["Capa cliente"]
        WEB["Navegador web<br/>PC / móvil / PWA"]
    end

    subgraph Presentacion["Capa de presentación — Vercel Edge"]
        NEXT["Next.js 16 App Router<br/>React 19 + Turbopack"]
        UI["Diseño iOS<br/>globals.css + Tailwind v4"]
        PAGES["Módulos admin:<br/>Login · Dashboard · Alumnos<br/>Asistencia · Pagos · Maestros"]
    end

    subgraph Aplicacion["Capa de lógica de aplicación"]
        S1["asistencia.service.js"]
        S2["pagoAlerts.service.js"]
        S3["alumno / maestro / auth"]
        FMT["format.js<br/>fechas, dinero, WhatsApp"]
    end

    subgraph Integracion["Capa de integración"]
        SBCLIENT["@supabase/supabase-js<br/>cliente REST"]
    end

    subgraph Backend["Capa de servicios backend — Supabase Cloud"]
        API["PostgREST API"]
        AUTH["Autenticación / sesión"]
        RLS["Row Level Security"]
    end

    subgraph Externo["Servicios externos"]
        WA["WhatsApp wa.me<br/>(enlace cobro)"]
        GH["GitHub<br/>CI/CD → Vercel"]
    end

    WEB --> NEXT
    NEXT --> UI --> PAGES
    PAGES --> S1 & S2 & S3 & FMT
    S1 & S2 & S3 --> SBCLIENT
    SBCLIENT --> API & AUTH
    API --> RLS
    PAGES --> WA
    GH --> NEXT
```

### 2.3 Vista de componentes por módulo funcional

```mermaid
flowchart LR
    subgraph Modulos["Aplicación ACCTKD-Administración"]
        M1["/login<br/>Autenticación"]
        M2["/admin/dashboard<br/>Indicadores"]
        M3["/admin/alumnos<br/>CRUD + badges mensualidad"]
        M4["/admin/asistencia<br/>Día/Sem/Mes/Rango<br/>Todos los horarios"]
        M5["/admin/pagos<br/>Cobros + resumen mes<br/>Alertas 7 días"]
        M6["/admin/maestros<br/>Titular turnos"]
    end

    subgraph Servicios["Servicios compartidos"]
        SV1["pagoAlerts.service"]
        SV2["asistencia.service"]
        SV3["supabase.js"]
    end

    M1 --> SV3
    M2 --> SV1 & SV3
    M3 --> SV1 & SV3
    M4 --> SV2 & SV3
    M5 --> SV1 & SV3
    M6 --> SV3
```

### 2.4 Vista de despliegue (deployment)

```mermaid
flowchart TB
    DEV["Desarrollador<br/>Luigi Robles"]
    GIT["GitHub<br/>acctkd-administracion / main"]
    VERCEL["Vercel<br/>Build Next.js 16<br/>Región gru1"]
    USER["Gerente / Maestro<br/>Trujillo UTC-5"]

    SUPA["Supabase Cloud<br/>PostgreSQL 17.6<br/>Migraciones + RLS"]

    DEV -->|push| GIT
    GIT -->|webhook CI/CD| VERCEL
    USER -->|HTTPS| VERCEL
    VERCEL -->|HTTPS REST| SUPA
```

**Figura 2: Arquitectura de aplicaciones — capas, módulos y despliegue**  
*Fuente: Elaboración propia.*

---

## Diagrama 3 — Arquitectura de datos

### 3.1 Descripción

La **arquitectura de datos** define **qué información se almacena**, **cómo se relaciona** y **cómo se protege**. ACCTKD centraliza datos en PostgreSQL 17 administrado por Supabase, organizados en dominios: **maestros/catálogos**, **operacionales transaccionales** y **seguridad/acceso**.

### 3.2 Dominios de datos

| Dominio | Tablas principales | Propósito |
|---------|-------------------|-----------|
| **Organización** | sede, turno, maestro, maestro_turno | Estructura física y horaria de la academia |
| **Académico** | alumno, grado_marcial, historial_grados, clase, asistencia_alumno | Matrícula, progreso marcial, asistencia |
| **Financiero** | plan_mensualidad, pago, concepto_pago, metodo_pago, descuento | Cobranza y trazabilidad de pagos |
| **Seguridad** | usuario, rol + políticas RLS | Acceso por rol (admin, maestro, alumno, organizador) |
| **Extensión v1.2+** | campeonato, examen_programado, comunicado | Roadmap |

### 3.3 Modelo entidad-relación (núcleo v1.0)

```mermaid
erDiagram
    SEDE ||--o{ TURNO : tiene
    SEDE ||--o{ ALUMNO : matricula
    SEDE ||--o{ MAESTRO : emplea
    SEDE ||--o{ PAGO : registra

    TURNO ||--o{ CLASE : genera
    TURNO ||--o{ ALUMNO : asigna
    TURNO }o--o{ MAESTRO : titular_via_maestro_turno

    MAESTRO ||--o{ CLASE : imparte

    ALUMNO ||--o{ ASISTENCIA_ALUMNO : marca
    CLASE ||--o{ ASISTENCIA_ALUMNO : contiene

    ALUMNO }o--|| PLAN_MENSUALIDAD : contrata
    ALUMNO ||--o{ PAGO : genera
    ALUMNO }o--|| GRADO_MARCIAL : grado_actual
    ALUMNO ||--o{ HISTORIAL_GRADOS : promociones

    CONCEPTO_PAGO ||--o{ PAGO : clasifica
    METODO_PAGO ||--o{ PAGO : canal
    PLAN_MENSUALIDAD ||--o{ PAGO : referencia

    USUARIO }o--|| ROL : tiene
    USUARIO ||--o| MAESTRO : vinculo_opcional
    USUARIO ||--o| ALUMNO : vinculo_opcional

    SEDE {
        int id_sede PK
        string nombre
        string distrito
    }
    TURNO {
        int id_turno PK
        int id_sede FK
        string nombre
        time hora_inicio
        time hora_fin
        int[] dias_array
    }
    CLASE {
        int id_clase PK
        int id_turno FK
        int id_maestro FK
        date fecha
    }
    ALUMNO {
        int id_alumno PK
        string nombres
        string apellidos
        string dni
        int id_turno FK
        int id_plan FK
        int id_grado_actual FK
        string estado
    }
    ASISTENCIA_ALUMNO {
        int id PK
        int id_clase FK
        int id_alumno FK
        bool presente
        bool justificado
    }
    PAGO {
        int id_pago PK
        int id_alumno FK
        numeric monto
        numeric descuento
        numeric monto_final "GENERATED"
        date fecha_pago
        date fecha_vencimiento
        string estado
    }
    MAESTRO {
        int id_maestro PK
        string nombres
        string apellidos
        int dan_nivel
        int id_sede FK
    }
    PLAN_MENSUALIDAD {
        int id_plan PK
        string codigo
        numeric monto
        int dias_semana
    }
```

### 3.4 Flujo de datos — procesos críticos

```mermaid
flowchart LR
    subgraph Ingesta["Captura de datos"]
        UI1["Formulario alumno"]
        UI2["Marcar asistencia"]
        UI3["Registrar pago"]
    end

    subgraph Validacion["Reglas de negocio en app"]
        R1["Plan → monto sugerido"]
        R2["Vencimiento → badge vencido/próximo"]
        R3["Turno → clases por fecha"]
    end

    subgraph Persistencia["PostgreSQL 17 — Supabase"]
        T1[(alumno)]
        T2[(clase / asistencia_alumno)]
        T3[(pago)]
    end

    subgraph Salida["Consultas / reportes"]
        Q1["Dashboard totales"]
        Q2["Resumen cobranza mes"]
        Q3["Matriz asistencia"]
    end

    UI1 --> R1 --> T1
    UI2 --> R3 --> T2
    UI3 --> R2 --> T3
    T1 & T2 & T3 --> Q1 & Q2 & Q3
```

### 3.5 Seguridad de datos (RLS)

```mermaid
flowchart TB
    REQ["Petición HTTPS<br/>+ JWT / sesión"]
    API["PostgREST"]
    RLS["Políticas RLS<br/>por rol"]
    DATA[(Tablas public)]

    REQ --> API --> RLS
    RLS -->|"rol admin"| DATA
    RLS -->|"rol maestro"| DATA
    RLS -->|"rol alumno (futuro)"| DATA
```

**Figura 3: Arquitectura de datos — dominios, modelo ER, flujos y seguridad**  
*Fuente: Elaboración propia.*

---

## Diagrama 2 compuesto (opción: dos láminas para entrega)

Si el docente exige **exactamente dos diagramas**, usar:

| Lámina | Contenido |
|--------|-----------|
| **Diagrama 1** | Toda la sección «Arquitectura de negocio» (Figura 1) |
| **Diagrama 2** | «Arquitectura de aplicaciones» (capas + despliegue) **+** «Arquitectura de datos» (ER + flujo) en una sola figura técnica |

```mermaid
flowchart TB
    subgraph NegocioResumen["(Referencia negocio — ver Diagrama 1)"]
        P["Procesos: Matrícula → Clase → Asistencia → Cobranza → Reporte"]
    end

    subgraph Apps["Arquitectura de aplicaciones"]
        A1["Next.js 16 / React 19"]
        A2["Services JS"]
        A3["Supabase Client"]
    end

    subgraph Datos["Arquitectura de datos"]
        D1["Dominios: Org · Académico · Financiero"]
        D2["PostgreSQL 17 + RLS"]
    end

    P --> A1 --> A2 --> A3 --> D2
    D1 --> D2
```

---

## Texto para insertar en el informe (Capítulo III — sección 3.2.3 a 3.2.4)

### Arquitectura de negocio

La arquitectura de negocio del proyecto ACCTKD describe los procesos que la academia necesita sostener: matrícula y asignación de plan-turno, operación de clases en nueve horarios semanales, control de asistencia, emisión y seguimiento de mensualidades, y generación de reportes para la gerencia. Los actores principales son el gerente (Christopher Cabrera Nole), el maestro titular, el practicante de sistemas y los apoderados. El ERP no reemplaza la relación humana de la academia, sino que ordena la información que antes permanecía en cuadernos, hojas sueltas y archivos Excel.

### Arquitectura de aplicaciones

La solución se implementó con arquitectura de tres capas serverless: (1) presentación en Next.js 16 desplegado en Vercel; (2) lógica encapsulada en servicios JavaScript (`asistencia.service.js`, `pagoAlerts.service.js`, entre otros); (3) persistencia en Supabase Cloud con PostgreSQL 17.6 y Row Level Security. Los módulos funcionales corresponden a login, dashboard, alumnos, asistencia, pagos y maestros. La integración con WhatsApp se realiza mediante enlaces `wa.me` generados desde el módulo de pagos.

### Arquitectura de datos

Los datos se organizan en dominios de organización (sede, turno, maestro), académico (alumno, grado, clase, asistencia) y financiero (plan, pago, concepto, método). El modelo relacional garantiza integridad referencial; el campo `monto_final` de la tabla `pago` es calculado automáticamente. Al cierre de la v1.0 la base productiva administra 1 sede, 9 turnos, 60 alumnos, 366 clases, 770 asistencias y 144 pagos. Las políticas RLS segmentan el acceso según rol de usuario.

---

## Métricas de referencia (mayo 2026)

- 1 sede · 9 turnos · 3 planes (S/100, S/130, S/180)
- 60 alumnos (55 activos) · 1 maestro titular 6° Dan
- 366 clases · 770 asistencias · 144 pagos
- Repo: https://github.com/luigirobles04/acctkd-administracion
- Deploy: https://acctkd-administracion.vercel.app

---

*Elaborado por Robles Palacios, Luigi Armando — UCV Ingeniería de Sistemas — Mayo 2026.*
