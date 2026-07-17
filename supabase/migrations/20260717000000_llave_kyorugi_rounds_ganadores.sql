-- Ganadores por round para TV en vivo (1=competidor1/azul, 2=competidor2/rojo)
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS round1_ganador SMALLINT;
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS round2_ganador SMALLINT;
ALTER TABLE llave_kyorugi ADD COLUMN IF NOT EXISTS round3_ganador SMALLINT;
