INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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

INSERT INTO alumno(
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