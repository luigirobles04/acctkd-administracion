-- Campeonatos F1 · ACCTKD · schema inscripciones

-- ── Campeonato: campos F1 ─────────────────────────────────────────
ALTER TABLE campeonato
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS fecha_inicio_regular DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin_regular DATE,
  ADD COLUMN IF NOT EXISTS fecha_inicio_tardia DATE,
  ADD COLUMN IF NOT EXISTS fecha_gracia_pago DATE,
  ADD COLUMN IF NOT EXISTS bases_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS bases_version VARCHAR(20) DEFAULT '1',
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_info TEXT,
  ADD COLUMN IF NOT EXISTS puntos_oro INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS puntos_plata INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS puntos_bronce INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS poomsae_modo_vs VARCHAR(20) DEFAULT 'mixto',
  ADD COLUMN IF NOT EXISTS whatsapp_staff_telefonos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS whatsapp_plantillas JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS limite_academias_dia INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS campeonato_slug_key ON campeonato(slug) WHERE slug IS NOT NULL;

-- Sedes ACCTKD participantes
CREATE TABLE IF NOT EXISTS campeonato_sede (
  id SERIAL PRIMARY KEY,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  id_sede INTEGER NOT NULL REFERENCES sede(id_sede) ON DELETE CASCADE,
  UNIQUE(id_campeonato, id_sede)
);

-- ── Academia maestro ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academia (
  id_academia SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(20),
  codigo_prefijo VARCHAR(8) NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS academia_prefijo_key ON academia(codigo_prefijo);

-- ── Academia por campeonato ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS academia_campeonato (
  id SERIAL PRIMARY KEY,
  id_academia INTEGER NOT NULL REFERENCES academia(id_academia) ON DELETE CASCADE,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  id_sede INTEGER REFERENCES sede(id_sede) ON DELETE SET NULL,
  token VARCHAR(64) NOT NULL,
  token_anterior VARCHAR(64),
  token_anterior_expira TIMESTAMPTZ,
  es_interna BOOLEAN DEFAULT false,
  estado_lista VARCHAR(30) DEFAULT 'en_edicion'
    CHECK (estado_lista IN ('en_edicion', 'notificada')),
  estado_pago VARCHAR(30) DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente', 'parcial', 'validado')),
  ultima_notificacion_at TIMESTAMPTZ,
  ultimo_cambio_at TIMESTAMPTZ DEFAULT now(),
  monto_total NUMERIC(10,2) DEFAULT 0,
  monto_asignado NUMERIC(10,2) DEFAULT 0,
  aceptacion_bases_at TIMESTAMPTZ,
  aceptacion_bases_ip VARCHAR(45),
  aceptacion_bases_version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_campeonato, id_academia),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS academia_campeonato_campeonato_idx ON academia_campeonato(id_campeonato);

-- Límite altas por día (anti-spam link genérico)
CREATE TABLE IF NOT EXISTS campeonato_registro_academia_dia (
  id SERIAL PRIMARY KEY,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cantidad INTEGER DEFAULT 0,
  UNIQUE(id_campeonato, fecha)
);

-- ── Perfil competidor reutilizable ────────────────────────────────
CREATE TABLE IF NOT EXISTS competidor_perfil (
  id_perfil SERIAL PRIMARY KEY,
  id_academia INTEGER NOT NULL REFERENCES academia(id_academia) ON DELETE CASCADE,
  documento_tipo VARCHAR(20) NOT NULL DEFAULT 'DNI'
    CHECK (documento_tipo IN ('DNI', 'CE', 'PASAPORTE', 'OTRO')),
  documento_numero VARCHAR(30) NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
  fecha_nacimiento DATE,
  grado VARCHAR(40),
  foto_url TEXT,
  id_alumno INTEGER REFERENCES alumno(id_alumno) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_academia, documento_tipo, documento_numero)
);

-- ── Tarifas por modalidad ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campeonato_tarifa (
  id_tarifa SERIAL PRIMARY KEY,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  modalidad VARCHAR(40) NOT NULL,
  precio_regular NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_tardia NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  UNIQUE(id_campeonato, modalidad)
);

-- ── Líneas de inscripción (unidad de cobro/aprobación) ────────────
CREATE TABLE IF NOT EXISTS linea_inscripcion (
  id_linea SERIAL PRIMARY KEY,
  id_academia_campeonato INTEGER NOT NULL REFERENCES academia_campeonato(id) ON DELETE CASCADE,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  modalidad VARCHAR(40) NOT NULL,
  tipo_oficial VARCHAR(40),
  id_categoria INTEGER REFERENCES categoria_campeonato(id_categoria) ON DELETE SET NULL,
  grupo_uuid UUID,
  es_cobro BOOLEAN DEFAULT true,
  precio_aplicado NUMERIC(10,2) DEFAULT 0,
  tipo_tarifa VARCHAR(10) DEFAULT 'regular' CHECK (tipo_tarifa IN ('regular', 'tardia')),
  estado VARCHAR(30) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'pendiente_pago', 'pagado', 'aprobado', 'anulado')),
  dorsal_prefijo VARCHAR(8),
  dorsal_numero INTEGER,
  dorsal_display VARCHAR(20),
  peso_declarado NUMERIC(5,1),
  id_competidor_legacy INTEGER REFERENCES competidor(id_competidor) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS linea_inscripcion_academia_idx ON linea_inscripcion(id_academia_campeonato);
CREATE INDEX IF NOT EXISTS linea_inscripcion_campeonato_idx ON linea_inscripcion(id_campeonato);

CREATE TABLE IF NOT EXISTS linea_inscripcion_miembro (
  id SERIAL PRIMARY KEY,
  id_linea INTEGER NOT NULL REFERENCES linea_inscripcion(id_linea) ON DELETE CASCADE,
  id_perfil INTEGER NOT NULL REFERENCES competidor_perfil(id_perfil) ON DELETE CASCADE,
  rol VARCHAR(20) DEFAULT 'competidor',
  UNIQUE(id_linea, id_perfil)
);

-- ── Pagos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comprobante_pago (
  id_comprobante SERIAL PRIMARY KEY,
  id_academia_campeonato INTEGER NOT NULL REFERENCES academia_campeonato(id) ON DELETE CASCADE,
  monto_declarado NUMERIC(10,2) NOT NULL,
  monto_validado NUMERIC(10,2),
  numero_operacion VARCHAR(60),
  archivo_url TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'validado', 'rechazado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asignacion_pago (
  id SERIAL PRIMARY KEY,
  id_comprobante INTEGER NOT NULL REFERENCES comprobante_pago(id_comprobante) ON DELETE CASCADE,
  id_linea INTEGER NOT NULL REFERENCES linea_inscripcion(id_linea) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  UNIQUE(id_comprobante, id_linea)
);

-- ── Auditoría y offline ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bitacora_inscripcion (
  id SERIAL PRIMARY KEY,
  id_academia_campeonato INTEGER REFERENCES academia_campeonato(id) ON DELETE SET NULL,
  id_linea INTEGER REFERENCES linea_inscripcion(id_linea) ON DELETE SET NULL,
  accion VARCHAR(60) NOT NULL,
  detalle JSONB,
  actor VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cola_offline (
  id SERIAL PRIMARY KEY,
  id_campeonato INTEGER REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  id_academia_campeonato INTEGER REFERENCES academia_campeonato(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesado', 'error', 'conflicto')),
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  procesado_at TIMESTAMPTZ
);

-- ── RLS (anon allow-all, coherente con resto del proyecto) ────────
ALTER TABLE academia ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia_campeonato ENABLE ROW LEVEL SECURITY;
ALTER TABLE competidor_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE campeonato_tarifa ENABLE ROW LEVEL SECURITY;
ALTER TABLE linea_inscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE linea_inscripcion_miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobante_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_inscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cola_offline ENABLE ROW LEVEL SECURITY;
ALTER TABLE campeonato_sede ENABLE ROW LEVEL SECURITY;
ALTER TABLE campeonato_registro_academia_dia ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academia','academia_campeonato','competidor_perfil','campeonato_tarifa',
    'linea_inscripcion','linea_inscripcion_miembro','comprobante_pago',
    'asignacion_pago','bitacora_inscripcion','cola_offline','campeonato_sede',
    'campeonato_registro_academia_dia'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acceso total anon" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Acceso total anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
