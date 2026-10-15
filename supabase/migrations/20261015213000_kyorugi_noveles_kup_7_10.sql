-- FestCup: 10º–7º kup también pueden inscribirse en categorías Kyorugi Noveles
UPDATE public.categoria_campeonato
SET grado_rango = 'kup:3-10'
WHERE modalidad = 'kyorugi'
  AND grado_rango = 'kup:3-6'
  AND (
    nombre ILIKE '%· Noveles %'
    OR nombre ILIKE '% Noveles %'
    OR division ILIKE '%Noveles%'
  );
