-- Canchas y colores de peto en combates kyorugi
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS cancha SMALLINT;
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS orden_pista INTEGER;
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS color1 VARCHAR(10);
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS color2 VARCHAR(10);

CREATE INDEX IF NOT EXISTS llave_kyorugi_cancha_idx ON llave_kyorugi(id_campeonato, cancha, orden_pista);
