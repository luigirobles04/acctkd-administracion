-- Buckets de Storage para vouchers de inscripción y fotos de competidores (privados).
-- El acceso público directo falla; la app sirve archivos vía /api/vouchers/inscripcion y /api/fotos/competidor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('inscripcion-vouchers', 'inscripcion-vouchers', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('competidores-fotos', 'competidores-fotos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
