-- ACCTKD · baseline schema (snapshot proyecto Supabase vía MCP list_tables verbose)
--
-- Uso: bases VACÍAS (`supabase db reset`, proyecto local nuevo, staging nuevo).
-- Proyecto cloud ya poblado: suele tener estas tablas; si añades esta migración al historial,
-- marca esta versión como aplicada en `supabase_migrations` o ejecuta solo migraciones
-- nuevas según la práctica de tu equipo.
--
-- Regenerar: ejecutar `list_tables(verbose)` (MCP/CLI), guardar JSON en
-- `scripts/schema_snapshot_list_tables.json` y correr `python3 scripts/generar_baseline_desde_snapshot.py`.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS alumno_id_alumno_seq;
CREATE SEQUENCE IF NOT EXISTS anotacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS apoderado_id_apoderado_seq;
CREATE SEQUENCE IF NOT EXISTS asistencia_alumno_id_seq;
CREATE SEQUENCE IF NOT EXISTS asistencia_maestro_id_seq;
CREATE SEQUENCE IF NOT EXISTS campeonato_id_campeonato_seq;
CREATE SEQUENCE IF NOT EXISTS categoria_campeonato_id_categoria_seq;
CREATE SEQUENCE IF NOT EXISTS clase_id_clase_seq;
CREATE SEQUENCE IF NOT EXISTS competidor_id_competidor_seq;
CREATE SEQUENCE IF NOT EXISTS comunicado_id_comunicado_seq;
CREATE SEQUENCE IF NOT EXISTS concepto_pago_id_concepto_seq;
CREATE SEQUENCE IF NOT EXISTS config_precios_id_seq;
CREATE SEQUENCE IF NOT EXISTS descuento_id_descuento_seq;
CREATE SEQUENCE IF NOT EXISTS examen_candidato_id_candidato_seq;
CREATE SEQUENCE IF NOT EXISTS examen_programado_id_examen_seq;
CREATE SEQUENCE IF NOT EXISTS grado_marcial_id_grado_seq;
CREATE SEQUENCE IF NOT EXISTS historial_grados_id_seq;
CREATE SEQUENCE IF NOT EXISTS inscripcion_campeonato_id_inscripcion_seq;
CREATE SEQUENCE IF NOT EXISTS llave_combate_id_llave_seq;
CREATE SEQUENCE IF NOT EXISTS maestro_id_maestro_seq;
CREATE SEQUENCE IF NOT EXISTS maestro_turno_id_seq;
CREATE SEQUENCE IF NOT EXISTS matricula_id_matricula_seq;
CREATE SEQUENCE IF NOT EXISTS medalla_id_medalla_seq;
CREATE SEQUENCE IF NOT EXISTS metodo_pago_id_metodo_seq;
CREATE SEQUENCE IF NOT EXISTS pago_id_pago_seq;
CREATE SEQUENCE IF NOT EXISTS pesaje_campeonato_id_pesaje_seq;
CREATE SEQUENCE IF NOT EXISTS plan_mensualidad_id_plan_seq;
CREATE SEQUENCE IF NOT EXISTS planilla_maestro_id_planilla_seq;
CREATE SEQUENCE IF NOT EXISTS poomsae_puntuacion_id_puntuacion_seq;
CREATE SEQUENCE IF NOT EXISTS poomsae_ronda_id_ronda_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_rol_seq;
CREATE SEQUENCE IF NOT EXISTS sede_id_sede_seq;
CREATE SEQUENCE IF NOT EXISTS turno_id_turno_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_usuario_seq;
CREATE TABLE IF NOT EXISTS "apoderado" (
  "id_apoderado" INTEGER NOT NULL DEFAULT nextval('apoderado_id_apoderado_seq'::regclass),
  "nombres" VARCHAR NOT NULL,
  "apellidos" VARCHAR NOT NULL,
  "dni" VARCHAR,
  "telefono" VARCHAR,
  "telefono_secundario" VARCHAR,
  "correo" VARCHAR,
  "direccion" TEXT,
  "relacion" VARCHAR,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_apoderado")
);
CREATE TABLE IF NOT EXISTS "campeonato" (
  "id_campeonato" INTEGER NOT NULL DEFAULT nextval('campeonato_id_campeonato_seq'::regclass),
  "nombre" VARCHAR NOT NULL,
  "descripcion" TEXT,
  "fecha_inicio" DATE,
  "fecha_fin" DATE,
  "lugar" VARCHAR,
  "ciudad" VARCHAR,
  "estado" VARCHAR DEFAULT 'planificado'::character varying CHECK (estado::text = ANY (ARRAY['planificado'::character varying, 'inscripciones'::character varying, 'en_curso'::character varying, 'finalizado'::character varying, 'cancelado'::character varying]::text[])),
  "foto_url" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "tipo" VARCHAR DEFAULT 'abierto'::character varying,
  "disciplinas" VARCHAR DEFAULT 'kyorugi,poomsae'::character varying,
  "monto_inscripcion" NUMERIC DEFAULT 0,
  "fecha_cierre_inscripcion" DATE,
  "numero_inicial_dorsal" INTEGER DEFAULT 1,
  "cuenta_bancaria" TEXT,
  "link_inscripcion_publico" VARCHAR,
  "template_competidor_url" TEXT,
  "template_coach_url" TEXT,
  "template_delegado_url" TEXT,
  "template_oficial_url" TEXT,
  "template_staff_url" TEXT,
  "dias_evento" INTEGER DEFAULT 1,
  PRIMARY KEY ("id_campeonato")
);
CREATE TABLE IF NOT EXISTS "categoria_campeonato" (
  "id_categoria" INTEGER NOT NULL DEFAULT nextval('categoria_campeonato_id_categoria_seq'::regclass),
  "id_campeonato" INTEGER,
  "nombre" VARCHAR NOT NULL,
  "genero" CHAR(1) CHECK (genero = ANY (ARRAY['M'::bpchar, 'F'::bpchar, 'X'::bpchar])),
  "edad_min" INTEGER,
  "edad_max" INTEGER,
  "peso_min" NUMERIC,
  "peso_max" NUMERIC,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "modalidad" VARCHAR DEFAULT 'kyorugi'::character varying,
  "division" VARCHAR,
  "grado_rango" VARCHAR,
  "anio_nacimiento_desde" INTEGER,
  "anio_nacimiento_hasta" INTEGER,
  "orden" INTEGER DEFAULT 0,
  PRIMARY KEY ("id_categoria")
);
CREATE TABLE IF NOT EXISTS "concepto_pago" (
  "id_concepto" INTEGER NOT NULL DEFAULT nextval('concepto_pago_id_concepto_seq'::regclass),
  "codigo" VARCHAR NOT NULL,
  "nombre" VARCHAR NOT NULL,
  "tipo" VARCHAR NOT NULL,
  "activo" BOOLEAN DEFAULT true,
  PRIMARY KEY ("id_concepto")
);
CREATE TABLE IF NOT EXISTS "grado_marcial" (
  "id_grado" INTEGER NOT NULL DEFAULT nextval('grado_marcial_id_grado_seq'::regclass),
  "nombre" VARCHAR NOT NULL,
  "color_cinturon" VARCHAR,
  "nivel" INTEGER,
  "descripcion" TEXT,
  PRIMARY KEY ("id_grado")
);
CREATE TABLE IF NOT EXISTS "metodo_pago" (
  "id_metodo" INTEGER NOT NULL DEFAULT nextval('metodo_pago_id_metodo_seq'::regclass),
  "codigo" VARCHAR NOT NULL,
  "nombre" VARCHAR NOT NULL,
  "requiere_captura" BOOLEAN DEFAULT false,
  "activo" BOOLEAN DEFAULT true,
  "orden" INTEGER DEFAULT 0,
  PRIMARY KEY ("id_metodo")
);
CREATE TABLE IF NOT EXISTS "poomsae_ronda" (
  "id_ronda" INTEGER NOT NULL DEFAULT nextval('poomsae_ronda_id_ronda_seq'::regclass),
  "id_categoria" INTEGER NOT NULL,
  "nombre" VARCHAR NOT NULL,
  "orden" INTEGER DEFAULT 1,
  "estado" VARCHAR DEFAULT 'pendiente'::character varying,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_ronda")
);
CREATE TABLE IF NOT EXISTS "rol" (
  "id_rol" INTEGER NOT NULL DEFAULT nextval('rol_id_rol_seq'::regclass),
  "nombre" VARCHAR NOT NULL,
  "descripcion" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_rol")
);
CREATE TABLE IF NOT EXISTS "sede" (
  "id_sede" INTEGER NOT NULL DEFAULT nextval('sede_id_sede_seq'::regclass),
  "nombre" VARCHAR NOT NULL,
  "direccion" TEXT,
  "distrito" VARCHAR,
  "telefono" VARCHAR,
  "activo" BOOLEAN DEFAULT true,
  "foto_url" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_sede")
);
CREATE TABLE IF NOT EXISTS "config_precios" (
  "id" INTEGER NOT NULL DEFAULT nextval('config_precios_id_seq'::regclass),
  "id_sede" INTEGER,
  "concepto" VARCHAR NOT NULL,
  "monto" NUMERIC NOT NULL,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "descuento" (
  "id_descuento" INTEGER NOT NULL DEFAULT nextval('descuento_id_descuento_seq'::regclass),
  "id_sede" INTEGER,
  "nombre" VARCHAR NOT NULL,
  "tipo" VARCHAR,
  "porcentaje" NUMERIC,
  "monto_fijo" NUMERIC,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_descuento")
);
CREATE TABLE IF NOT EXISTS "examen_programado" (
  "id_examen" INTEGER NOT NULL DEFAULT nextval('examen_programado_id_examen_seq'::regclass),
  "id_sede" INTEGER,
  "nombre" VARCHAR NOT NULL,
  "fecha" DATE NOT NULL,
  "costo_kup" NUMERIC DEFAULT 0,
  "costo_dan" NUMERIC DEFAULT 0,
  "estado" VARCHAR DEFAULT 'programado'::character varying CHECK (estado::text = ANY (ARRAY['programado'::character varying, 'inscripcion'::character varying, 'cerrado'::character varying, 'realizado'::character varying, 'cancelado'::character varying]::text[])),
  "meses_minimos" INTEGER DEFAULT 3,
  "asistencia_minima" INTEGER DEFAULT 70,
  "requiere_pago_al_dia" BOOLEAN DEFAULT true,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_examen")
);
CREATE TABLE IF NOT EXISTS "plan_mensualidad" (
  "id_plan" INTEGER NOT NULL DEFAULT nextval('plan_mensualidad_id_plan_seq'::regclass),
  "id_sede" INTEGER,
  "codigo" VARCHAR NOT NULL,
  "nombre" VARCHAR NOT NULL,
  "dias_semana" INTEGER NOT NULL,
  "dias" VARCHAR,
  "monto" NUMERIC NOT NULL,
  "activo" BOOLEAN DEFAULT true,
  "orden" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_plan")
);
CREATE TABLE IF NOT EXISTS "turno" (
  "id_turno" INTEGER NOT NULL DEFAULT nextval('turno_id_turno_seq'::regclass),
  "id_sede" INTEGER,
  "nombre" VARCHAR NOT NULL,
  "hora_inicio" TIME,
  "hora_fin" TIME,
  "dias_semana" VARCHAR,
  "activo" BOOLEAN DEFAULT true,
  "dias_array" INTEGER[] DEFAULT ARRAY[]::integer[],
  "descripcion" VARCHAR,
  PRIMARY KEY ("id_turno")
);
CREATE TABLE IF NOT EXISTS "usuario" (
  "id_usuario" INTEGER NOT NULL DEFAULT nextval('usuario_id_usuario_seq'::regclass),
  "username" VARCHAR NOT NULL,
  "password_hash" TEXT NOT NULL,
  "id_rol" INTEGER,
  "activo" BOOLEAN DEFAULT true,
  "ultimo_acceso" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "email" VARCHAR,
  "nombre_completo" VARCHAR,
  "reset_token" VARCHAR,
  "reset_token_exp" TIMESTAMPTZ,
  PRIMARY KEY ("id_usuario")
);
CREATE TABLE IF NOT EXISTS "alumno" (
  "id_alumno" INTEGER NOT NULL DEFAULT nextval('alumno_id_alumno_seq'::regclass),
  "id_usuario" INTEGER,
  "id_sede" INTEGER,
  "id_apoderado" INTEGER,
  "nombres" VARCHAR NOT NULL,
  "apellidos" VARCHAR NOT NULL,
  "dni" VARCHAR,
  "fecha_nacimiento" DATE,
  "sexo" CHAR(1) CHECK (sexo = ANY (ARRAY['M'::bpchar, 'F'::bpchar])),
  "telefono" VARCHAR,
  "correo" VARCHAR,
  "direccion" TEXT,
  "foto_url" TEXT,
  "doc_dni_url" TEXT,
  "doc_ficha_url" TEXT,
  "grupo_sanguineo" VARCHAR,
  "condicion_medica" TEXT,
  "fecha_ingreso" DATE DEFAULT CURRENT_DATE,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "codigo_alumno" VARCHAR,
  "id_plan" INTEGER,
  "id_turno" INTEGER,
  "id_grado_actual" INTEGER,
  "estado" VARCHAR DEFAULT 'activo'::character varying CHECK (estado::text = ANY (ARRAY['activo'::character varying, 'suspendido'::character varying, 'retirado'::character varying, 'prueba'::character varying]::text[])),
  "tipo_sangre" VARCHAR,
  "alergias" TEXT,
  "seguro_medico" VARCHAR,
  "contacto_emergencia_nombre" VARCHAR,
  "contacto_emergencia_telefono" VARCHAR,
  "observaciones" TEXT,
  PRIMARY KEY ("id_alumno")
);
CREATE TABLE IF NOT EXISTS "anotacion" (
  "id" INTEGER NOT NULL DEFAULT nextval('anotacion_id_seq'::regclass),
  "id_alumno" INTEGER,
  "id_usuario" INTEGER,
  "tipo" VARCHAR DEFAULT 'general'::character varying,
  "contenido" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "comunicado" (
  "id_comunicado" INTEGER NOT NULL DEFAULT nextval('comunicado_id_comunicado_seq'::regclass),
  "titulo" VARCHAR NOT NULL,
  "contenido" TEXT NOT NULL,
  "prioridad" VARCHAR DEFAULT 'normal'::character varying CHECK (prioridad::text = ANY (ARRAY['normal'::character varying, 'importante'::character varying, 'urgente'::character varying]::text[])),
  "fecha_desde" DATE DEFAULT CURRENT_DATE,
  "fecha_hasta" DATE,
  "dirigido_a" VARCHAR DEFAULT 'todos'::character varying CHECK (dirigido_a::text = ANY (ARRAY['todos'::character varying, 'admin'::character varying, 'maestros'::character varying, 'alumnos'::character varying]::text[])),
  "publicado_por" INTEGER,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_comunicado")
);
CREATE TABLE IF NOT EXISTS "historial_grados" (
  "id" INTEGER NOT NULL DEFAULT nextval('historial_grados_id_seq'::regclass),
  "id_alumno" INTEGER,
  "id_grado" INTEGER,
  "fecha_examen" DATE NOT NULL,
  "aprobado" BOOLEAN DEFAULT true,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "codigo_examen" VARCHAR,
  "id_examen" INTEGER,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "inscripcion_campeonato" (
  "id_inscripcion" INTEGER NOT NULL DEFAULT nextval('inscripcion_campeonato_id_inscripcion_seq'::regclass),
  "id_campeonato" INTEGER NOT NULL,
  "codigo_academia" VARCHAR,
  "nombre_academia" VARCHAR NOT NULL,
  "coach_nombres" VARCHAR,
  "coach_apellidos" VARCHAR,
  "coach_dni" VARCHAR,
  "coach_telefono" VARCHAR,
  "coach_correo" VARCHAR,
  "cantidad_competidores" INTEGER DEFAULT 0,
  "monto_total" NUMERIC DEFAULT 0,
  "captura_pago_url" TEXT,
  "estado" VARCHAR DEFAULT 'pendiente'::character varying CHECK (estado::text = ANY (ARRAY['pendiente'::character varying, 'aprobada'::character varying, 'rechazada'::character varying]::text[])),
  "aprobado_por" INTEGER,
  "fecha_aprobacion" TIMESTAMPTZ,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_inscripcion")
);
CREATE TABLE IF NOT EXISTS "competidor" (
  "id_competidor" INTEGER NOT NULL DEFAULT nextval('competidor_id_competidor_seq'::regclass),
  "id_campeonato" INTEGER,
  "id_categoria" INTEGER,
  "id_alumno" INTEGER,
  "nombre_completo" VARCHAR,
  "academia" VARCHAR,
  "dni" VARCHAR,
  "peso" NUMERIC,
  "edad" INTEGER,
  "numero_competidor" INTEGER,
  "credencial_url" TEXT,
  "estado" VARCHAR DEFAULT 'inscrito'::character varying,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "id_inscripcion" INTEGER,
  "tipo" VARCHAR DEFAULT 'competidor'::character varying CHECK (tipo::text = ANY (ARRAY['competidor'::character varying, 'coach'::character varying, 'delegado'::character varying, 'oficial'::character varying, 'staff'::character varying]::text[])),
  "modalidad" VARCHAR DEFAULT 'kyorugi'::character varying CHECK (modalidad::text = ANY (ARRAY['kyorugi'::character varying, 'poomsae_individual'::character varying, 'poomsae_pareja'::character varying, 'poomsae_equipo'::character varying]::text[])),
  "nombres" VARCHAR,
  "apellidos" VARCHAR,
  "sexo" CHAR(1),
  "fecha_nacimiento" DATE,
  "grado" VARCHAR,
  "peso_inscripcion" NUMERIC,
  "peso_oficial" NUMERIC,
  "pesaje_estado" VARCHAR DEFAULT 'pendiente'::character varying,
  "foto_url" TEXT,
  "dias_acceso" INTEGER[] DEFAULT ARRAY[1],
  "qr_codigo" VARCHAR,
  "dorsal" INTEGER,
  PRIMARY KEY ("id_competidor")
);
CREATE TABLE IF NOT EXISTS "llave_combate" (
  "id_llave" INTEGER NOT NULL DEFAULT nextval('llave_combate_id_llave_seq'::regclass),
  "id_categoria" INTEGER,
  "ronda" INTEGER NOT NULL,
  "match_numero" INTEGER,
  "id_competidor1" INTEGER,
  "id_competidor2" INTEGER,
  "ganador_id" INTEGER,
  "puntaje1" INTEGER DEFAULT 0,
  "puntaje2" INTEGER DEFAULT 0,
  "estado" VARCHAR DEFAULT 'pendiente'::character varying,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "es_bye" BOOLEAN DEFAULT false,
  "seed" INTEGER,
  "siguiente_llave" INTEGER,
  PRIMARY KEY ("id_llave")
);
CREATE TABLE IF NOT EXISTS "maestro" (
  "id_maestro" INTEGER NOT NULL DEFAULT nextval('maestro_id_maestro_seq'::regclass),
  "id_usuario" INTEGER,
  "id_sede" INTEGER,
  "nombres" VARCHAR NOT NULL,
  "apellidos" VARCHAR NOT NULL,
  "dni" VARCHAR,
  "telefono" VARCHAR,
  "correo" VARCHAR,
  "fecha_nacimiento" DATE,
  "fecha_ingreso" DATE DEFAULT CURRENT_DATE,
  "grado_cinturon" VARCHAR,
  "especialidad" VARCHAR,
  "foto_url" TEXT,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "sueldo_mensual" NUMERIC DEFAULT 0,
  "num_kukkiwon" VARCHAR,
  "curso_coach_wt" BOOLEAN DEFAULT false,
  "curso_coach_vencimiento" DATE,
  "dan_nivel" INTEGER,
  "direccion" TEXT,
  PRIMARY KEY ("id_maestro")
);
CREATE TABLE IF NOT EXISTS "asistencia_maestro" (
  "id" INTEGER NOT NULL DEFAULT nextval('asistencia_maestro_id_seq'::regclass),
  "id_maestro" INTEGER,
  "id_sede" INTEGER,
  "fecha" DATE NOT NULL,
  "hora_entrada" TIME,
  "hora_salida" TIME,
  "presente" BOOLEAN DEFAULT false,
  "justificado" BOOLEAN DEFAULT false,
  "observacion" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "clase" (
  "id_clase" INTEGER NOT NULL DEFAULT nextval('clase_id_clase_seq'::regclass),
  "id_turno" INTEGER,
  "id_maestro" INTEGER,
  "fecha" DATE NOT NULL,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_clase")
);
CREATE TABLE IF NOT EXISTS "asistencia_alumno" (
  "id" INTEGER NOT NULL DEFAULT nextval('asistencia_alumno_id_seq'::regclass),
  "id_clase" INTEGER,
  "id_alumno" INTEGER,
  "presente" BOOLEAN DEFAULT false,
  "justificado" BOOLEAN DEFAULT false,
  "observacion" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "maestro_turno" (
  "id" INTEGER NOT NULL DEFAULT nextval('maestro_turno_id_seq'::regclass),
  "id_maestro" INTEGER NOT NULL,
  "id_turno" INTEGER NOT NULL,
  "es_titular" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "matricula" (
  "id_matricula" INTEGER NOT NULL DEFAULT nextval('matricula_id_matricula_seq'::regclass),
  "id_alumno" INTEGER,
  "id_turno" INTEGER,
  "fecha_matricula" DATE DEFAULT CURRENT_DATE,
  "activo" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_matricula")
);
CREATE TABLE IF NOT EXISTS "medalla" (
  "id_medalla" INTEGER NOT NULL DEFAULT nextval('medalla_id_medalla_seq'::regclass),
  "id_campeonato" INTEGER NOT NULL,
  "id_categoria" INTEGER,
  "id_competidor" INTEGER NOT NULL,
  "tipo" VARCHAR NOT NULL CHECK (tipo::text = ANY (ARRAY['oro'::character varying, 'plata'::character varying, 'bronce'::character varying]::text[])),
  "puntos" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_medalla")
);
CREATE TABLE IF NOT EXISTS "pago" (
  "id_pago" INTEGER NOT NULL DEFAULT nextval('pago_id_pago_seq'::regclass),
  "id_alumno" INTEGER,
  "id_sede" INTEGER,
  "concepto" VARCHAR NOT NULL,
  "monto" NUMERIC NOT NULL,
  "descuento" NUMERIC DEFAULT 0,
  "monto_final" NUMERIC GENERATED ALWAYS AS (monto - descuento) STORED,
  "fecha_pago" DATE NOT NULL,
  "mes_correspondiente" DATE,
  "metodo_pago" VARCHAR DEFAULT 'efectivo'::character varying,
  "estado" VARCHAR DEFAULT 'pagado'::character varying CHECK (estado::text = ANY (ARRAY['pagado'::character varying, 'pendiente'::character varying, 'vencido'::character varying, 'anulado'::character varying]::text[])),
  "recibo_url" TEXT,
  "observaciones" TEXT,
  "registrado_por" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "id_metodo" INTEGER,
  "id_concepto" INTEGER,
  "id_plan" INTEGER,
  "id_descuento" INTEGER,
  "numero_recibo" VARCHAR,
  "fecha_vencimiento" DATE,
  "captura_url" TEXT,
  "periodo_desde" DATE,
  "periodo_hasta" DATE,
  PRIMARY KEY ("id_pago")
);
CREATE TABLE IF NOT EXISTS "examen_candidato" (
  "id_candidato" INTEGER NOT NULL DEFAULT nextval('examen_candidato_id_candidato_seq'::regclass),
  "id_examen" INTEGER NOT NULL,
  "id_alumno" INTEGER NOT NULL,
  "id_grado_destino" INTEGER,
  "codigo_examen" VARCHAR,
  "estado" VARCHAR DEFAULT 'candidato'::character varying CHECK (estado::text = ANY (ARRAY['candidato'::character varying, 'inscrito'::character varying, 'aprobado'::character varying, 'desaprobado'::character varying, 'ausente'::character varying]::text[])),
  "id_pago" INTEGER,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_candidato")
);
CREATE TABLE IF NOT EXISTS "pesaje_campeonato" (
  "id_pesaje" INTEGER NOT NULL DEFAULT nextval('pesaje_campeonato_id_pesaje_seq'::regclass),
  "id_competidor" INTEGER NOT NULL,
  "peso_oficial" NUMERIC NOT NULL,
  "categoria_original" INTEGER,
  "categoria_final" INTEGER,
  "resultado" VARCHAR DEFAULT 'ok'::character varying CHECK (resultado::text = ANY (ARRAY['ok'::character varying, 'subido'::character varying, 'descalificado'::character varying]::text[])),
  "pesado_por" INTEGER,
  "fecha_pesaje" TIMESTAMPTZ DEFAULT now(),
  "observaciones" TEXT,
  PRIMARY KEY ("id_pesaje")
);
CREATE TABLE IF NOT EXISTS "planilla_maestro" (
  "id_planilla" INTEGER NOT NULL DEFAULT nextval('planilla_maestro_id_planilla_seq'::regclass),
  "id_maestro" INTEGER NOT NULL,
  "periodo" DATE NOT NULL,
  "sueldo_base" NUMERIC NOT NULL,
  "descuentos" NUMERIC DEFAULT 0,
  "bonos" NUMERIC DEFAULT 0,
  "total" NUMERIC NOT NULL,
  "fecha_pago" DATE,
  "observaciones" TEXT,
  "pagado_por" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_planilla")
);
CREATE TABLE IF NOT EXISTS "poomsae_puntuacion" (
  "id_puntuacion" INTEGER NOT NULL DEFAULT nextval('poomsae_puntuacion_id_puntuacion_seq'::regclass),
  "id_ronda" INTEGER NOT NULL,
  "id_competidor" INTEGER NOT NULL,
  "juez_numero" INTEGER NOT NULL,
  "precision_pts" NUMERIC DEFAULT 0,
  "presentacion_pts" NUMERIC DEFAULT 0,
  "total" NUMERIC GENERATED ALWAYS AS (precision_pts + presentacion_pts) STORED,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("id_puntuacion")
);
DO $$ BEGIN ALTER TABLE "apoderado" ADD CONSTRAINT "apoderado_dni_key" UNIQUE ("dni"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "concepto_pago" ADD CONSTRAINT "concepto_pago_codigo_key" UNIQUE ("codigo"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "metodo_pago" ADD CONSTRAINT "metodo_pago_codigo_key" UNIQUE ("codigo"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "rol" ADD CONSTRAINT "rol_nombre_key" UNIQUE ("nombre"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "plan_mensualidad" ADD CONSTRAINT "plan_mensualidad_codigo_key" UNIQUE ("codigo"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "usuario" ADD CONSTRAINT "usuario_username_key" UNIQUE ("username"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "usuario" ADD CONSTRAINT "usuario_email_key" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "alumno" ADD CONSTRAINT "alumno_dni_key" UNIQUE ("dni"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "alumno" ADD CONSTRAINT "alumno_codigo_alumno_key" UNIQUE ("codigo_alumno"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "competidor" ADD CONSTRAINT "competidor_qr_codigo_key" UNIQUE ("qr_codigo"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "maestro" ADD CONSTRAINT "maestro_dni_key" UNIQUE ("dni"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "pago" ADD CONSTRAINT "pago_numero_recibo_key" UNIQUE ("numero_recibo"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "apoderado" DROP CONSTRAINT IF EXISTS "alumno_id_apoderado_fkey";
ALTER TABLE "apoderado" ADD CONSTRAINT "alumno_id_apoderado_fkey" FOREIGN KEY ("id_apoderado") REFERENCES "apoderado"("id_apoderado");
ALTER TABLE "campeonato" DROP CONSTRAINT IF EXISTS "categoria_campeonato_id_campeonato_fkey";
ALTER TABLE "campeonato" ADD CONSTRAINT "categoria_campeonato_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "campeonato" DROP CONSTRAINT IF EXISTS "competidor_id_campeonato_fkey";
ALTER TABLE "campeonato" ADD CONSTRAINT "competidor_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "campeonato" DROP CONSTRAINT IF EXISTS "inscripcion_campeonato_id_campeonato_fkey";
ALTER TABLE "campeonato" ADD CONSTRAINT "inscripcion_campeonato_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "campeonato" DROP CONSTRAINT IF EXISTS "medalla_id_campeonato_fkey";
ALTER TABLE "campeonato" ADD CONSTRAINT "medalla_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "categoria_campeonato_id_campeonato_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "categoria_campeonato_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "competidor_id_categoria_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "competidor_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "llave_combate_id_categoria_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "llave_combate_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_categoria_original_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "pesaje_campeonato_categoria_original_fkey" FOREIGN KEY ("categoria_original") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_categoria_final_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "pesaje_campeonato_categoria_final_fkey" FOREIGN KEY ("categoria_final") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "poomsae_ronda_id_categoria_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "poomsae_ronda_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "categoria_campeonato" DROP CONSTRAINT IF EXISTS "medalla_id_categoria_fkey";
ALTER TABLE "categoria_campeonato" ADD CONSTRAINT "medalla_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "concepto_pago" DROP CONSTRAINT IF EXISTS "pago_id_concepto_fkey";
ALTER TABLE "concepto_pago" ADD CONSTRAINT "pago_id_concepto_fkey" FOREIGN KEY ("id_concepto") REFERENCES "concepto_pago"("id_concepto");
ALTER TABLE "grado_marcial" DROP CONSTRAINT IF EXISTS "historial_grados_id_grado_fkey";
ALTER TABLE "grado_marcial" ADD CONSTRAINT "historial_grados_id_grado_fkey" FOREIGN KEY ("id_grado") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "grado_marcial" DROP CONSTRAINT IF EXISTS "alumno_id_grado_actual_fkey";
ALTER TABLE "grado_marcial" ADD CONSTRAINT "alumno_id_grado_actual_fkey" FOREIGN KEY ("id_grado_actual") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "grado_marcial" DROP CONSTRAINT IF EXISTS "examen_candidato_id_grado_destino_fkey";
ALTER TABLE "grado_marcial" ADD CONSTRAINT "examen_candidato_id_grado_destino_fkey" FOREIGN KEY ("id_grado_destino") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "metodo_pago" DROP CONSTRAINT IF EXISTS "pago_id_metodo_fkey";
ALTER TABLE "metodo_pago" ADD CONSTRAINT "pago_id_metodo_fkey" FOREIGN KEY ("id_metodo") REFERENCES "metodo_pago"("id_metodo");
ALTER TABLE "poomsae_ronda" DROP CONSTRAINT IF EXISTS "poomsae_ronda_id_categoria_fkey";
ALTER TABLE "poomsae_ronda" ADD CONSTRAINT "poomsae_ronda_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "poomsae_ronda" DROP CONSTRAINT IF EXISTS "poomsae_puntuacion_id_ronda_fkey";
ALTER TABLE "poomsae_ronda" ADD CONSTRAINT "poomsae_puntuacion_id_ronda_fkey" FOREIGN KEY ("id_ronda") REFERENCES "poomsae_ronda"("id_ronda");
ALTER TABLE "rol" DROP CONSTRAINT IF EXISTS "usuario_id_rol_fkey";
ALTER TABLE "rol" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "maestro_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "maestro_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "alumno_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "alumno_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "turno_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "turno_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "asistencia_maestro_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "asistencia_maestro_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "pago_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "pago_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "descuento_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "descuento_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "config_precios_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "config_precios_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "plan_mensualidad_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "plan_mensualidad_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "sede" DROP CONSTRAINT IF EXISTS "examen_programado_id_sede_fkey";
ALTER TABLE "sede" ADD CONSTRAINT "examen_programado_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "config_precios" DROP CONSTRAINT IF EXISTS "config_precios_id_sede_fkey";
ALTER TABLE "config_precios" ADD CONSTRAINT "config_precios_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "descuento" DROP CONSTRAINT IF EXISTS "descuento_id_sede_fkey";
ALTER TABLE "descuento" ADD CONSTRAINT "descuento_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "descuento" DROP CONSTRAINT IF EXISTS "pago_id_descuento_fkey";
ALTER TABLE "descuento" ADD CONSTRAINT "pago_id_descuento_fkey" FOREIGN KEY ("id_descuento") REFERENCES "descuento"("id_descuento");
ALTER TABLE "examen_programado" DROP CONSTRAINT IF EXISTS "examen_programado_id_sede_fkey";
ALTER TABLE "examen_programado" ADD CONSTRAINT "examen_programado_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "examen_programado" DROP CONSTRAINT IF EXISTS "examen_candidato_id_examen_fkey";
ALTER TABLE "examen_programado" ADD CONSTRAINT "examen_candidato_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examen_programado"("id_examen");
ALTER TABLE "examen_programado" DROP CONSTRAINT IF EXISTS "historial_grados_id_examen_fkey";
ALTER TABLE "examen_programado" ADD CONSTRAINT "historial_grados_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examen_programado"("id_examen");
ALTER TABLE "plan_mensualidad" DROP CONSTRAINT IF EXISTS "plan_mensualidad_id_sede_fkey";
ALTER TABLE "plan_mensualidad" ADD CONSTRAINT "plan_mensualidad_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "plan_mensualidad" DROP CONSTRAINT IF EXISTS "alumno_id_plan_fkey";
ALTER TABLE "plan_mensualidad" ADD CONSTRAINT "alumno_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan_mensualidad"("id_plan");
ALTER TABLE "plan_mensualidad" DROP CONSTRAINT IF EXISTS "pago_id_plan_fkey";
ALTER TABLE "plan_mensualidad" ADD CONSTRAINT "pago_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan_mensualidad"("id_plan");
ALTER TABLE "turno" DROP CONSTRAINT IF EXISTS "turno_id_sede_fkey";
ALTER TABLE "turno" ADD CONSTRAINT "turno_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "turno" DROP CONSTRAINT IF EXISTS "clase_id_turno_fkey";
ALTER TABLE "turno" ADD CONSTRAINT "clase_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "turno" DROP CONSTRAINT IF EXISTS "matricula_id_turno_fkey";
ALTER TABLE "turno" ADD CONSTRAINT "matricula_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "turno" DROP CONSTRAINT IF EXISTS "alumno_id_turno_fkey";
ALTER TABLE "turno" ADD CONSTRAINT "alumno_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "turno" DROP CONSTRAINT IF EXISTS "maestro_turno_id_turno_fkey";
ALTER TABLE "turno" ADD CONSTRAINT "maestro_turno_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "usuario_id_rol_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "maestro_id_usuario_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "maestro_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "alumno_id_usuario_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "alumno_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "pago_registrado_por_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "pago_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "anotacion_id_usuario_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "anotacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "planilla_maestro_pagado_por_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "planilla_maestro_pagado_por_fkey" FOREIGN KEY ("pagado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "inscripcion_campeonato_aprobado_por_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "inscripcion_campeonato_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_pesado_por_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "pesaje_campeonato_pesado_por_fkey" FOREIGN KEY ("pesado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "comunicado_publicado_por_fkey";
ALTER TABLE "usuario" ADD CONSTRAINT "comunicado_publicado_por_fkey" FOREIGN KEY ("publicado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_usuario_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_sede_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_apoderado_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_apoderado_fkey" FOREIGN KEY ("id_apoderado") REFERENCES "apoderado"("id_apoderado");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "historial_grados_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "historial_grados_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "asistencia_alumno_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "asistencia_alumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "pago_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "pago_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "competidor_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "competidor_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "matricula_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "matricula_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "anotacion_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "anotacion_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_plan_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan_mensualidad"("id_plan");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_turno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "alumno_id_grado_actual_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "alumno_id_grado_actual_fkey" FOREIGN KEY ("id_grado_actual") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "alumno" DROP CONSTRAINT IF EXISTS "examen_candidato_id_alumno_fkey";
ALTER TABLE "alumno" ADD CONSTRAINT "examen_candidato_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "anotacion" DROP CONSTRAINT IF EXISTS "anotacion_id_alumno_fkey";
ALTER TABLE "anotacion" ADD CONSTRAINT "anotacion_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "anotacion" DROP CONSTRAINT IF EXISTS "anotacion_id_usuario_fkey";
ALTER TABLE "anotacion" ADD CONSTRAINT "anotacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "comunicado" DROP CONSTRAINT IF EXISTS "comunicado_publicado_por_fkey";
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_publicado_por_fkey" FOREIGN KEY ("publicado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "historial_grados" DROP CONSTRAINT IF EXISTS "historial_grados_id_alumno_fkey";
ALTER TABLE "historial_grados" ADD CONSTRAINT "historial_grados_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "historial_grados" DROP CONSTRAINT IF EXISTS "historial_grados_id_grado_fkey";
ALTER TABLE "historial_grados" ADD CONSTRAINT "historial_grados_id_grado_fkey" FOREIGN KEY ("id_grado") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "historial_grados" DROP CONSTRAINT IF EXISTS "historial_grados_id_examen_fkey";
ALTER TABLE "historial_grados" ADD CONSTRAINT "historial_grados_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examen_programado"("id_examen");
ALTER TABLE "inscripcion_campeonato" DROP CONSTRAINT IF EXISTS "inscripcion_campeonato_id_campeonato_fkey";
ALTER TABLE "inscripcion_campeonato" ADD CONSTRAINT "inscripcion_campeonato_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "inscripcion_campeonato" DROP CONSTRAINT IF EXISTS "inscripcion_campeonato_aprobado_por_fkey";
ALTER TABLE "inscripcion_campeonato" ADD CONSTRAINT "inscripcion_campeonato_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "inscripcion_campeonato" DROP CONSTRAINT IF EXISTS "competidor_id_inscripcion_fkey";
ALTER TABLE "inscripcion_campeonato" ADD CONSTRAINT "competidor_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripcion_campeonato"("id_inscripcion");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "competidor_id_campeonato_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "competidor_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "competidor_id_categoria_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "competidor_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "competidor_id_alumno_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "competidor_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "llave_combate_id_competidor1_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "llave_combate_id_competidor1_fkey" FOREIGN KEY ("id_competidor1") REFERENCES "competidor"("id_competidor");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "llave_combate_id_competidor2_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "llave_combate_id_competidor2_fkey" FOREIGN KEY ("id_competidor2") REFERENCES "competidor"("id_competidor");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "llave_combate_ganador_id_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "llave_combate_ganador_id_fkey" FOREIGN KEY ("ganador_id") REFERENCES "competidor"("id_competidor");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "medalla_id_competidor_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "medalla_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "competidor_id_inscripcion_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "competidor_id_inscripcion_fkey" FOREIGN KEY ("id_inscripcion") REFERENCES "inscripcion_campeonato"("id_inscripcion");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_id_competidor_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "pesaje_campeonato_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "competidor" DROP CONSTRAINT IF EXISTS "poomsae_puntuacion_id_competidor_fkey";
ALTER TABLE "competidor" ADD CONSTRAINT "poomsae_puntuacion_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "llave_combate" DROP CONSTRAINT IF EXISTS "llave_combate_id_categoria_fkey";
ALTER TABLE "llave_combate" ADD CONSTRAINT "llave_combate_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "llave_combate" DROP CONSTRAINT IF EXISTS "llave_combate_id_competidor1_fkey";
ALTER TABLE "llave_combate" ADD CONSTRAINT "llave_combate_id_competidor1_fkey" FOREIGN KEY ("id_competidor1") REFERENCES "competidor"("id_competidor");
ALTER TABLE "llave_combate" DROP CONSTRAINT IF EXISTS "llave_combate_id_competidor2_fkey";
ALTER TABLE "llave_combate" ADD CONSTRAINT "llave_combate_id_competidor2_fkey" FOREIGN KEY ("id_competidor2") REFERENCES "competidor"("id_competidor");
ALTER TABLE "llave_combate" DROP CONSTRAINT IF EXISTS "llave_combate_ganador_id_fkey";
ALTER TABLE "llave_combate" ADD CONSTRAINT "llave_combate_ganador_id_fkey" FOREIGN KEY ("ganador_id") REFERENCES "competidor"("id_competidor");
ALTER TABLE "llave_combate" DROP CONSTRAINT IF EXISTS "llave_combate_siguiente_llave_fkey";
ALTER TABLE "llave_combate" ADD CONSTRAINT "llave_combate_siguiente_llave_fkey" FOREIGN KEY ("siguiente_llave") REFERENCES "llave_combate"("id_llave");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "maestro_id_usuario_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "maestro_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "maestro_id_sede_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "maestro_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "clase_id_maestro_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "clase_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "asistencia_maestro_id_maestro_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "asistencia_maestro_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "maestro_turno_id_maestro_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "maestro_turno_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "maestro" DROP CONSTRAINT IF EXISTS "planilla_maestro_id_maestro_fkey";
ALTER TABLE "maestro" ADD CONSTRAINT "planilla_maestro_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "asistencia_maestro" DROP CONSTRAINT IF EXISTS "asistencia_maestro_id_maestro_fkey";
ALTER TABLE "asistencia_maestro" ADD CONSTRAINT "asistencia_maestro_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "asistencia_maestro" DROP CONSTRAINT IF EXISTS "asistencia_maestro_id_sede_fkey";
ALTER TABLE "asistencia_maestro" ADD CONSTRAINT "asistencia_maestro_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "clase" DROP CONSTRAINT IF EXISTS "clase_id_turno_fkey";
ALTER TABLE "clase" ADD CONSTRAINT "clase_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "clase" DROP CONSTRAINT IF EXISTS "clase_id_maestro_fkey";
ALTER TABLE "clase" ADD CONSTRAINT "clase_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "clase" DROP CONSTRAINT IF EXISTS "asistencia_alumno_id_clase_fkey";
ALTER TABLE "clase" ADD CONSTRAINT "asistencia_alumno_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "clase"("id_clase");
ALTER TABLE "asistencia_alumno" DROP CONSTRAINT IF EXISTS "asistencia_alumno_id_clase_fkey";
ALTER TABLE "asistencia_alumno" ADD CONSTRAINT "asistencia_alumno_id_clase_fkey" FOREIGN KEY ("id_clase") REFERENCES "clase"("id_clase");
ALTER TABLE "asistencia_alumno" DROP CONSTRAINT IF EXISTS "asistencia_alumno_id_alumno_fkey";
ALTER TABLE "asistencia_alumno" ADD CONSTRAINT "asistencia_alumno_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "maestro_turno" DROP CONSTRAINT IF EXISTS "maestro_turno_id_maestro_fkey";
ALTER TABLE "maestro_turno" ADD CONSTRAINT "maestro_turno_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "maestro_turno" DROP CONSTRAINT IF EXISTS "maestro_turno_id_turno_fkey";
ALTER TABLE "maestro_turno" ADD CONSTRAINT "maestro_turno_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "matricula" DROP CONSTRAINT IF EXISTS "matricula_id_alumno_fkey";
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "matricula" DROP CONSTRAINT IF EXISTS "matricula_id_turno_fkey";
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_id_turno_fkey" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno");
ALTER TABLE "medalla" DROP CONSTRAINT IF EXISTS "medalla_id_competidor_fkey";
ALTER TABLE "medalla" ADD CONSTRAINT "medalla_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "medalla" DROP CONSTRAINT IF EXISTS "medalla_id_campeonato_fkey";
ALTER TABLE "medalla" ADD CONSTRAINT "medalla_id_campeonato_fkey" FOREIGN KEY ("id_campeonato") REFERENCES "campeonato"("id_campeonato");
ALTER TABLE "medalla" DROP CONSTRAINT IF EXISTS "medalla_id_categoria_fkey";
ALTER TABLE "medalla" ADD CONSTRAINT "medalla_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_alumno_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_sede_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sede"("id_sede");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_registrado_por_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_metodo_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_metodo_fkey" FOREIGN KEY ("id_metodo") REFERENCES "metodo_pago"("id_metodo");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_concepto_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_concepto_fkey" FOREIGN KEY ("id_concepto") REFERENCES "concepto_pago"("id_concepto");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_plan_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_plan_fkey" FOREIGN KEY ("id_plan") REFERENCES "plan_mensualidad"("id_plan");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_id_descuento_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "pago_id_descuento_fkey" FOREIGN KEY ("id_descuento") REFERENCES "descuento"("id_descuento");
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "examen_candidato_id_pago_fkey";
ALTER TABLE "pago" ADD CONSTRAINT "examen_candidato_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "pago"("id_pago");
ALTER TABLE "examen_candidato" DROP CONSTRAINT IF EXISTS "examen_candidato_id_examen_fkey";
ALTER TABLE "examen_candidato" ADD CONSTRAINT "examen_candidato_id_examen_fkey" FOREIGN KEY ("id_examen") REFERENCES "examen_programado"("id_examen");
ALTER TABLE "examen_candidato" DROP CONSTRAINT IF EXISTS "examen_candidato_id_alumno_fkey";
ALTER TABLE "examen_candidato" ADD CONSTRAINT "examen_candidato_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "alumno"("id_alumno");
ALTER TABLE "examen_candidato" DROP CONSTRAINT IF EXISTS "examen_candidato_id_grado_destino_fkey";
ALTER TABLE "examen_candidato" ADD CONSTRAINT "examen_candidato_id_grado_destino_fkey" FOREIGN KEY ("id_grado_destino") REFERENCES "grado_marcial"("id_grado");
ALTER TABLE "examen_candidato" DROP CONSTRAINT IF EXISTS "examen_candidato_id_pago_fkey";
ALTER TABLE "examen_candidato" ADD CONSTRAINT "examen_candidato_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "pago"("id_pago");
ALTER TABLE "pesaje_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_id_competidor_fkey";
ALTER TABLE "pesaje_campeonato" ADD CONSTRAINT "pesaje_campeonato_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "pesaje_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_categoria_original_fkey";
ALTER TABLE "pesaje_campeonato" ADD CONSTRAINT "pesaje_campeonato_categoria_original_fkey" FOREIGN KEY ("categoria_original") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "pesaje_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_categoria_final_fkey";
ALTER TABLE "pesaje_campeonato" ADD CONSTRAINT "pesaje_campeonato_categoria_final_fkey" FOREIGN KEY ("categoria_final") REFERENCES "categoria_campeonato"("id_categoria");
ALTER TABLE "pesaje_campeonato" DROP CONSTRAINT IF EXISTS "pesaje_campeonato_pesado_por_fkey";
ALTER TABLE "pesaje_campeonato" ADD CONSTRAINT "pesaje_campeonato_pesado_por_fkey" FOREIGN KEY ("pesado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "planilla_maestro" DROP CONSTRAINT IF EXISTS "planilla_maestro_id_maestro_fkey";
ALTER TABLE "planilla_maestro" ADD CONSTRAINT "planilla_maestro_id_maestro_fkey" FOREIGN KEY ("id_maestro") REFERENCES "maestro"("id_maestro");
ALTER TABLE "planilla_maestro" DROP CONSTRAINT IF EXISTS "planilla_maestro_pagado_por_fkey";
ALTER TABLE "planilla_maestro" ADD CONSTRAINT "planilla_maestro_pagado_por_fkey" FOREIGN KEY ("pagado_por") REFERENCES "usuario"("id_usuario");
ALTER TABLE "poomsae_puntuacion" DROP CONSTRAINT IF EXISTS "poomsae_puntuacion_id_ronda_fkey";
ALTER TABLE "poomsae_puntuacion" ADD CONSTRAINT "poomsae_puntuacion_id_ronda_fkey" FOREIGN KEY ("id_ronda") REFERENCES "poomsae_ronda"("id_ronda");
ALTER TABLE "poomsae_puntuacion" DROP CONSTRAINT IF EXISTS "poomsae_puntuacion_id_competidor_fkey";
ALTER TABLE "poomsae_puntuacion" ADD CONSTRAINT "poomsae_puntuacion_id_competidor_fkey" FOREIGN KEY ("id_competidor") REFERENCES "competidor"("id_competidor");
ALTER TABLE "apoderado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campeonato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categoria_campeonato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concepto_pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grado_marcial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metodo_pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poomsae_ronda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rol" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sede" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "config_precios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "descuento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "examen_programado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_mensualidad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alumno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anotacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comunicado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historial_grados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inscripcion_campeonato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competidor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "llave_combate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maestro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asistencia_maestro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asistencia_alumno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maestro_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matricula" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medalla" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "examen_candidato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pesaje_campeonato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planilla_maestro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poomsae_puntuacion" ENABLE ROW LEVEL SECURITY;
COMMIT;