-- Llaves kyorugi F2 (modelo linea_inscripcion)
CREATE TABLE IF NOT EXISTS llave_kyorugi (
  id_llave SERIAL PRIMARY KEY,
  id_campeonato INTEGER NOT NULL REFERENCES campeonato(id_campeonato) ON DELETE CASCADE,
  id_categoria INTEGER NOT NULL REFERENCES categoria_campeonato(id_categoria) ON DELETE CASCADE,
  ronda INTEGER NOT NULL,
  match_numero INTEGER NOT NULL,
  id_linea1 INTEGER REFERENCES linea_inscripcion(id_linea) ON DELETE SET NULL,
  id_linea2 INTEGER REFERENCES linea_inscripcion(id_linea) ON DELETE SET NULL,
  ganador_id_linea INTEGER REFERENCES linea_inscripcion(id_linea) ON DELETE SET NULL,
  es_bye BOOLEAN DEFAULT false,
  puntaje1 INTEGER DEFAULT 0,
  puntaje2 INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente',
  siguiente_llave INTEGER REFERENCES llave_kyorugi(id_llave) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS llave_kyorugi_categoria_idx ON llave_kyorugi(id_categoria);
CREATE INDEX IF NOT EXISTS llave_kyorugi_campeonato_idx ON llave_kyorugi(id_campeonato);

ALTER TABLE llave_kyorugi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total anon" ON llave_kyorugi;
CREATE POLICY "Acceso total anon" ON llave_kyorugi FOR ALL TO anon USING (true) WITH CHECK (true);
