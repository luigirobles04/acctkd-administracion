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
  ('CCTKD-0012', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0012-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0012', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0012-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0012', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0012-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0013', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0013-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0013', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0013-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0013', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0013-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0013', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0013-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0014', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0014-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0014', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0014-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0014', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0014-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0014', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0014-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0015', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0015-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0015', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0015-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0015', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0015-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0015', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0015-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0015', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0015-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0016', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0016-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0016', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0016-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0016', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0016-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0016', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0016-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0017', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0017-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0017', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0017-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0017', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0017-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0017', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0017-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0018', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0018-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0018', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0018-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0018', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0018-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0018', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0018-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0019', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0019-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0019', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0019-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0019', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0019-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0019', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0019-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0020', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0020-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0020', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0020-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0020', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0020-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0020', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0020-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0020', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0020-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0021', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0021-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0021', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0021-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0021', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0021-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0021', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0021-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0022', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0022-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0022', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0022-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0022', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0022-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0022', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0022-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0023', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0023-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0023', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0023-0226', 'MENSUALIDAD', 'Mensualidad', NULL)
) AS v(codigo, fp, mc, est, met, descu, pobs, nrec, conc, ctext, mfij)
JOIN alumno a ON a.codigo_alumno = v.codigo
JOIN plan_mensualidad pm ON pm.id_plan = a.id_plan
WHERE NOT EXISTS (SELECT 1 FROM pago p WHERE p.numero_recibo = v.nrec);
