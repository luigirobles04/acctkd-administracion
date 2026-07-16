-- Token opcional por campeonato para dispositivos PSS en pista
ALTER TABLE campeonato ADD COLUMN IF NOT EXISTS pss_token VARCHAR(64);

COMMENT ON COLUMN campeonato.pss_token IS 'Token de acceso para laptops PSS FESTCUP (header X-PSS-Token). Si es NULL, solo aplica PSS_API_SECRET global.';
