-- =================================================================
-- ACCTKD · Migración 2026-04-20 · Enhance schema
-- Christopher Cabrera Taekwondo · Sistema Administrativo
--
-- Añade planes, conceptos de pago, exámenes programados,
-- inscripciones de campeonato, comunicados, poomsae, descuentos
-- en pagos, archivos de alumno, y completa columnas faltantes.
-- =================================================================

-- ─── 1. CATÁLOGOS BÁSICOS ────────────────────────────────────────

-- Método de pago (catálogo)
CREATE TABLE IF NOT EXISTS metodo_pago (
  id_metodo      SERIAL PRIMARY KEY,
  codigo         VARCHAR(20) UNIQUE NOT NULL,
  nombre         VARCHAR(50) NOT NULL,
  requiere_captura BOOLEAN DEFAULT FALSE,
  activo         BOOLEAN DEFAULT TRUE,
  orden          INTEGER DEFAULT 0
);
ALTER TABLE metodo_pago ENABLE ROW LEVEL SECURITY;

-- Concepto de pago (catálogo editable)
CREATE TABLE IF NOT EXISTS concepto_pago (
  id_concepto    SERIAL PRIMARY KEY,
  codigo         VARCHAR(40) UNIQUE NOT NULL,
  nombre         VARCHAR(80) NOT NULL,
  tipo           VARCHAR(20) NOT NULL,
  activo         BOOLEAN DEFAULT TRUE
);
ALTER TABLE concepto_pago ENABLE ROW LEVEL SECURITY;

-- Plan de mensualidad (2, 3, 5 días, etc.)
CREATE TABLE IF NOT EXISTS plan_mensualidad (
  id_plan        SERIAL PRIMARY KEY,
  id_sede        INTEGER REFERENCES sede(id_sede),
  codigo         VARCHAR(30) UNIQUE NOT NULL,
  nombre         VARCHAR(80) NOT NULL,
  dias_semana    INTEGER NOT NULL,
  dias           VARCHAR(20),
  monto          NUMERIC(10,2) NOT NULL,
  activo         BOOLEAN DEFAULT TRUE,
  orden          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plan_mensualidad ENABLE ROW LEVEL SECURITY;

-- ─── 2. USUARIO · email + nombre ─────────────────────────────────

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS email VARCHAR(120) UNIQUE,
  ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reset_token_exp TIMESTAMPTZ;

-- Rol organizador
INSERT INTO rol (nombre, descripcion)
SELECT 'organizador', 'Gestiona campeonatos, inscripciones, pesaje y llaves'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre='organizador');

-- ─── 3. ALUMNO · código, plan, estado, grado actual ──────────────

ALTER TABLE alumno
  ADD COLUMN IF NOT EXISTS codigo_alumno VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS id_plan INTEGER REFERENCES plan_mensualidad(id_plan),
  ADD COLUMN IF NOT EXISTS id_turno INTEGER REFERENCES turno(id_turno),
  ADD COLUMN IF NOT EXISTS id_grado_actual INTEGER REFERENCES grado_marcial(id_grado),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS tipo_sangre VARCHAR(5),
  ADD COLUMN IF NOT EXISTS alergias TEXT,
  ADD COLUMN IF NOT EXISTS seguro_medico VARCHAR(80),
  ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre VARCHAR(120),
  ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono VARCHAR(20),
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

CREATE INDEX IF NOT EXISTS idx_alumno_codigo ON alumno(codigo_alumno);
CREATE INDEX IF NOT EXISTS idx_alumno_estado ON alumno(estado) WHERE estado IN ('activo','prueba');
CREATE INDEX IF NOT EXISTS idx_alumno_plan ON alumno(id_plan);
CREATE INDEX IF NOT EXISTS idx_alumno_dni ON alumno(dni);

-- Check de estado válido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alumno_estado_check'
  ) THEN
    ALTER TABLE alumno ADD CONSTRAINT alumno_estado_check
      CHECK (estado IN ('activo','suspendido','retirado','prueba'));
  END IF;
END$$;

-- ─── 4. APODERADO · quitar campos no usados ──────────────────────
-- Mantenemos dirección / relacion porque ya existían. No rompemos data.

-- ─── 5. TURNO · días estructurados ───────────────────────────────

ALTER TABLE turno
  ADD COLUMN IF NOT EXISTS dias_array INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(100);

-- ─── 6. MAESTRO · sueldo + certificaciones ───────────────────────

ALTER TABLE maestro
  ADD COLUMN IF NOT EXISTS sueldo_mensual NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_kukkiwon VARCHAR(40),
  ADD COLUMN IF NOT EXISTS curso_coach_wt BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS curso_coach_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS dan_nivel INTEGER,
  ADD COLUMN IF NOT EXISTS direccion TEXT;

-- Relación maestro ↔ turno (N a N)
CREATE TABLE IF NOT EXISTS maestro_turno (
  id             SERIAL PRIMARY KEY,
  id_maestro     INTEGER NOT NULL REFERENCES maestro(id_maestro) ON DELETE CASCADE,
  id_turno       INTEGER NOT NULL REFERENCES turno(id_turno) ON DELETE CASCADE,
  es_titular     BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_maestro, id_turno)
);
ALTER TABLE maestro_turno ENABLE ROW LEVEL SECURITY;

-- Planilla mensual de maestros
CREATE TABLE IF NOT EXISTS planilla_maestro (
  id_planilla    SERIAL PRIMARY KEY,
  id_maestro     INTEGER NOT NULL REFERENCES maestro(id_maestro),
  periodo        DATE NOT NULL,
  sueldo_base    NUMERIC(10,2) NOT NULL,
  descuentos     NUMERIC(10,2) DEFAULT 0,
  bonos          NUMERIC(10,2) DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL,
  fecha_pago     DATE,
  observaciones  TEXT,
  pagado_por     INTEGER REFERENCES usuario(id_usuario),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_maestro, periodo)
);
ALTER TABLE planilla_maestro ENABLE ROW LEVEL SECURITY;

-- ─── 7. PAGO · mejoras ───────────────────────────────────────────

ALTER TABLE pago
  ADD COLUMN IF NOT EXISTS id_metodo INTEGER REFERENCES metodo_pago(id_metodo),
  ADD COLUMN IF NOT EXISTS id_concepto INTEGER REFERENCES concepto_pago(id_concepto),
  ADD COLUMN IF NOT EXISTS id_plan INTEGER REFERENCES plan_mensualidad(id_plan),
  ADD COLUMN IF NOT EXISTS id_descuento INTEGER REFERENCES descuento(id_descuento),
  ADD COLUMN IF NOT EXISTS numero_recibo VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS captura_url TEXT,
  ADD COLUMN IF NOT EXISTS periodo_desde DATE,
  ADD COLUMN IF NOT EXISTS periodo_hasta DATE;

CREATE INDEX IF NOT EXISTS idx_pago_alumno_fecha ON pago(id_alumno, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pago_vencimiento ON pago(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_pago_estado ON pago(estado);

-- ─── 8. EXÁMENES DE GRADO ────────────────────────────────────────

-- Examen programado (fecha + sede + costo)
CREATE TABLE IF NOT EXISTS examen_programado (
  id_examen      SERIAL PRIMARY KEY,
  id_sede        INTEGER REFERENCES sede(id_sede),
  nombre         VARCHAR(120) NOT NULL,
  fecha          DATE NOT NULL,
  costo_kup      NUMERIC(10,2) DEFAULT 0,
  costo_dan      NUMERIC(10,2) DEFAULT 0,
  estado         VARCHAR(20) DEFAULT 'programado',
  meses_minimos  INTEGER DEFAULT 3,
  asistencia_minima INTEGER DEFAULT 70,
  requiere_pago_al_dia BOOLEAN DEFAULT TRUE,
  observaciones  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (estado IN ('programado','inscripcion','cerrado','realizado','cancelado'))
);
ALTER TABLE examen_programado ENABLE ROW LEVEL SECURITY;

-- Candidatos al examen (listado + aprobación)
CREATE TABLE IF NOT EXISTS examen_candidato (
  id_candidato   SERIAL PRIMARY KEY,
  id_examen      INTEGER NOT NULL REFERENCES examen_programado(id_examen) ON DELETE CASCADE,
  id_alumno      INTEGER NOT NULL REFERENCES alumno(id_alumno) ON DELETE CASCADE,
  id_grado_destino INTEGER REFERENCES grado_marcial(id_grado),
  codigo_examen  VARCHAR(20),
  estado         VARCHAR(20) DEFAULT 'candidato',
  id_pago        INTEGER REFERENCES pago(id_pago),
  observaciones  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_examen, id_alumno),
  CHECK (estado IN ('candidato','inscrito','aprobado','desaprobado','ausente'))
);
ALTER TABLE examen_candidato ENABLE ROW LEVEL SECURITY;

-- Historial de grados: añadir código
ALTER TABLE historial_grados
  ADD COLUMN IF NOT EXISTS codigo_examen VARCHAR(20),
  ADD COLUMN IF NOT EXISTS id_examen INTEGER REFERENCES examen_programado(id_examen);

CREATE UNIQUE INDEX IF NOT EXISTS idx_historial_grados_codigo
  ON historial_grados(codigo_examen) WHERE codigo_examen IS NOT NULL;

-- ─── 9. CAMPEONATOS · nivel 2 ────────────────────────────────────

ALTER TABLE campeonato
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'abierto',
  ADD COLUMN IF NOT EXISTS disciplinas VARCHAR(50) DEFAULT 'kyorugi,poomsae',
  ADD COLUMN IF NOT EXISTS monto_inscripcion NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_cierre_inscripcion DATE,
  ADD COLUMN IF NOT EXISTS numero_inicial_dorsal INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT,
  ADD COLUMN IF NOT EXISTS link_inscripcion_publico VARCHAR(40),
  ADD COLUMN IF NOT EXISTS template_competidor_url TEXT,
  ADD COLUMN IF NOT EXISTS template_coach_url TEXT,
  ADD COLUMN IF NOT EXISTS template_delegado_url TEXT,
  ADD COLUMN IF NOT EXISTS template_oficial_url TEXT,
  ADD COLUMN IF NOT EXISTS template_staff_url TEXT,
  ADD COLUMN IF NOT EXISTS dias_evento INTEGER DEFAULT 1;

-- Categorías editables + modalidad + grado
ALTER TABLE categoria_campeonato
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) DEFAULT 'kyorugi',
  ADD COLUMN IF NOT EXISTS division VARCHAR(40),
  ADD COLUMN IF NOT EXISTS grado_rango VARCHAR(40),
  ADD COLUMN IF NOT EXISTS anio_nacimiento_desde INTEGER,
  ADD COLUMN IF NOT EXISTS anio_nacimiento_hasta INTEGER,
  ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- Inscripción (grupo) de academias externas
CREATE TABLE IF NOT EXISTS inscripcion_campeonato (
  id_inscripcion   SERIAL PRIMARY KEY,
  id_campeonato    INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  codigo_academia  VARCHAR(20),
  nombre_academia  VARCHAR(150) NOT NULL,
  coach_nombres    VARCHAR(120),
  coach_apellidos  VARCHAR(120),
  coach_dni        VARCHAR(15),
  coach_telefono   VARCHAR(20),
  coach_correo     VARCHAR(120),
  cantidad_competidores INTEGER DEFAULT 0,
  monto_total      NUMERIC(10,2) DEFAULT 0,
  captura_pago_url TEXT,
  estado           VARCHAR(20) DEFAULT 'pendiente',
  aprobado_por     INTEGER REFERENCES usuario(id_usuario),
  fecha_aprobacion TIMESTAMPTZ,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (estado IN ('pendiente','aprobada','rechazada'))
);
ALTER TABLE inscripcion_campeonato ENABLE ROW LEVEL SECURITY;

-- Competidor: muchos campos nuevos
ALTER TABLE competidor
  ADD COLUMN IF NOT EXISTS id_inscripcion INTEGER REFERENCES inscripcion_campeonato(id_inscripcion) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'competidor',
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) DEFAULT 'kyorugi',
  ADD COLUMN IF NOT EXISTS nombres VARCHAR(120),
  ADD COLUMN IF NOT EXISTS apellidos VARCHAR(120),
  ADD COLUMN IF NOT EXISTS sexo CHAR(1),
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS grado VARCHAR(30),
  ADD COLUMN IF NOT EXISTS peso_inscripcion NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS peso_oficial NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pesaje_estado VARCHAR(20) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS dias_acceso INTEGER[] DEFAULT ARRAY[1],
  ADD COLUMN IF NOT EXISTS qr_codigo VARCHAR(40) UNIQUE,
  ADD COLUMN IF NOT EXISTS dorsal INTEGER,
  CHECK (tipo IN ('competidor','coach','delegado','oficial','staff')),
  CHECK (modalidad IN ('kyorugi','poomsae_individual','poomsae_pareja','poomsae_equipo'));

-- Pesaje
CREATE TABLE IF NOT EXISTS pesaje_campeonato (
  id_pesaje      SERIAL PRIMARY KEY,
  id_competidor  INTEGER NOT NULL REFERENCES competidor(id_competidor) ON DELETE CASCADE,
  peso_oficial   NUMERIC(5,2) NOT NULL,
  categoria_original INTEGER REFERENCES categoria_campeonato(id_categoria),
  categoria_final INTEGER REFERENCES categoria_campeonato(id_categoria),
  resultado      VARCHAR(20) DEFAULT 'ok',
  pesado_por     INTEGER REFERENCES usuario(id_usuario),
  fecha_pesaje   TIMESTAMPTZ DEFAULT NOW(),
  observaciones  TEXT,
  CHECK (resultado IN ('ok','subido','descalificado'))
);
ALTER TABLE pesaje_campeonato ENABLE ROW LEVEL SECURITY;

-- Poomsae (3-5 jueces, precisión + presentación)
CREATE TABLE IF NOT EXISTS poomsae_ronda (
  id_ronda       SERIAL PRIMARY KEY,
  id_categoria   INTEGER NOT NULL REFERENCES categoria_campeonato(id_categoria) ON DELETE CASCADE,
  nombre         VARCHAR(40) NOT NULL,
  orden          INTEGER DEFAULT 1,
  estado         VARCHAR(20) DEFAULT 'pendiente',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE poomsae_ronda ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS poomsae_puntuacion (
  id_puntuacion  SERIAL PRIMARY KEY,
  id_ronda       INTEGER NOT NULL REFERENCES poomsae_ronda(id_ronda) ON DELETE CASCADE,
  id_competidor  INTEGER NOT NULL REFERENCES competidor(id_competidor) ON DELETE CASCADE,
  juez_numero    INTEGER NOT NULL,
  precision_pts  NUMERIC(4,2) DEFAULT 0,
  presentacion_pts NUMERIC(4,2) DEFAULT 0,
  total          NUMERIC(5,2) GENERATED ALWAYS AS (precision_pts + presentacion_pts) STORED,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_ronda, id_competidor, juez_numero)
);
ALTER TABLE poomsae_puntuacion ENABLE ROW LEVEL SECURITY;

-- Mejora de llave_combate: sembrado + bye
ALTER TABLE llave_combate
  ADD COLUMN IF NOT EXISTS es_bye BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seed INTEGER,
  ADD COLUMN IF NOT EXISTS siguiente_llave INTEGER REFERENCES llave_combate(id_llave);

-- Medallero (tabla agregada; se puede reconstruir)
CREATE TABLE IF NOT EXISTS medalla (
  id_medalla     SERIAL PRIMARY KEY,
  id_campeonato  INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  id_categoria   INTEGER REFERENCES categoria_campeonato(id_categoria),
  id_competidor  INTEGER NOT NULL REFERENCES competidor(id_competidor) ON DELETE CASCADE,
  tipo           VARCHAR(10) NOT NULL,
  puntos         INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (tipo IN ('oro','plata','bronce'))
);
ALTER TABLE medalla ENABLE ROW LEVEL SECURITY;

-- ─── 10. COMUNICADOS / AVISOS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS comunicado (
  id_comunicado  SERIAL PRIMARY KEY,
  titulo         VARCHAR(150) NOT NULL,
  contenido      TEXT NOT NULL,
  prioridad      VARCHAR(10) DEFAULT 'normal',
  fecha_desde    DATE DEFAULT CURRENT_DATE,
  fecha_hasta    DATE,
  dirigido_a     VARCHAR(20) DEFAULT 'todos',
  publicado_por  INTEGER REFERENCES usuario(id_usuario),
  activo         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (prioridad IN ('normal','importante','urgente')),
  CHECK (dirigido_a IN ('todos','admin','maestros','alumnos'))
);
ALTER TABLE comunicado ENABLE ROW LEVEL SECURITY;

-- ─── 11. FUNCIÓN · número consecutivo de recibo ──────────────────

CREATE OR REPLACE FUNCTION generar_numero_recibo()
RETURNS TEXT AS $$
DECLARE
  v_anio     TEXT := TO_CHAR(NOW(), 'YYYY');
  v_contador INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_recibo FROM 6) AS INTEGER)), 0) + 1
    INTO v_contador
    FROM pago
    WHERE numero_recibo LIKE v_anio || '-%';
  RETURN v_anio || '-' || LPAD(v_contador::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 12. FUNCIÓN · código de alumno consecutivo ──────────────────

CREATE OR REPLACE FUNCTION generar_codigo_alumno()
RETURNS TEXT AS $$
DECLARE
  v_contador INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_alumno FROM 8) AS INTEGER)), 0) + 1
    INTO v_contador
    FROM alumno
    WHERE codigo_alumno ~ '^CCTKD-[0-9]+$';
  RETURN 'CCTKD-' || LPAD(v_contador::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 13. UPDATED_AT automáticos ─────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 14. RLS BÁSICO (acceso autenticado) ────────────────────────
-- El sistema usa auth custom (no Supabase Auth aún); mientras, las
-- políticas permiten lectura/escritura con la llave anónima.
-- Cuando migremos a Supabase Auth, refinamos por rol.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname='public'
      AND tablename IN (
        'metodo_pago','concepto_pago','plan_mensualidad','maestro_turno',
        'planilla_maestro','examen_programado','examen_candidato',
        'inscripcion_campeonato','pesaje_campeonato','poomsae_ronda',
        'poomsae_puntuacion','medalla','comunicado'
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Acceso total anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END$$;

COMMENT ON SCHEMA public IS
  'ACCTKD schema · Christopher Cabrera Taekwondo · Actualizado 2026-04-20';
