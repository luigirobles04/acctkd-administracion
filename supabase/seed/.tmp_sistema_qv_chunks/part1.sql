INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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