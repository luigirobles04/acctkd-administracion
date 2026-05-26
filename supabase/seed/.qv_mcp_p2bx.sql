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
  ('CCTKD-0023', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0023-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0023', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0023-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0024', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0024-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0024', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0024-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0024', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0024-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0024', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0024-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0025', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0025-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0025', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0025-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0025', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0025-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0025', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0025-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0025', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0025-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0026', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0026-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0026', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0026-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0026', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0026-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0026', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0026-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0027', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0027-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0027', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0027-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0027', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0027-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0027', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0027-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0028', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0028-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0028', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0028-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0028', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0028-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0028', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0028-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0029', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0029-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0029', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0029-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0029', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0029-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0029', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0029-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0030', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0030-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0030', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0030-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0030', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0030-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0030', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0030-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0030', '2025-11-18'::date, '2025-11-01'::date, 'pagado', 'yape', 0.0, 'Examen KUP simulado', 'E-0030-1125', 'EXAMEN_KUP', 'Examen de grado (KUP)', 55.0),
  ('CCTKD-0031', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0031-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0031', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0031-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0031', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'transferencia', 0.0, 'Mensualidad marzo', 'M-0031-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0031', '2026-04-02'::date, '2026-04-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad abril', 'M-0031-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0032', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0032-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0032', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0032-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0032', '2026-03-06'::date, '2026-03-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0032-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0032', '2026-04-02'::date, '2026-04-01'::date, 'pendiente', 'efectivo', 0.0, 'Mensualidad abril', 'M-0032-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0033', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0033-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0033', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0033-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0033', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0033-0326', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0033', '2026-04-02'::date, '2026-04-01'::date, 'vencido', 'efectivo', 0.0, 'Mensualidad abril', 'M-0033-0426', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0034', '2026-01-08'::date, '2026-01-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad enero', 'M-0034-0126', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0034', '2026-02-07'::date, '2026-02-01'::date, 'pagado', 'yape', 0.0, 'Mensualidad febrero', 'M-0034-0226', 'MENSUALIDAD', 'Mensualidad', NULL),
  ('CCTKD-0034', '2026-03-06'::date, '2026-03-01'::date, 'pagado', 'efectivo', 0.0, 'Mensualidad marzo', 'M-0034-0326', 'MENSUALIDAD', 'Mensualidad', NULL)
) AS v(codigo, fp, mc, est, met, descu, pobs, nrec, conc, ctext, mfij)
JOIN alumno a ON a.codigo_alumno = v.codigo
JOIN plan_mensualidad pm ON pm.id_plan = a.id_plan
WHERE NOT EXISTS (SELECT 1 FROM pago p WHERE p.numero_recibo = v.nrec);
