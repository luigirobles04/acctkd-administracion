-- Seed FestCup ACCTKD — Prueba 2026

INSERT INTO campeonato (
  nombre, descripcion, slug, fecha_inicio, fecha_fin, lugar, ciudad, estado,
  fecha_inicio_regular, fecha_fin_regular, fecha_inicio_tardia,
  fecha_cierre_inscripcion, fecha_gracia_pago,
  cuenta_bancaria_info, publicado, bases_version,
  puntos_oro, puntos_plata, puntos_bronce
) VALUES (
  'FestCup ACCTKD — Prueba 2026',
  'Campeonato de prueba para validación del sistema de inscripciones ACCTKD.',
  'festcup-acctkd-prueba-2026',
  '2026-07-19', '2026-07-20',
  'Coliseo ACCTKD', 'Trujillo', 'inscripciones',
  '2026-05-18', '2026-06-17', '2026-06-18',
  '2026-06-24', '2026-07-01',
  E'Banco de la Nación\nCuenta: 00-000-000000\nCCI: 00000000000000000000\nTitular: ACCTKD',
  true, '1',
  120, 50, 20
) ON CONFLICT (slug) DO NOTHING;

-- Tarifas FDPTKD (usar id del campeonato recién insertado)
INSERT INTO campeonato_tarifa (id_campeonato, modalidad, precio_regular, precio_tardia)
SELECT c.id_campeonato, t.modalidad, t.precio_regular, t.precio_tardia
FROM campeonato c
CROSS JOIN (VALUES
  ('kyorugi_individual', 90, 120),
  ('poomsae_individual', 90, 120),
  ('poomsae_pareja_reconocida', 140, 160),
  ('poomsae_pareja_freestyle', 140, 160),
  ('poomsae_equipo', 150, 180)
) AS t(modalidad, precio_regular, precio_tardia)
WHERE c.slug = 'festcup-acctkd-prueba-2026'
ON CONFLICT (id_campeonato, modalidad) DO NOTHING;

-- Categorías kyorugi muestra (cadete masculino -19kg etc.)
INSERT INTO categoria_campeonato (id_campeonato, nombre, genero, edad_min, edad_max, peso_min, peso_max, modalidad, orden)
SELECT c.id_campeonato, cat.nombre, cat.genero, cat.edad_min, cat.edad_max, cat.peso_min, cat.peso_max, 'kyorugi', cat.ord
FROM campeonato c
CROSS JOIN (VALUES
  ('Cadete M -45kg', 'M', 12, 14, 0, 45, 1),
  ('Cadete M -51kg', 'M', 12, 14, 45.01, 51, 2),
  ('Cadete M -59kg', 'M', 12, 14, 51.01, 59, 3),
  ('Cadete F -47kg', 'F', 12, 14, 0, 47, 4),
  ('Cadete F -54kg', 'F', 12, 14, 47.01, 54, 5),
  ('Juvenil M -55kg', 'M', 15, 17, 0, 55, 6),
  ('Juvenil F -49kg', 'F', 15, 17, 0, 49, 7)
) AS cat(nombre, genero, edad_min, edad_max, peso_min, peso_max, ord)
WHERE c.slug = 'festcup-acctkd-prueba-2026';

-- Academias externas + plantel
INSERT INTO academia (nombre, telefono, codigo_prefijo) VALUES
  ('Guerreros Trujillo', '51987654321', 'GT'),
  ('Bicentenario Taekwondo', '51912345678', 'BT')
ON CONFLICT DO NOTHING;

-- ACCTKD sede (primera sede activa)
INSERT INTO academia (nombre, telefono, codigo_prefijo)
SELECT 'Christopher Cabrera TKD · ' || s.nombre, COALESCE(s.telefono, '51900000001'), 'CC'
FROM sede s WHERE s.activo = true ORDER BY s.id_sede LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO academia_campeonato (id_academia, id_campeonato, token, es_interna)
SELECT a.id_academia, c.id_campeonato, md5(a.nombre || c.id_campeonato::text || 'token1'), (a.codigo_prefijo = 'CC')
FROM academia a
CROSS JOIN campeonato c
WHERE c.slug = 'festcup-acctkd-prueba-2026'
  AND a.nombre IN ('Guerreros Trujillo', 'Bicentenario Taekwondo')
ON CONFLICT DO NOTHING;

-- Perfiles competidores prueba
INSERT INTO competidor_perfil (id_academia, documento_tipo, documento_numero, nombres, apellidos, sexo, fecha_nacimiento, grado)
SELECT a.id_academia, p.doc_tipo, p.doc_num, p.nom, p.ape, p.sexo, p.fnac::date, p.grado
FROM academia a
JOIN (VALUES
  ('Guerreros Trujillo', 'DNI', '71234567', 'Luciano', 'Ríos', 'M', '2012-03-15', '6º kup'),
  ('Guerreros Trujillo', 'DNI', '72345678', 'Valeria', 'Campos', 'F', '2013-07-22', '5º kup'),
  ('Guerreros Trujillo', 'DNI', '73456789', 'Diego', 'Moral', 'M', '2011-11-08', '4º kup'),
  ('Guerreros Trujillo', 'DNI', '74567890', 'Sofía', 'Paredes', 'F', '2012-01-30', '6º kup'),
  ('Guerreros Trujillo', 'DNI', '75678901', 'Andrés', 'Vega', 'M', '2010-05-12', '3º kup'),
  ('Bicentenario Taekwondo', 'DNI', '80123456', 'Renzo', 'Castillo', 'M', '2012-08-19', '5º kup'),
  ('Bicentenario Taekwondo', 'DNI', '81234567', 'Camila', 'Torres', 'F', '2013-02-04', '6º kup'),
  ('Bicentenario Taekwondo', 'DNI', '82345678', 'Fabrizio', 'Luna', 'M', '2011-12-25', '4º kup'),
  ('Bicentenario Taekwondo', 'DNI', '83456789', 'Alejandra', 'Ruiz', 'F', '2012-06-17', '5º kup'),
  ('Bicentenario Taekwondo', 'DNI', '84567890', 'Sebastián', 'Herrera', 'M', '2010-09-03', '2º kup')
) AS p(acad, doc_tipo, doc_num, nom, ape, sexo, fnac, grado) ON p.acad = a.nombre
ON CONFLICT DO NOTHING;
