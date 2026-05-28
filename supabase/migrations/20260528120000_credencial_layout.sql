ALTER TABLE campeonato
  ADD COLUMN IF NOT EXISTS credencial_layout JSONB DEFAULT NULL;

COMMENT ON COLUMN campeonato.credencial_layout IS 'Zonas % para foto y datos en credencial (foto: circle|rect, datos: rect)';
