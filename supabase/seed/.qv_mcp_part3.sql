-- Historial de grados (1–2 exámenes ficticios por alumno)
INSERT INTO historial_grados (id_alumno, id_grado, fecha_examen, aprobado, observaciones, codigo_examen)
SELECT a.id_alumno, g1.id_grado, DATE '2024-06-10', true, 'Promoción examen mitad de año.', 'SIM-24-' || right(a.codigo_alumno, 4)
FROM alumno a
CROSS JOIN LATERAL (SELECT id_grado FROM grado_marcial ORDER BY nivel NULLS LAST, id_grado LIMIT 1 OFFSET 0) g1
WHERE a.codigo_alumno IN ('CCTKD-0001',
  'CCTKD-0002',
  'CCTKD-0003',
  'CCTKD-0004',
  'CCTKD-0005',
  'CCTKD-0006',
  'CCTKD-0007',
  'CCTKD-0008',
  'CCTKD-0009',
  'CCTKD-0010',
  'CCTKD-0011',
  'CCTKD-0012',
  'CCTKD-0013',
  'CCTKD-0014',
  'CCTKD-0015',
  'CCTKD-0016',
  'CCTKD-0017',
  'CCTKD-0018',
  'CCTKD-0019',
  'CCTKD-0020',
  'CCTKD-0021',
  'CCTKD-0022',
  'CCTKD-0023',
  'CCTKD-0024',
  'CCTKD-0025',
  'CCTKD-0026',
  'CCTKD-0027',
  'CCTKD-0028',
  'CCTKD-0029',
  'CCTKD-0030',
  'CCTKD-0031',
  'CCTKD-0032',
  'CCTKD-0033',
  'CCTKD-0034',
  'CCTKD-0035',
  'CCTKD-0036',
  'CCTKD-0037',
  'CCTKD-0038',
  'CCTKD-0039',
  'CCTKD-0040',
  'CCTKD-0041',
  'CCTKD-0042',
  'CCTKD-0043',
  'CCTKD-0044',
  'CCTKD-0045');

INSERT INTO historial_grados (id_alumno, id_grado, fecha_examen, aprobado, observaciones, codigo_examen)
SELECT a.id_alumno, g2.id_grado, DATE '2025-09-05', true, 'Sube de grado — simulación.', 'SIM-25-' || right(a.codigo_alumno, 4)
FROM alumno a
CROSS JOIN LATERAL (
  SELECT id_grado FROM grado_marcial ORDER BY nivel NULLS LAST, id_grado LIMIT 1 OFFSET 1
) g2
WHERE a.codigo_alumno IN ('CCTKD-0001',
  'CCTKD-0002',
  'CCTKD-0003',
  'CCTKD-0004',
  'CCTKD-0005',
  'CCTKD-0006',
  'CCTKD-0007',
  'CCTKD-0008',
  'CCTKD-0009',
  'CCTKD-0010',
  'CCTKD-0011',
  'CCTKD-0012',
  'CCTKD-0013',
  'CCTKD-0014',
  'CCTKD-0015',
  'CCTKD-0016',
  'CCTKD-0017',
  'CCTKD-0018',
  'CCTKD-0019',
  'CCTKD-0020',
  'CCTKD-0021',
  'CCTKD-0022',
  'CCTKD-0023',
  'CCTKD-0024',
  'CCTKD-0025',
  'CCTKD-0026',
  'CCTKD-0027',
  'CCTKD-0028',
  'CCTKD-0029',
  'CCTKD-0030',
  'CCTKD-0031',
  'CCTKD-0032',
  'CCTKD-0033',
  'CCTKD-0034',
  'CCTKD-0035',
  'CCTKD-0036',
  'CCTKD-0037',
  'CCTKD-0038',
  'CCTKD-0039',
  'CCTKD-0040',
  'CCTKD-0041',
  'CCTKD-0042',
  'CCTKD-0043',
  'CCTKD-0044',
  'CCTKD-0045')
AND (SELECT COUNT(*)::int FROM grado_marcial) >= 2;

-- Clases feb–15 abr 2026 según días del turno
INSERT INTO clase (id_turno, fecha)
SELECT t.id_turno, gs::date
FROM generate_series(DATE '2026-02-01', DATE '2026-04-15', INTERVAL '1 day') gs
JOIN turno t ON EXTRACT(ISODOW FROM gs::timestamp)::int = ANY(COALESCE(t.dias_array, ARRAY[]::int[]))
ON CONFLICT (id_turno, fecha) DO NOTHING;

-- Asistencias variadas (presente / ausente / justificada / recuperación)
INSERT INTO asistencia_alumno (id_clase, id_alumno, presente, justificado, observacion)
SELECT
  c.id_clase,
  a.id_alumno,
  CASE WHEN hm.h = ANY (ARRAY[0, 1, 2, 5]) THEN true ELSE false END,
  CASE WHEN hm.h = 4 THEN true ELSE false END,
  CASE WHEN hm.h = 5 THEN 'Recuperación' ELSE NULL END
FROM clase c
JOIN alumno a ON a.id_turno = c.id_turno AND a.estado = 'activo'
CROSS JOIN LATERAL (
  SELECT mod(abs(hashtext(a.id_alumno::text || c.fecha::text)), 6)::int AS h
) hm
WHERE c.fecha BETWEEN DATE '2026-02-01' AND DATE '2026-04-15'
  AND a.codigo_alumno IN ('CCTKD-0001',
  'CCTKD-0002',
  'CCTKD-0003',
  'CCTKD-0004',
  'CCTKD-0005',
  'CCTKD-0006',
  'CCTKD-0007',
  'CCTKD-0008',
  'CCTKD-0009',
  'CCTKD-0010',
  'CCTKD-0011',
  'CCTKD-0012',
  'CCTKD-0013',
  'CCTKD-0014',
  'CCTKD-0015',
  'CCTKD-0016',
  'CCTKD-0017',
  'CCTKD-0018',
  'CCTKD-0019',
  'CCTKD-0020',
  'CCTKD-0021',
  'CCTKD-0022',
  'CCTKD-0023',
  'CCTKD-0024',
  'CCTKD-0025',
  'CCTKD-0026',
  'CCTKD-0027',
  'CCTKD-0028',
  'CCTKD-0029',
  'CCTKD-0030',
  'CCTKD-0031',
  'CCTKD-0032',
  'CCTKD-0033',
  'CCTKD-0034',
  'CCTKD-0035',
  'CCTKD-0036',
  'CCTKD-0037',
  'CCTKD-0038',
  'CCTKD-0039',
  'CCTKD-0040',
  'CCTKD-0041',
  'CCTKD-0042',
  'CCTKD-0043',
  'CCTKD-0044',
  'CCTKD-0045')
ON CONFLICT (id_clase, id_alumno) DO UPDATE SET
  presente = EXCLUDED.presente,
  justificado = EXCLUDED.justificado,
  observacion = EXCLUDED.observacion;
