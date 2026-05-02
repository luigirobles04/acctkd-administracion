-- Dashboard filtra maestro por estado = 'activo'
ALTER TABLE maestro ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo';
UPDATE maestro SET estado = 'activo' WHERE estado IS NULL;
