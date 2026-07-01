-- Orden de salida (sorteo) para poomsae.
-- Guarda el orden sorteado por línea; si es NULL se usa el orden por dorsal.
ALTER TABLE linea_inscripcion
  ADD COLUMN IF NOT EXISTS orden_poomsae INTEGER;

COMMENT ON COLUMN linea_inscripcion.orden_poomsae IS
  'Orden de salida sorteado para poomsae dentro de su categoría (NULL = usar dorsal).';

CREATE INDEX IF NOT EXISTS idx_linea_orden_poomsae
  ON linea_inscripcion (id_categoria, orden_poomsae);
