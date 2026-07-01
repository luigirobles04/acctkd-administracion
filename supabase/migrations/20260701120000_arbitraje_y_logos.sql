-- Árbitro/operario de mesa (puntuación poomsae en vivo) + logo de academia.
-- Ejecutar una sola vez en el SQL Editor de Supabase del proyecto del ERP.

-- Puntaje/estado de calificación poomsae por línea de inscripción.
ALTER TABLE linea_inscripcion
  ADD COLUMN IF NOT EXISTS poomsae_puntaje NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS poomsae_estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (poomsae_estado IN ('pendiente', 'calificado'));

COMMENT ON COLUMN linea_inscripcion.poomsae_puntaje IS 'Puntaje otorgado por el árbitro/operario de mesa (0-10, 3 decimales).';
COMMENT ON COLUMN linea_inscripcion.poomsae_estado IS 'pendiente = aún no calificado; calificado = ya tiene puntaje registrado.';

CREATE INDEX IF NOT EXISTS idx_linea_poomsae_estado ON linea_inscripcion (id_categoria, poomsae_estado);

-- Logo de la academia — se usa en credenciales, buscadores y exportaciones.
ALTER TABLE academia
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN academia.logo_url IS 'URL pública del logo de la academia (Supabase Storage).';
