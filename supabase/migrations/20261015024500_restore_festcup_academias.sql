-- Restaura vínculo FestCup 2026 para academias reales (no borrar academia_campeonato en limpiezas).
INSERT INTO public.academia_campeonato (id_academia, id_campeonato, estado_aprobacion, estado_lista, token)
SELECT v.id_academia, 10, 'aprobada', 'en_edicion', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
FROM (VALUES (150), (151), (152)) AS v(id_academia)
WHERE NOT EXISTS (
  SELECT 1 FROM public.academia_campeonato ac
  WHERE ac.id_academia = v.id_academia AND ac.id_campeonato = 10
);
