-- FestCup (mfmseriyeullpdufuhns): aplicar en SQL Editor de Supabase.
-- Idempotente: seguro re-ejecutar.

ALTER TABLE linea_inscripcion
  DROP CONSTRAINT IF EXISTS linea_inscripcion_poomsae_estado_check;

ALTER TABLE linea_inscripcion
  ADD COLUMN IF NOT EXISTS poomsae_cancha SMALLINT;

ALTER TABLE linea_inscripcion
  ADD CONSTRAINT linea_inscripcion_poomsae_estado_check
  CHECK (
    poomsae_estado IS NULL
    OR poomsae_estado IN ('pendiente', 'en_curso', 'calificado', 'ausente')
  );

COMMENT ON COLUMN linea_inscripcion.poomsae_cancha IS
  'Área/cancha PSS (1-3) donde se está puntuando este atleta poomsae.';

COMMENT ON COLUMN linea_inscripcion.poomsae_estado IS
  'pendiente | en_curso (en pista PSS) | calificado | ausente (no se presentó).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('competidores-fotos', 'competidores-fotos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('inscripcion-vouchers', 'inscripcion-vouchers', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('backups-campeonato', 'backups-campeonato', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
