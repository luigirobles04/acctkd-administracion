-- FestCup 2026: tarifas coach pareja/equipo (−S/ 20) y plazo inscripción hasta 2026-11-06.

UPDATE campeonato
SET fecha_cierre_inscripcion = '2026-11-06'
WHERE slug = 'festcup-2026';

UPDATE campeonato_tarifa t
SET
  precio_regular = v.regular,
  precio_tardia = v.tardia
FROM campeonato c,
  (VALUES
    ('poomsae_pareja_reconocida', 100::numeric, 120::numeric),
    ('poomsae_pareja_freestyle', 100::numeric, 120::numeric),
    ('poomsae_equipo', 120::numeric, 140::numeric)
  ) AS v(modalidad, regular, tardia)
WHERE t.id_campeonato = c.id_campeonato
  AND c.slug = 'festcup-2026'
  AND t.modalidad = v.modalidad;

-- Líneas ya inscritas con precio lista (sin retención aplicada)
UPDATE linea_inscripcion l
SET
  precio_aplicado = CASE
    WHEN l.precio_aplicado >= 140 THEN 120
    WHEN l.precio_aplicado >= 120 THEN 100
    ELSE l.precio_aplicado
  END,
  updated_at = NOW()
FROM campeonato c
WHERE l.id_campeonato = c.id_campeonato
  AND c.slug = 'festcup-2026'
  AND l.estado <> 'anulado'
  AND l.modalidad IN ('poomsae_pareja_reconocida', 'poomsae_pareja_freestyle')
  AND l.precio_aplicado IN (120, 140);

UPDATE linea_inscripcion l
SET
  precio_aplicado = CASE
    WHEN l.precio_aplicado >= 160 THEN 140
    WHEN l.precio_aplicado >= 130 THEN 120
    ELSE l.precio_aplicado
  END,
  updated_at = NOW()
FROM campeonato c
WHERE l.id_campeonato = c.id_campeonato
  AND c.slug = 'festcup-2026'
  AND l.estado <> 'anulado'
  AND l.modalidad = 'poomsae_equipo'
  AND l.precio_aplicado IN (130, 140, 160);

-- Recalcular totales por academia (monto_asignado se mantiene; estado_pago coherente)
WITH totales AS (
  SELECT
    li.id_academia_campeonato,
    COALESCE(SUM(li.precio_aplicado), 0) AS monto_total
  FROM linea_inscripcion li
  JOIN campeonato c ON c.id_campeonato = li.id_campeonato
  WHERE c.slug = 'festcup-2026'
    AND li.estado <> 'anulado'
  GROUP BY li.id_academia_campeonato
)
UPDATE academia_campeonato ac
SET
  monto_total = t.monto_total,
  estado_pago = CASE
    WHEN t.monto_total <= 0 THEN 'pendiente'
    WHEN ac.monto_asignado >= t.monto_total THEN 'validado'
    WHEN ac.monto_asignado > 0 THEN 'parcial'
    ELSE 'pendiente'
  END,
  ultimo_cambio_at = NOW()
FROM totales t
WHERE ac.id = t.id_academia_campeonato
  AND ac.id_campeonato = (SELECT id_campeonato FROM campeonato WHERE slug = 'festcup-2026' LIMIT 1);
