-- Walkover, exhibición y oro único en llaves kyorugi
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS motivo_resultado VARCHAR(20) DEFAULT 'normal';
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS es_exhibicion BOOLEAN DEFAULT false;

COMMENT ON COLUMN llave_kyorugi.motivo_resultado IS 'normal | walkover | unico';
COMMENT ON COLUMN llave_kyorugi.es_exhibicion IS 'Combates de exhibición no afectan podio';
