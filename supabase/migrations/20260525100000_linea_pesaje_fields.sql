-- Campos de pesaje oficial en líneas F1 (separados del peso declarado en inscripción)
ALTER TABLE linea_inscripcion
  ADD COLUMN IF NOT EXISTS peso_oficial NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS pesaje_estado VARCHAR(20) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS pesaje_intentos INTEGER DEFAULT 0;
