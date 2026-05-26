-- Continuación alumnos 10-45 (si ya corriste el compacto completo, ignora o borra)
BEGIN;
INSERT INTO alumno (
  id_sede, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono,
  id_plan, id_turno, id_grado_actual,
  estado, activo, fecha_ingreso, codigo_alumno, id_apoderado, observaciones
)
SELECT
  s.id_sede,
  v.dni::VARCHAR(15),
  v.nombres, v.apellidos, v.fna::DATE, v.sexo, v.telefono,
  p.id_plan,
  t.id_turno,
  (SELECT id_grado FROM grado_marcial ORDER BY id_grado LIMIT 1),
  'activo',
  true,
  v.fing,
  v.codigo,
  NULL,
  v.obs
FROM (
  VALUES
  ('62821573', 'Luana Sherlyn', 'Moreno Burgos', '2011-06-26', 'F', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0010', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 1),
  ('86530652', 'Amy Ximena', 'Agurto Placencia', '2017-04-24', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0011', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 2),
  ('61724047', 'Leonardo Martín', 'Ramos Vásquez', '2009-12-27', 'M', '965417693', '2026-04-26'::date, 'CCTKD-DEMO-0012', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 3),
  ('91331831', 'Dixson Fernando', 'Tapullima Amasifuen', '2019-05-21', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0013', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 4),
  ('03525413', 'Miguel Alberto', 'Torres Benitez', '2008-07-12', 'M', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0014', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 5),
  ('78935348', 'Oscar Alfonso', 'Solórzano Castillo', '2014-07-14', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0015', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 6),
  ('62936881', 'Said Joaquín', 'Ramos Vásquez', '2011-12-07', 'M', '976772360', '2026-04-26'::date, 'CCTKD-DEMO-0016', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 7),
  ('73913043', 'Luis Antonio', 'Ascate Martinez', '2008-04-01', 'M', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0017', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 8),
  ('60142099', 'Diana Viviana', 'Inchaustegui Garcia', '2008-12-24', 'F', NULL, '2026-03-25'::date, 'CCTKD-DEMO-0018', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 9),
  ('60799706', 'Q''orianka', 'Silva Bonilla', '2006-08-05', 'F', '980926330', '2026-03-24'::date, 'CCTKD-DEMO-0019', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 1),
  ('78474268', 'Angelo Nicolás', 'Yauce Santisteban', '2014-02-28', 'M', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0020', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 2),
  ('72989884', 'Lastenia Judith', 'Chico Moreno', '2009-01-27', 'F', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0021', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 3),
  ('63020603', 'Cristopher Steven', 'Rodriguez Castillo', '2013-09-19', 'M', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0022', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 4),
  ('81292710', 'Stephano Andre', 'Tejeda Campos', '2014-07-27', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0023', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 5),
  ('81104601', 'Jean Chrysler', 'Requena Navez', '2013-01-02', 'M', '903022681', '2026-04-04'::date, 'CCTKD-DEMO-0024', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 6),
  ('90767746', 'Khael Enrique', 'Puclia Gomez', '2018-05-10', 'M', NULL, '2026-04-18'::date, 'CCTKD-DEMO-0025', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 7),
  ('73409594', 'Ruben Alexander', 'Cueva Galarreta', '2009-06-05', 'M', '987034626', '2026-04-03'::date, 'CCTKD-DEMO-0026', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 8),
  ('92140990', 'Samuel Benjamín', 'Zúñiga Abad', '2020-07-27', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0027', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 9),
  ('74670674', 'Andriu', 'Alban Riojas', '2010-09-14', 'M', '978407824', '2026-04-03'::date, 'CCTKD-DEMO-0028', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 1),
  ('62658314', 'Snayder Andres', 'Gonzales Layza', '2010-08-09', 'M', '946782723', '2026-04-06'::date, 'CCTKD-DEMO-0029', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 2),
  ('90376846', 'Deybi Dashiro Valentino', 'Rivera Guzman', '2014-11-20', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0030', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 3),
  ('78531651', 'Anthony Joaquín', 'Puclia Paz', '2014-04-11', 'M', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0031', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 4),
  ('79303433', 'Kiara Kristell', 'Cruz Pascual', '2015-09-20', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0032', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 5),
  ('63353850', 'Edward Gianfranco', 'Tejeda Campos', '2011-09-23', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0033', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 6),
  ('91219319', 'Julián Nicolás', 'Silva Zambrano', '2019-02-28', 'M', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0034', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 7),
  ('62843530', 'Alejandra Mishel', 'Ortega Achahuanco', '2011-04-23', 'F', NULL, '2026-04-18'::date, 'CCTKD-DEMO-0035', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 8),
  ('62790824', 'Bianca Adely', 'Sosa de la Cruz', '2008-06-27', 'F', '944783737', '2026-01-22'::date, 'CCTKD-DEMO-0036', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 9),
  ('76706411', 'Alan Enrique', 'Cosavalente Villanueva', '2011-03-20', 'M', NULL, '2026-01-22'::date, 'CCTKD-DEMO-0037', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 1),
  ('75965030', 'Christina Lizbeth', 'Roque Aranda', '2003-04-06', 'F', '944925118', '2026-03-16'::date, 'CCTKD-DEMO-0038', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 2),
  ('79011058', 'Traizy Guadalupe', 'Mallqui Polo', '2009-04-01', 'F', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0039', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 3),
  ('79770756', 'Carlos Francisco', 'Aguilar Zegarra', '2016-07-22', 'M', NULL, '2026-03-25'::date, 'CCTKD-DEMO-0040', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 4),
  ('77105969', 'Mia Christell', 'Chico Moreno', '2011-05-06', 'F', NULL, '2026-03-23'::date, 'CCTKD-DEMO-0041', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 5),
  ('62328225', 'Nicoll Isabel', 'Pascual Maza', '2010-10-21', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0042', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 6),
  ('91593586', 'Alessia Maria', 'Alvarez Correa Jímenes', '2019-11-15', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0043', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 1, 7),
  ('67432256', 'Jade Jharumy', 'Rondo Sotelo', '2013-01-25', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0044', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 2, 8),
  ('81795535', 'Sherlyn Sharis', 'Urbina Alva', '2017-02-02', 'F', NULL, '2026-03-24'::date, 'CCTKD-DEMO-0045', 'Importación demo: export sistema QV (ejemplo). id_apoderado por completar.', 3, 9)
) AS v(dni, nombres, apellidos, fna, sexo, telefono, fing, codigo, obs, prn, trn)
CROSS JOIN (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1) s
JOIN (SELECT id_plan, row_number() OVER (ORDER BY id_plan) AS rn FROM plan_mensualidad) p ON p.rn = v.prn
JOIN (SELECT id_turno, row_number() OVER (ORDER BY id_turno) AS rn FROM turno) t ON t.rn = v.trn
WHERE NOT EXISTS (SELECT 1 FROM alumno a WHERE a.codigo_alumno = v.codigo);
COMMIT;
