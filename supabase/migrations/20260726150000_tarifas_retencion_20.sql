-- Ajusta tarifas FestCup / eventos activos: −S/ 20 (retención organizador).
-- Solo actualiza filas con precios ≥ 20. No toca líneas ya inscritas (usar admin si hace falta).

UPDATE campeonato_tarifa t
SET
  precio_regular = GREATEST(0, precio_regular - 20),
  precio_tardia = GREATEST(0, precio_tardia - 20)
FROM campeonato c
WHERE t.id_campeonato = c.id_campeonato
  AND c.slug IN ('festcup-2026', 'festcup-acctkd-prueba-2026')
  AND t.precio_regular >= 20;
