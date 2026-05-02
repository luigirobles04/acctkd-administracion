-- =============================================================================
-- ACCTKD · Datos sintéticos coherentes · 2026-01-05 → 2026-04-15
-- ─ tipo_sangre A+ en todos los alumnos
-- ─ Sesiones clase por dias_array del turno + asistencias variadas
-- ─ Alumnos en prueba: UNA marca «Clase de prueba ACCTKD» + alumno.id_clase_prueba (editable en app)
-- ─ Pagos: mensualidades ene–abr + matrícula en subconjunto
-- Elimina/recrea sólo registros marcados SYNTH-* y observaciones demo (ver DELETE abajo).
-- =============================================================================

ALTER TABLE alumno ADD COLUMN IF NOT EXISTS id_clase_prueba INTEGER REFERENCES clase(id_clase);

DELETE FROM asistencia_alumno a
WHERE a.id_clase IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM asistencia_alumno k
    WHERE k.id_alumno = a.id_alumno AND k.id_clase = a.id_clase AND k.id < a.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_asistencia_alumno_clase
  ON asistencia_alumno(id_clase, id_alumno);

UPDATE alumno SET tipo_sangre = 'A+';

DELETE FROM pago WHERE numero_recibo LIKE 'SYNTH-ACCTKD-%'
  OR numero_recibo LIKE 'SYN-%'
  OR numero_recibo LIKE 'M-%';

DELETE FROM asistencia_alumno
WHERE observacion IN (
    'Clase de prueba ACCTKD',
    'Recuperación (demo)',
    'Viaje familia · justificado (demo)',
    'Certificado médico (demo)',
    'Justificación (demo)'
  )
  OR observacion LIKE 'Viaje familia%';

UPDATE alumno SET id_clase_prueba = NULL WHERE estado = 'prueba';

INSERT INTO clase (id_turno, id_maestro, fecha)
SELECT
  t.id_turno,
  (
    SELECT mt.id_maestro FROM maestro_turno mt
    WHERE mt.id_turno = t.id_turno
    ORDER BY mt.es_titular DESC NULLS LAST LIMIT 1
  ),
  gs.d::DATE AS fecha
FROM turno t
CROSS JOIN LATERAL generate_series(DATE '2026-01-05', DATE '2026-04-15', INTERVAL '1 day') AS gs(d)
WHERE COALESCE(t.activo, TRUE) IS TRUE
  AND COALESCE(cardinality(COALESCE(t.dias_array, '{}'::INTEGER[])), 0) > 0
  AND EXTRACT(ISODOW FROM gs.d)::INT = ANY (t.dias_array)
  AND NOT EXISTS (SELECT 1 FROM clase c WHERE c.id_turno = t.id_turno AND c.fecha = gs.d::DATE);

WITH base AS (
  SELECT
    c.id_clase,
    a.id_alumno,
    c.fecha,
    LEAST(
      99::INT,
      (ABS(hashtext(a.id_alumno::TEXT || '|' || c.fecha::TEXT)) % 100)
      + CASE
          WHEN a.estado = 'suspendido' AND c.fecha >= DATE '2026-03-01' THEN 22::INT
          ELSE 0::INT
        END
    )::INT AS hm
  FROM clase c
  INNER JOIN alumno a ON a.id_turno = c.id_turno
  WHERE a.estado IN ('activo', 'suspendido', 'retirado')
    AND c.fecha BETWEEN DATE '2026-01-05' AND DATE '2026-04-15'
    AND c.fecha >= GREATEST(DATE '2026-01-05', COALESCE(a.fecha_ingreso, DATE '2026-01-01')::DATE)
    AND NOT (a.estado = 'retirado' AND c.fecha > DATE '2026-03-24')
),
fin AS (
  SELECT
    id_clase,
    id_alumno,
    CASE
      WHEN hm <= 70 THEN TRUE
      WHEN hm >= 71 AND hm <= 77 THEN FALSE
      WHEN hm >= 78 AND hm <= 84 THEN FALSE
      WHEN hm >= 85 AND hm <= 91 THEN TRUE
      ELSE FALSE
    END AS presente,
    CASE
      WHEN hm >= 71 AND hm <= 77 THEN TRUE
      ELSE FALSE
    END AS justificado,
    CASE
      WHEN hm >= 71 AND hm <= 73 THEN 'Viaje familia · justificado (demo)'::TEXT
      WHEN hm >= 74 AND hm <= 77 THEN 'Certificado médico (demo)'::TEXT
      WHEN hm >= 85 AND hm <= 91 THEN 'Recuperación (demo)'::TEXT
      ELSE NULL::TEXT
    END AS observacion
  FROM base
)
INSERT INTO asistencia_alumno (id_clase, id_alumno, presente, justificado, observacion)
SELECT id_clase, id_alumno, presente, justificado, observacion
FROM fin
ON CONFLICT (id_clase, id_alumno) DO NOTHING;

WITH primera_prueba AS (
  SELECT DISTINCT ON (a.id_alumno)
    a.id_alumno,
    c.id_clase
  FROM alumno a
  INNER JOIN clase c ON c.id_turno = a.id_turno
  WHERE a.estado = 'prueba'
    AND a.id_turno IS NOT NULL
    AND c.fecha BETWEEN DATE '2026-01-05' AND DATE '2026-04-15'
    AND c.fecha >= GREATEST(DATE '2026-01-05', COALESCE(a.fecha_ingreso, DATE '2026-01-01')::DATE)
  ORDER BY a.id_alumno, c.fecha ASC
)
INSERT INTO asistencia_alumno (id_clase, id_alumno, presente, justificado, observacion)
SELECT fp.id_clase, fp.id_alumno, TRUE, FALSE, 'Clase de prueba ACCTKD'::TEXT
FROM primera_prueba fp
ON CONFLICT (id_clase, id_alumno) DO UPDATE SET
  presente = TRUE,
  justificado = FALSE,
  observacion = EXCLUDED.observacion;

UPDATE alumno a
SET id_clase_prueba = sq.id_clase
FROM (
  SELECT DISTINCT ON (aa.id_alumno)
    aa.id_alumno,
    aa.id_clase
  FROM asistencia_alumno aa
  INNER JOIN alumno au ON au.id_alumno = aa.id_alumno AND au.estado = 'prueba'
  WHERE aa.observacion = 'Clase de prueba ACCTKD'
  ORDER BY aa.id_alumno, (SELECT cl.fecha FROM clase cl WHERE cl.id_clase = aa.id_clase) ASC NULLS LAST
) sq
WHERE a.id_alumno = sq.id_alumno AND a.estado = 'prueba';

WITH meses AS (
  SELECT d::DATE AS primer_dia
  FROM generate_series(DATE '2026-01-01', DATE '2026-04-01', INTERVAL '1 month') AS gs(d)
),
ctx AS (
  SELECT
    a.id_alumno,
    a.id_sede,
    a.id_plan,
    COALESCE(pm.monto, 120.00) AS m_plan,
    m.primer_dia,
    ABS(hashtext(a.id_alumno::TEXT || '|' || m.primer_dia::TEXT)) AS hx
  FROM alumno a
  CROSS JOIN meses m
  LEFT JOIN plan_mensualidad pm ON pm.id_plan = a.id_plan
  WHERE a.estado IN ('activo', 'prueba', 'suspendido')
    AND m.primer_dia >= DATE_TRUNC('month', COALESCE(a.fecha_ingreso, DATE '2026-01-05'))::DATE
    AND m.primer_dia <= DATE '2026-04-01'
    AND EXISTS (SELECT 1 FROM concepto_pago cp WHERE cp.codigo = 'MENSUALIDAD' LIMIT 1)
)
INSERT INTO pago (
  id_alumno, id_sede, concepto, monto, descuento,
  fecha_pago, mes_correspondiente, metodo_pago, estado,
  id_metodo, id_concepto, id_plan, numero_recibo, fecha_vencimiento, observaciones
)
SELECT
  c.id_alumno,
  COALESCE(c.id_sede, 1),
  'Mensualidad',
  c.m_plan,
  CASE WHEN (c.hx % 11) = 0 THEN ROUND(c.m_plan * 0.10, 2) ELSE 0 END,
  CASE
    WHEN (c.hx % 61 = 8) THEN (c.primer_dia + 2)::DATE
    ELSE (c.primer_dia + LEAST(c.hx % 18, 16))::DATE
  END,
  c.primer_dia,
  'efectivo',
  CASE
    WHEN (c.hx % 23 = 3) THEN 'pendiente'::TEXT
    WHEN (c.hx % 61 = 8) THEN 'vencido'::TEXT
    WHEN (c.hx % 41 = 7) THEN 'pendiente'::TEXT
    ELSE 'pagado'::TEXT
  END,
  (
    SELECT mp.id_metodo FROM metodo_pago mp WHERE COALESCE(mp.activo, TRUE) IS TRUE
    ORDER BY mp.orden NULLS LAST, mp.id_metodo
    OFFSET (
      c.hx % GREATEST(
        (SELECT COUNT(*)::INT FROM metodo_pago x WHERE COALESCE(x.activo, TRUE) IS TRUE),
        1
      )
    ) LIMIT 1
  ),
  (SELECT id_concepto FROM concepto_pago WHERE codigo = 'MENSUALIDAD' LIMIT 1),
  c.id_plan,
  'SYN-' || LPAD(c.id_alumno::TEXT, 6, '0') || TO_CHAR(c.primer_dia, 'YYMM'),
  CASE
    WHEN (c.hx % 23 = 3) THEN (c.primer_dia + 16)::DATE
    WHEN (c.hx % 61 = 8) THEN (c.primer_dia + 35)::DATE
    WHEN (c.hx % 41 = 7) THEN (c.primer_dia + 10)::DATE
    ELSE NULL::DATE
  END,
  'Registro sintético coherencia ACCTKD (demo).'::TEXT
FROM ctx c
ON CONFLICT (numero_recibo) DO NOTHING;

INSERT INTO pago (
  id_alumno, id_sede, concepto, monto, descuento,
  fecha_pago, mes_correspondiente, metodo_pago, estado,
  id_metodo, id_concepto, numero_recibo, observaciones
)
SELECT
  a.id_alumno,
  COALESCE(a.id_sede, 1),
  'Matrícula',
  180.00,
  0,
  LEAST(GREATEST(COALESCE(a.fecha_ingreso, DATE '2026-01-05'), DATE '2026-01-05'), DATE '2026-04-10'),
  DATE_TRUNC('month', COALESCE(a.fecha_ingreso, DATE '2026-01-05'))::DATE,
  CASE WHEN (ABS(hashtext('mat|' || a.id_alumno::TEXT)) % 5) <= 3 THEN 'yape'::TEXT ELSE 'efectivo'::TEXT END,
  'pagado',
  (
    SELECT mp.id_metodo FROM metodo_pago mp WHERE COALESCE(mp.activo, TRUE) IS TRUE
    ORDER BY mp.orden NULLS LAST OFFSET (
      ABS(hashtext('m2|' || a.id_alumno::TEXT)) % GREATEST(
        (SELECT COUNT(*)::INT FROM metodo_pago z WHERE COALESCE(z.activo, TRUE) IS TRUE), 1
      )
    ) LIMIT 1
  ),
  (SELECT id_concepto FROM concepto_pago WHERE codigo = 'MATRICULA' LIMIT 1),
  'M-' || LPAD(a.id_alumno::TEXT, 6, '0'),
  'Matrícula demo ACCTKD.'::TEXT
FROM alumno a
WHERE a.estado IN ('activo', 'prueba', 'suspendido')
  AND EXISTS (SELECT 1 FROM concepto_pago cp WHERE cp.codigo = 'MATRICULA')
  AND (ABS(hashtext('mh|' || a.id_alumno::TEXT)) % 7) BETWEEN 2 AND 5
ON CONFLICT (numero_recibo) DO NOTHING;
