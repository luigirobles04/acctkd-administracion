INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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