-- Mensualidades y algunos conceptos extra (pagado / pendiente / vencido)
INSERT INTO pago (
  id_alumno, id_sede, id_concepto, id_metodo, id_plan,
  monto, descuento, estado, fecha_pago, mes_correspondiente,
  concepto, metodo_pago, observaciones, numero_recibo,
  fecha_vencimiento
)
SELECT
  a.id_alumno,
  a.id_sede,
  (SELECT id_concepto FROM concepto_pago WHERE codigo = v.conc LIMIT 1),
  (SELECT id_metodo FROM metodo_pago WHERE codigo = (
    CASE lower(trim(v.met))
      WHEN 'yape' THEN 'YAPE'
      WHEN 'transferencia' THEN 'BCP'
      WHEN 'plin' THEN 'PLIN'
      ELSE 'EFECTIVO'
    END
  ) LIMIT 1),
  a.id_plan,
  GREATEST(0::numeric, COALESCE(v.mfij, pm.monto) - COALESCE(v.descu, 0)),
  COALESCE(v.descu, 0),
  v.est,
  v.fp,
  v.mc,
  v.ctext,
  v.met,
  v.pobs,
  v.nrec,
  CASE
    WHEN v.est = 'pendiente' THEN v.fp + 12
    WHEN v.est = 'vencido' THEN v.fp - 5
    ELSE NULL
  END
FROM (
  VALUES
  ('CCTKD-0001', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0001-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0001', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0001-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0001', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0001-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0001', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0001-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0002', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0002-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0002', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0002-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0002', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0002-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0002', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0002-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0003', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0003-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0003', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0003-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0003', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0003-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0003', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0003-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0004', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0004-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0004', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0004-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0004', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0004-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0004', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0004-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0005', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0005-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0005', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0005-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0005', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0005-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0005', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0005-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0005', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0005-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0006', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0006-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0006', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0006-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0006', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0006-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0006', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0006-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0007', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0007-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0007', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0007-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0007', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0007-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0007', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0007-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0008', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0008-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0008', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0008-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0008', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0008-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0008', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0008-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0009', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0009-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0009', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0009-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0009', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0009-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0009', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0009-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0010', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0010-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0010', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0010-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0010', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0010-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0010', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0010-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0010', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0010-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0011', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0011-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0011', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0011-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0011', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0011-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0011', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0011-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0012', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0012-0126', 'MENSUALIDAD', 'Mensualidad', NULL)
) AS v(codigo, fp, mc, est, met, descu, pobs, nrec, conc, ctext, mfij)
JOIN alumno a ON a.codigo_alumno = v.codigo
JOIN plan_mensualidad pm ON pm.id_plan = a.id_plan
WHERE NOT EXISTS (SELECT 1 FROM pago p WHERE p.numero_recibo = v.nrec);
