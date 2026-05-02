-- Backfill: todo alumno debe tener al menos un registro en historial_grados (pestaña Grados).
-- Toma como referencia COALESCE(alumno.id_grado_actual, primer grado del catálogo por nivel).
-- Idempotente: no inserta si ya existe cualquier fila de historial para ese alumno.

UPDATE alumno AS a
SET id_grado_actual = g.id_grado
FROM (
  SELECT id_grado
  FROM grado_marcial
  ORDER BY nivel NULLS LAST, id_grado ASC
  LIMIT 1
) AS g
WHERE a.id_grado_actual IS NULL
  AND EXISTS (SELECT 1 FROM grado_marcial LIMIT 1);

INSERT INTO historial_grados (id_alumno, id_grado, fecha_examen, aprobado, observaciones, codigo_examen)
SELECT
  a.id_alumno,
  COALESCE(a.id_grado_actual, g.id_grado),
  COALESCE(a.fecha_ingreso, CURRENT_DATE)::DATE,
  TRUE,
  'Ingreso a la academia · registro inicial de grado (ACCTKD).',
  'ACCTKD-INI-' || a.id_alumno::TEXT
FROM alumno AS a
CROSS JOIN LATERAL (
  SELECT id_grado
  FROM grado_marcial
  ORDER BY nivel NULLS LAST, id_grado ASC
  LIMIT 1
) AS g
WHERE EXISTS (SELECT 1 FROM grado_marcial LIMIT 1)
  AND NOT EXISTS (
    SELECT 1
    FROM historial_grados AS hg
    WHERE hg.id_alumno = a.id_alumno
  );
