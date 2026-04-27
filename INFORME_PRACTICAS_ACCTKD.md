# INFORME DE PRÁCTICAS PREPROFESIONALES I

## ACCTKDMINISTRACIÓN: Sistema Web de Gestión Administrativa para la Academia Christopher Cabrera Tae Kwon Do

**Escuela Profesional:** Ingeniería de Sistemas  
**Empresa:** Christopher Cabrera Tae Kwon Do  
**Practicante:** Luigi Armando Robles Palacios  
**Docente (Teoría):** [Completar]  
**Supervisor (Docente JP):** [Completar]  
**Jefe inmediato en la empresa:** Christopher Cabrera Salazar  
**Periodo de prácticas:** [Completar]  
**Ciudad:** Trujillo, Perú  

---

## RESUMEN EJECUTIVO

El presente informe describe el trabajo desarrollado durante las prácticas preprofesionales en la academia Christopher Cabrera Tae Kwon Do, organización dedicada a la formación deportiva y competitiva en taekwondo. La necesidad principal identificada fue la falta de un sistema digital integrado para administrar alumnos, maestros, asistencia y procesos asociados, lo cual generaba retrasos operativos, reprocesos y riesgo de pérdida de información.

Frente a este escenario, se diseñó y construyó **ACCTKDMINISTRACIÓN**, una aplicación web orientada a la gestión interna de la academia. La solución se implementó con un enfoque incremental y se desplegó en la nube para uso real del equipo administrativo. En esta primera fase se priorizó un MVP funcional con módulos críticos: gestión de alumnos, gestión de maestros, control de asistencia por turno y un tablero inicial de indicadores.

A nivel técnico, se utilizó una arquitectura moderna basada en Next.js para frontend y Supabase/PostgreSQL para persistencia de datos y reglas de seguridad. El despliegue se realizó en Vercel, permitiendo automatizar compilación y publicación por versiones a partir del repositorio GitHub.

Los resultados obtenidos muestran una mejora concreta en trazabilidad y velocidad de operación diaria. Procesos que antes dependían de listas físicas o archivos dispersos ahora pueden ejecutarse, consultarse y auditarse desde una misma plataforma. Además, la solución deja preparada la base de datos y la estructura de servicios para incorporar en siguientes iteraciones los módulos de pagos, exámenes de grado programables, campeonatos y comunicados.

**Palabras clave:** transformación digital, gestión deportiva, taekwondo, Next.js, Supabase, PWA, control administrativo.

---

## ÍNDICE

- Capítulo I: Generalidades  
  - 1.1 Descripción del sector  
  - 1.2 Descripción general de la empresa  
    - 1.2.1 Breve descripción general de la empresa  
    - 1.2.2 Organización de la empresa  
    - 1.2.3 Organización del área donde se realizaron las prácticas  
  - 1.3 Funciones del ingeniero  
    - 1.3.1 Funciones del área en donde se realiza la práctica  
    - 1.3.2 Perfil del profesional y descripción del puesto  
- Capítulo II: Descripción del proyecto  
  - 2.1 Título  
  - 2.2 Realidad problemática  
  - 2.3 Definición del problema  
  - 2.4 Antecedentes  
  - 2.5 Objetivos  
    - 2.5.1 Objetivo general  
    - 2.5.2 Objetivos específicos  
- Capítulo III: Desarrollo del proyecto  
  - 3.1 Marco teórico  
  - 3.2 Desarrollo  
  - 3.3 Análisis de resultados y experiencia  
  - 3.4 Conclusiones  
  - 3.5 Sugerencias  
- Documentos de sustento  
- Referencias bibliográficas  
- Anexos

---

## CAPÍTULO I: GENERALIDADES

### 1.1 Descripción del sector

El proyecto se desarrolla dentro del sector de **servicios deportivos y formación extracurricular**, específicamente en el rubro de academias de artes marciales. En este tipo de organizaciones, la experiencia del alumno y la continuidad del servicio dependen no solo del componente técnico-deportivo, sino también de la capacidad administrativa para gestionar matrículas, asistencia, pagos, horarios, comunicación y seguimiento del progreso.

En el contexto peruano, muchas academias de tamaño pequeño y mediano siguen operando con procedimientos manuales (cuadernos, hojas sueltas, mensajes por WhatsApp y archivos Excel aislados). Si bien estos mecanismos funcionan en etapas iniciales, presentan limitaciones cuando el volumen de alumnos crece: duplicidad de datos, errores de consolidación, poca trazabilidad histórica y dependencia de personas puntuales para “recordar” estados administrativos.

El crecimiento de herramientas cloud y plataformas low-ops ha abierto una oportunidad clara para profesionalizar la gestión en este sector sin exigir grandes inversiones en infraestructura propia. Implementar un sistema web especializado permite estandarizar procesos, reducir tiempos operativos y tomar decisiones basadas en información verificable.

Desde esta perspectiva, el proyecto ACCTKDMINISTRACIÓN se alinea con una necesidad real del sector: digitalizar operaciones cotidianas con una solución accesible, escalable y adaptada al contexto de una academia deportiva peruana.

### 1.2 Descripción general de la empresa

#### 1.2.1 Breve descripción general de la empresa

**Christopher Cabrera Tae Kwon Do** es una academia dedicada a la formación integral en taekwondo, con enfoque técnico, competitivo y formativo. Atiende población infantil, juvenil y adulta, y desarrolla actividades de entrenamiento regular, evaluación de grados y participación en campeonatos.

La academia mantiene una cultura centrada en disciplina, constancia, respeto y mejora continua. Además de su labor deportiva, ha ido fortaleciendo sus procesos administrativos para responder al crecimiento de matrícula y al aumento de actividades internas y externas.

En el periodo de prácticas, la organización contaba con aproximadamente **150 alumnos activos**, diversos turnos de entrenamiento y proyección de eventos con alta participación, lo que confirmó la necesidad de contar con un sistema administrativo formal.

#### 1.2.2 Organización de la empresa

La estructura de la academia es funcional y orientada a operación diaria:

- Dirección general (toma de decisiones estratégicas y deportivas).
- Coordinación administrativa (inscripciones, seguimiento y soporte operativo).
- Cuerpo técnico de maestros (ejecución de entrenamientos y acompañamiento formativo).
- Apoyo operativo para actividades y eventos.

La coordinación entre estas áreas es constante, y gran parte de la efectividad organizacional depende de contar con información actualizada y accesible para todos los responsables.

#### 1.2.3 Organización del área donde se realizaron las prácticas

Las prácticas se desarrollaron en el frente de **análisis y desarrollo de sistemas**, trabajando directamente con la dirección y administración para identificar necesidades, traducirlas en requerimientos funcionales y construir una solución usable en contexto real.

El flujo de trabajo del practicante incluyó:

1. Levantamiento de procesos actuales.
2. Priorización de funcionalidades por impacto operativo.
3. Diseño de base de datos y arquitectura de aplicación.
4. Construcción iterativa de módulos.
5. Pruebas funcionales con datos reales.
6. Ajustes de UI/UX según retroalimentación.
7. Publicación en entorno productivo.

Esta dinámica permitió mantener una relación directa entre necesidad del usuario y entrega técnica.

### 1.3 Funciones del ingeniero

#### 1.3.1 Funciones del área en donde se realiza la práctica

Dentro del área técnica, las funciones principales consideradas fueron:

- Analizar problemas operativos y convertirlos en requerimientos claros.
- Diseñar modelos de datos robustos y mantenibles.
- Implementar funcionalidades web con enfoque en usabilidad y rendimiento.
- Asegurar integridad y acceso controlado de información.
- Versionar cambios y publicar entregas en la nube.
- Documentar avances y decisiones para continuidad del proyecto.

#### 1.3.2 Perfil del profesional y descripción del puesto

El perfil requerido para este contexto combina capacidades técnicas y de gestión:

- Base en ingeniería de software y bases de datos.
- Dominio de tecnologías web actuales.
- Capacidad de comunicación con usuarios no técnicos.
- Criterio para priorizar alcance por fases.
- Responsabilidad en documentación y calidad de entregables.

El puesto de práctica implicó el rol de **analista-desarrollador**, con responsabilidad de extremo a extremo: comprender el problema, proponer solución, implementarla, probarla y dejar evidencia de su funcionamiento.

---

## CAPÍTULO II: DESCRIPCIÓN DEL PROYECTO

### 2.1 Título

**ACCTKDMINISTRACIÓN: Sistema Web de Gestión Administrativa para la Academia Christopher Cabrera Tae Kwon Do.**

### 2.2 Realidad problemática

Antes del proyecto, los procesos administrativos estaban fragmentados. El registro de alumnos, control de asistencia, seguimiento de maestros y consultas históricas se realizaban en medios distintos y con baja estandarización. Esta situación generaba cuatro efectos directos:

1. **Tiempo de operación elevado:** la información debía reconstruirse en cada cierre o consulta.
2. **Riesgo de inconsistencia:** existían diferencias entre registros por duplicidad o actualización tardía.
3. **Baja trazabilidad:** era difícil reconstruir historial por alumno o por turno.
4. **Dependencia de memoria operativa:** varias decisiones dependían de conocimiento no formalizado.

Con el crecimiento de alumnos y actividades, continuar con ese modelo incrementaba el riesgo administrativo y limitaba la capacidad de planificación.

### 2.3 Definición del problema

El problema central se define así:

> La academia no contaba con una plataforma integrada para gestionar sus procesos administrativos críticos, lo que provocaba ineficiencia operativa, pérdida de trazabilidad y dificultad para tomar decisiones oportunas.

En consecuencia, se planteó el diseño e implementación de un sistema web orientado al uso real del equipo interno, priorizando primero los procesos de mayor frecuencia e impacto diario.

### 2.4 Antecedentes

Durante el análisis inicial se revisaron referencias funcionales y técnicas:

- Experiencias previas de gestión en academias con herramientas genéricas (Excel, formularios, mensajería).
- Referencias de sistemas administrativos deportivos usados como guía funcional.
- Documentación de plataformas modernas para desarrollo web y backend administrado.

A partir de esa revisión se concluyó que la mejor estrategia para este proyecto era construir una solución propia, con alcance incremental y adaptada al flujo real de la academia, evitando depender de herramientas cerradas que no cubrían reglas específicas del dominio.

### 2.5 Objetivos

#### 2.5.1 Objetivo general

Diseñar, implementar y desplegar un sistema web administrativo para la academia Christopher Cabrera Tae Kwon Do que permita centralizar y optimizar la gestión de alumnos, maestros y asistencia en una primera etapa funcional.

#### 2.5.2 Objetivos específicos

1. Levantar y documentar requerimientos funcionales del área administrativa y técnica.
2. Modelar una base de datos relacional que soporte procesos actuales y crecimiento futuro.
3. Construir el módulo de gestión de alumnos con información personal, académica y de apoderado.
4. Construir el módulo de gestión de maestros con turnos y datos de soporte administrativo.
5. Implementar el módulo de asistencia por turno y fecha con estados estandarizados.
6. Incorporar métricas básicas para seguimiento operativo en el panel administrativo.
7. Publicar la solución en la nube y establecer control de versiones para entregas por hito.
8. Dejar base técnica preparada para módulos posteriores (pagos, exámenes y campeonatos).

---

## CAPÍTULO III: DESARROLLO DEL PROYECTO

### 3.1 Marco teórico

#### 3.1.1 Transformación digital en pequeñas organizaciones

La transformación digital en organizaciones pequeñas no consiste únicamente en “usar software”, sino en rediseñar procesos para que la información sea confiable, compartida y trazable. Cuando una entidad opera con alto volumen de eventos (asistencia, pagos, cambios de estado), la digitalización se vuelve un factor de sostenibilidad operativa.

#### 3.1.2 Arquitectura web moderna

Se adoptó una arquitectura desacoplada de frontend + backend administrado:

- **Next.js** para construcción de interfaz, navegación y renderizado eficiente.
- **Supabase/PostgreSQL** para persistencia relacional, consultas y seguridad a nivel de datos.
- **Vercel** para despliegue continuo, versionado de builds y disponibilidad web.

Este enfoque reduce carga operativa de infraestructura y permite concentrar esfuerzo en funcionalidad de negocio.

#### 3.1.3 Diseño orientado a experiencia de usuario

El sistema se diseñó con una interfaz clara y consistente, priorizando lectura rápida y acciones frecuentes. Se aplicó un estilo visual tipo iOS, útil para personal administrativo que opera principalmente desde navegador en laptop y móvil.

#### 3.1.4 Seguridad y control de acceso

Se implementaron políticas de seguridad en base de datos para controlar acceso por tablas y operaciones. Además, se usó encriptación de contraseñas para evitar almacenamiento plano de credenciales.

### 3.2 Desarrollo

#### 3.2.1 Metodología aplicada

Se trabajó con enfoque incremental por hitos, usando una lógica tipo Kanban:

- Hito 1: base de datos y estructura de proyecto.
- Hito 2: módulo de alumnos.
- Hito 3: módulo de maestros.
- Hito 4: módulo de asistencia.
- Hito 5: estabilización y despliegue.

Cada hito incluyó análisis, implementación, prueba funcional y ajuste por feedback.

#### 3.2.2 Arquitectura de la solución

La solución quedó organizada en capas:

1. **Presentación:** páginas y componentes de interfaz.
2. **Servicios:** funciones de acceso y lógica operativa por módulo.
3. **Datos:** tablas relacionales con claves, restricciones y políticas.

Esta separación facilita mantenimiento y evolución del sistema.

#### 3.2.3 Modelo de datos implementado

Se construyó un esquema relacional que contempla entidades administrativas y académicas. Entre las tablas principales:

- `usuario`, `rol`
- `sede`
- `alumno`, `apoderado`
- `maestro`, `maestro_turno`, `planilla_maestro`
- `turno`, `clase`
- `asistencia_alumno`, `asistencia_maestro`
- `pago`, `concepto_pago`, `metodo_pago`, `plan_mensualidad`
- `campeonato` y entidades relacionadas (base preparada)
- `examen_programado` y entidades relacionadas (base preparada)

Se incluyeron restricciones para evitar duplicidades, por ejemplo en asistencia por clase/alumno y en clase por turno/fecha.

#### 3.2.4 Módulos desarrollados

##### A. Módulo de alumnos

Funciones principales implementadas:

- Registro, edición y consulta de alumnos.
- Gestión de apoderado y datos de contacto.
- Datos médicos relevantes para operación.
- Asignación de plan, turno y estado.
- Vista de detalle con información consolidada.

Valor operativo: centraliza la información más consultada por administración y reduce el uso de formatos paralelos.

##### B. Módulo de maestros

Funciones principales implementadas:

- Registro y actualización de maestros.
- Asignación de turnos.
- Datos de certificación y soporte administrativo.
- Vista de detalle con información consolidada.

Valor operativo: mejora el control interno de personal técnico y simplifica consultas de programación.

##### C. Módulo de asistencia

Funciones principales implementadas:

- Selección de fecha y turno.
- Carga de alumnos asignados al turno.
- Marcación por estados: Presente, Ausente, Justificada y Recuperación.
- Guardado por registro y acción masiva de “todos presentes”.
- Resumen inmediato de resultados por sesión.

Valor operativo: convierte un proceso repetitivo y manual en un flujo rápido, consistente y medible.

##### D. Dashboard inicial

Funciones principales implementadas:

- Indicadores generales de estado del sistema.
- Acceso rápido a módulos operativos.

Valor operativo: facilita visión global y navegación para usuarios administrativos.

#### 3.2.5 Diseño de interfaz

Se definieron componentes reutilizables para mantener consistencia visual y reducir retrabajo:

- tarjetas informativas,
- formularios estructurados,
- chips de estado,
- tablas/listas tipo data-row,
- navegación lateral y móvil.

Se ajustó además el manejo de textos largos para evitar desbordes visuales y mantener legibilidad.

#### 3.2.6 Despliegue y versionado

El proyecto fue versionado en GitHub y desplegado en Vercel, logrando:

- build automático por commit,
- publicación en URL de producción,
- control por versiones para presentaciones por hito.

Esto permitió pasar de entorno local a entorno productivo verificable.

### 3.3 Análisis de resultados y experiencia

#### 3.3.1 Resultados obtenidos

Resultados técnicos y funcionales de esta fase:

- Sistema web operativo en producción.
- Módulos de alumnos, maestros y asistencia funcionales.
- Base de datos estructurada para continuidad del roadmap.
- Interfaz usable en escritorio y móvil.
- Proceso de despliegue y actualización repetible.

Desde la perspectiva de usuario, se logró reducir tiempo de consulta y mejorar orden administrativo, especialmente en registro de asistencia y ficha de alumno.

#### 3.3.2 Dificultades y resolución

Durante el proceso se presentaron incidencias técnicas relevantes:

- diferencias de render entre servidor y cliente,
- restricciones de acceso por políticas de base de datos,
- ajustes de interfaz por desbordes de contenido,
- estabilización de sesión para navegación segura.

Cada incidencia se resolvió con ajustes puntuales de arquitectura, validación de estados y mejora de componentes, dejando el sistema más robusto para la siguiente etapa.

#### 3.3.3 Aprendizaje profesional

La práctica fortaleció capacidades en:

- análisis de requerimientos reales,
- diseño de datos orientado a negocio,
- desarrollo iterativo con usuarios finales,
- despliegue cloud y control de versiones,
- documentación técnica y comunicación de resultados.

Además, permitió comprender que una solución de calidad no depende solo de programar, sino de conectar tecnología con operación real, prioridades del cliente y sostenibilidad del producto.

### 3.4 Conclusiones

1. Se cumplió el objetivo de construir y desplegar una primera versión funcional del sistema administrativo para la academia.
2. La digitalización de alumnos, maestros y asistencia resolvió problemas operativos críticos identificados al inicio.
3. La arquitectura elegida demostró ser adecuada para escalar por módulos sin reescritura total.
4. El uso de despliegue continuo y versionado permitió ordenar entregas y facilitar presentación por hitos.
5. El proyecto evidencia que una PYME deportiva puede adoptar tecnología moderna con alto impacto y bajo costo relativo.

### 3.5 Sugerencias

1. Formalizar el uso del sistema mediante una rutina operativa diaria y responsable por módulo.
2. Continuar con el roadmap priorizando pagos y exámenes de grado en la siguiente fase.
3. Implementar pruebas automatizadas para funciones críticas antes de cada release.
4. Mantener documentación viva de cambios funcionales y técnicos por versión.
5. Consolidar evidencias (capturas, reportes, actas) para sustentar calidad y mejora continua.

---

## DOCUMENTOS DE SUSTENTO DEL ALUMNO

1. Curriculum vitae no documentado.  
2. Evidencia de práctica o trabajo con firma y sello (constancia/certificado/convenio).  
3. Plan de prácticas con firma y sello.  
4. Acta de primera supervisión (incluyendo nombre y cargo de quien responde).  
5. Carta de conformidad con firma y sello.  
6. Acta de segunda supervisión (incluyendo nombre y cargo de quien responde).  

---

## REFERENCIAS BIBLIOGRÁFICAS (FORMATO APA 7)

Anderson, D. J. (2010). *Kanban: Successful evolutionary change for your technology business*. Blue Hole Press.

Apple. (2024). *Human Interface Guidelines*. https://developer.apple.com/design/human-interface-guidelines

Fowler, M. (2021). *Continuous Integration*. https://martinfowler.com/articles/continuousIntegration.html

PostgreSQL Global Development Group. (2024). *PostgreSQL documentation*. https://www.postgresql.org/docs/

Pressman, R. S., & Maxim, B. R. (2019). *Software engineering: A practitioner’s approach* (9th ed.). McGraw-Hill.

Supabase. (2024). *Supabase documentation*. https://supabase.com/docs

Vercel. (2024). *Next.js documentation*. https://nextjs.org/docs

World Taekwondo. (2024). *Competition rules and interpretation*. http://www.worldtaekwondo.org

> Nota: agrega aquí las fuentes locales o institucionales específicas que cites en el cuerpo del informe (IPD, documentos de la empresa, actas, manuales internos, etc.).

---

## ANEXOS

### Anexo 1. Evidencias funcionales del sistema

- Pantalla de login.
- Dashboard principal.
- Módulo de alumnos (lista y ficha).
- Módulo de maestros (lista y ficha).
- Módulo de asistencia por turno.

### Anexo 2. Evidencias técnicas

- Esquema principal de base de datos.
- Migraciones aplicadas.
- Captura de despliegue en Vercel.
- Captura de repositorio y versión en GitHub.

### Anexo 3. Control de versiones para exposiciones

- **v0.1-demo:** alumnos, maestros, asistencia, dashboard base.  
- **v0.2-beta:** pagos + mejoras de estabilidad (propuesto).  
- **v1.0-final:** campeonatos, exámenes programables, comunicados (propuesto).  

---

## APÉNDICE: MATRIZ DE CUMPLIMIENTO DE RÚBRICA (AUTOEVALUACIÓN)

| Criterio de rúbrica | Evidencia en este informe |
|---|---|
| Tema y metodología | Título preciso y metodología incremental definida en 3.2.1 |
| Estructura | Desarrollo completo por capítulos y subcapítulos según plantilla |
| Subtemas | Numeración jerárquica y secuencia lógica |
| Ideas principales | Cada sección inicia con idea guía y cierre explícito |
| Redacción | Estilo formal, coherente y sin lenguaje telegráfico |
| Referencias y citas | Referencias APA 7 incluidas y ampliables con fuentes internas |
| Responsabilidad | Documento estructurado para entrega + checklist de anexos |

---

### Declaración final

El presente informe refleja, de forma fiel y documentada, las actividades ejecutadas durante la práctica preprofesional y los resultados obtenidos en la primera fase del sistema ACCTKDMINISTRACIÓN. Se deja constancia de que la solución se encuentra operativa y en proceso de evolución por versiones para cubrir el alcance total del proyecto.
