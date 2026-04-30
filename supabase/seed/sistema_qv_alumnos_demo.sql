-- ACCTKD · Carga demo desde export sistema QV (ejemplo) — listado largo
-- Prefiere: sistema_qv_alumnos_compact.sql (incluye apoderado, ficha médica y pagos de demo; datos ficticios).
-- Ejecutar en Supabase SQL Editor DESPUÉS de 20260420_000002_seed_data.sql
-- O si los alumnos ya están: sistema_qv_demo_solo_enriquecer.sql
-- Revisa UNIQUE(dni) y codigo_alumno si ya tienes alumnos reales: borra demo o ajusta prefijo.
BEGIN;

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62447279',
  'Neyser Alejandro',
  'Chaupe Gonzales',
  '2010-08-18',
  'M',
  '933906519',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-02'::date,
  'CCTKD-DEMO-0001',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62656671',
  'Salvador Sait',
  'Lupuche Pingo',
  '2010-05-19',
  'M',
  '902078652',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-22'::date,
  'CCTKD-DEMO-0002',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '73557274',
  'Mariana Maribel',
  'Rodriguez Valerio',
  '2009-07-08',
  'F',
  '938425315',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-22'::date,
  'CCTKD-DEMO-0003',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '89653215',
  'Rayan Valentino',
  'Ticlayauri',
  '2017-02-21',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 4 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0004',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '81292767',
  'Nayara Antonela Fabiana',
  'Cajacuri Limay',
  '2015-08-23',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 5 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0005',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '63777751',
  'Judith Analia',
  'Zavaleta Benites',
  '2010-09-12',
  'F',
  '928793155',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 6 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-04'::date,
  'CCTKD-DEMO-0006',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '80993075',
  'Jamil Segundo',
  'Trujillo Avila',
  '2013-04-27',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 7 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0007',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  NULL,
  'Delitzy Rubí',
  'Rodríguez Gutierrez',
  '2014-08-23',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 8 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0008',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '61353542',
  'Jordy Jeampier',
  'Garcia Flores',
  '2008-05-18',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 9 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-22'::date,
  'CCTKD-DEMO-0009',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62821573',
  'Luana Sherlyn',
  'Moreno Burgos',
  '2011-06-26',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0010',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '86530652',
  'Amy Ximena',
  'Agurto Placencia',
  '2017-04-24',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0011',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '61724047',
  'Leonardo Martín',
  'Ramos Vásquez',
  '2009-12-27',
  'M',
  '965417693',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-26'::date,
  'CCTKD-DEMO-0012',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '91331831',
  'Dixson Fernando',
  'Tapullima Amasifuen',
  '2019-05-21',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 4 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0013',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '03525413',
  'Miguel Alberto',
  'Torres Benitez',
  '2008-07-12',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 5 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0014',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '78935348',
  'Oscar Alfonso',
  'Solórzano Castillo',
  '2014-07-14',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 6 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0015',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62936881',
  'Said Joaquín',
  'Ramos Vásquez',
  '2011-12-07',
  'M',
  '976772360',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 7 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-26'::date,
  'CCTKD-DEMO-0016',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '73913043',
  'Luis Antonio',
  'Ascate Martinez',
  '2008-04-01',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 8 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0017',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '60142099',
  'Diana Viviana',
  'Inchaustegui Garcia',
  '2008-12-24',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 9 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-25'::date,
  'CCTKD-DEMO-0018',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '60799706',
  'Q''orianka',
  'Silva Bonilla',
  '2006-08-05',
  'F',
  '980926330',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0019',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '78474268',
  'Angelo Nicolás',
  'Yauce Santisteban',
  '2014-02-28',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0020',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '72989884',
  'Lastenia Judith',
  'Chico Moreno',
  '2009-01-27',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0021',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '63020603',
  'Cristopher Steven',
  'Rodriguez Castillo',
  '2013-09-19',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 4 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0022',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '81292710',
  'Stephano Andre',
  'Tejeda Campos',
  '2014-07-27',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 5 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0023',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '81104601',
  'Jean Chrysler',
  'Requena Navez',
  '2013-01-02',
  'M',
  '903022681',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 6 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-04'::date,
  'CCTKD-DEMO-0024',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '90767746',
  'Khael Enrique',
  'Puclia Gomez',
  '2018-05-10',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 7 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-18'::date,
  'CCTKD-DEMO-0025',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '73409594',
  'Ruben Alexander',
  'Cueva Galarreta',
  '2009-06-05',
  'M',
  '987034626',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 8 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-03'::date,
  'CCTKD-DEMO-0026',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '92140990',
  'Samuel Benjamín',
  'Zúñiga Abad',
  '2020-07-27',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 9 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0027',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '74670674',
  'Andriu',
  'Alban Riojas',
  '2010-09-14',
  'M',
  '978407824',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-03'::date,
  'CCTKD-DEMO-0028',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62658314',
  'Snayder Andres',
  'Gonzales Layza',
  '2010-08-09',
  'M',
  '946782723',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-06'::date,
  'CCTKD-DEMO-0029',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '90376846',
  'Deybi Dashiro Valentino',
  'Rivera Guzman',
  '2014-11-20',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0030',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '78531651',
  'Anthony Joaquín',
  'Puclia Paz',
  '2014-04-11',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 4 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0031',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '79303433',
  'Kiara Kristell',
  'Cruz Pascual',
  '2015-09-20',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 5 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0032',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '63353850',
  'Edward Gianfranco',
  'Tejeda Campos',
  '2011-09-23',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 6 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0033',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '91219319',
  'Julián Nicolás',
  'Silva Zambrano',
  '2019-02-28',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 7 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0034',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62843530',
  'Alejandra Mishel',
  'Ortega Achahuanco',
  '2011-04-23',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 8 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-04-18'::date,
  'CCTKD-DEMO-0035',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62790824',
  'Bianca Adely',
  'Sosa de la Cruz',
  '2008-06-27',
  'F',
  '944783737',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 9 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-01-22'::date,
  'CCTKD-DEMO-0036',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '76706411',
  'Alan Enrique',
  'Cosavalente Villanueva',
  '2011-03-20',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-01-22'::date,
  'CCTKD-DEMO-0037',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '75965030',
  'Christina Lizbeth',
  'Roque Aranda',
  '2003-04-06',
  'F',
  '944925118',
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-16'::date,
  'CCTKD-DEMO-0038',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '79011058',
  'Traizy Guadalupe',
  'Mallqui Polo',
  '2009-04-01',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0039',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '79770756',
  'Carlos Francisco',
  'Aguilar Zegarra',
  '2016-07-22',
  'M',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 4 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-25'::date,
  'CCTKD-DEMO-0040',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '77105969',
  'Mia Christell',
  'Chico Moreno',
  '2011-05-06',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 5 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-23'::date,
  'CCTKD-DEMO-0041',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '62328225',
  'Nicoll Isabel',
  'Pascual Maza',
  '2010-10-21',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 6 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0042',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '91593586',
  'Alessia Maria',
  'Alvarez Correa Jímenes',
  '2019-11-15',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 1 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 7 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0043',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '67432256',
  'Jade Jharumy',
  'Rondo Sotelo',
  '2013-01-25',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 2 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 8 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0044',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
) VALUES (
  (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1),
  '81795535',
  'Sherlyn Sharis',
  'Urbina Alva',
  '2017-02-02',
  'F',
  NULL,
  (SELECT id_plan FROM (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) t WHERE t.rn = 3 LIMIT 1),
  (SELECT id_turno FROM (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t WHERE t.rn = 9 LIMIT 1),
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  '2026-03-24'::date,
  'CCTKD-DEMO-0045',
  NULL,
  'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.'
);

COMMIT;
