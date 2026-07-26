-- Permite marcar participante poomsae en pista (llamados / PSS).
ALTER TABLE linea_inscripcion
  DROP CONSTRAINT IF EXISTS linea_inscripcion_poomsae_estado_check;

ALTER TABLE linea_inscripcion
  ADD CONSTRAINT linea_inscripcion_poomsae_estado_check
  CHECK (poomsae_estado IS NULL OR poomsae_estado IN ('pendiente', 'en_curso', 'calificado'));

COMMENT ON COLUMN linea_inscripcion.poomsae_estado IS
  'pendiente = aún no calificado; en_curso = llamado/en pista PSS; calificado = puntaje registrado.';
