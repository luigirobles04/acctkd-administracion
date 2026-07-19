ALTER TABLE campeonato
  ADD COLUMN IF NOT EXISTS llaves_sin_pesaje BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN campeonato.llaves_sin_pesaje IS 'Solo ops internas: generar llaves kyorugi sin exigir pesaje OK';
