-- FestCup 2026: limpiar datos operativos de prueba + optimización pre-evento.
-- Idempotente donde aplica (IF NOT EXISTS / IF EXISTS).

-- NOTA: no borrar inscripciones ni academia_campeonato en FestCup real (id=10).
-- Solo optimización de índices y funciones.

-- ─── 1. Índices duplicados (mantener el más descriptivo / el de migraciones recientes) ───

DROP INDEX IF EXISTS public.academia_campeonato_campeonato_idx;
ALTER TABLE public.asistencia_alumno
  DROP CONSTRAINT IF EXISTS uq_asistencia_alumno_clase_alumno;
DROP INDEX IF EXISTS public.ux_asistencia_alumno_clase;
DROP INDEX IF EXISTS public.llave_kyorugi_cancha_idx;

-- ─── 3. FKs críticas para inscripciones, llaves y bitácora en evento ───

CREATE INDEX IF NOT EXISTS idx_academia_camp_id_academia
  ON public.academia_campeonato (id_academia);

CREATE INDEX IF NOT EXISTS idx_categoria_camp_campeonato
  ON public.categoria_campeonato (id_campeonato);

CREATE INDEX IF NOT EXISTS idx_linea_insc_categoria
  ON public.linea_inscripcion (id_categoria);

CREATE INDEX IF NOT EXISTS idx_bitacora_insc_academia
  ON public.bitacora_inscripcion (id_academia_campeonato);

CREATE INDEX IF NOT EXISTS idx_bitacora_insc_linea
  ON public.bitacora_inscripcion (id_linea);

CREATE INDEX IF NOT EXISTS idx_cola_offline_campeonato
  ON public.cola_offline (id_campeonato);

CREATE INDEX IF NOT EXISTS idx_cola_offline_academia
  ON public.cola_offline (id_academia_campeonato);

CREATE INDEX IF NOT EXISTS idx_llave_kyorugi_linea1
  ON public.llave_kyorugi (id_linea1);

CREATE INDEX IF NOT EXISTS idx_llave_kyorugi_linea2
  ON public.llave_kyorugi (id_linea2);

CREATE INDEX IF NOT EXISTS idx_llave_kyorugi_ganador_linea
  ON public.llave_kyorugi (ganador_id_linea);

CREATE INDEX IF NOT EXISTS idx_llave_kyorugi_siguiente
  ON public.llave_kyorugi (siguiente_llave);

-- ─── 4. Endurecimiento linter (search_path + RPC admin) ───

ALTER FUNCTION public.generar_numero_recibo() SET search_path = public;
ALTER FUNCTION public.generar_codigo_alumno() SET search_path = public;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
