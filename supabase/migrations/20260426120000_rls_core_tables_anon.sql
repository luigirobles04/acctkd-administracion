-- RLS en tablas núcleo usadas desde el admin con la clave anónima (auth custom).
-- Complementa 20260420_000001: allí solo se cubrían catálogos nuevos; sin política,
-- filas en pago / alumno / historial_grados pueden quedar invisibles si RLS está activo.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'pago',
        'alumno',
        'historial_grados',
        'sede',
        'turno',
        'grado_marcial',
        'apoderado',
        'maestro',
        'usuario',
        'asistencia_alumno',
        'clase',
        'campeonato',
        'descuento',
        'alumno_archivo'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "Acceso total anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END$$;
