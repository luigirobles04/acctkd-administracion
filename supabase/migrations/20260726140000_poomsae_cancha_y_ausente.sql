-- Área PSS (1-3) + estado ausente (deportista no vino) para llamados poomsae.
ALTER TABLE linea_inscripcion
  ADD COLUMN IF NOT EXISTS poomsae_cancha SMALLINT;

COMMENT ON COLUMN linea_inscripcion.poomsae_cancha IS
  'Área/cancha PSS (1-3) donde se está puntuando este atleta poomsae.';

ALTER TABLE linea_inscripcion
  DROP CONSTRAINT IF EXISTS linea_inscripcion_poomsae_estado_check;

ALTER TABLE linea_inscripcion
  ADD CONSTRAINT linea_inscripcion_poomsae_estado_check
  CHECK (
    poomsae_estado IS NULL
    OR poomsae_estado IN ('pendiente', 'en_curso', 'calificado', 'ausente')
  );

COMMENT ON COLUMN linea_inscripcion.poomsae_estado IS
  'pendiente | en_curso (en pista PSS) | calificado | ausente (no se presentó).';
