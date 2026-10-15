-- Usuario acotado a un solo campeonato (panel FestCup / organizador de evento)
ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS id_campeonato INTEGER REFERENCES public.campeonato (id_campeonato) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS usuario_id_campeonato_idx ON public.usuario (id_campeonato)
  WHERE id_campeonato IS NOT NULL;

COMMENT ON COLUMN public.usuario.id_campeonato IS 'Si está definido, el usuario solo administra este campeonato (panel FestCup).';
