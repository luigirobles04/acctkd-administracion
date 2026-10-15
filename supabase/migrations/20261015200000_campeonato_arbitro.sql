CREATE TABLE IF NOT EXISTS public.campeonato_arbitro (
  id_arbitro SERIAL PRIMARY KEY,
  id_campeonato INTEGER NOT NULL REFERENCES public.campeonato (id_campeonato) ON DELETE CASCADE,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL DEFAULT '',
  documento VARCHAR(24),
  telefono VARCHAR(24),
  email VARCHAR(160),
  funcion VARCHAR(80) NOT NULL DEFAULT 'Árbitro',
  pais VARCHAR(60) DEFAULT 'Perú',
  foto_path TEXT,
  codigo VARCHAR(24),
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campeonato_arbitro_campeonato_idx
  ON public.campeonato_arbitro (id_campeonato);

CREATE INDEX IF NOT EXISTS campeonato_arbitro_activo_idx
  ON public.campeonato_arbitro (id_campeonato, activo);
