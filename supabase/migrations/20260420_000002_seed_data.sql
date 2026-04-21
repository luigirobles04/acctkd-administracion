-- =================================================================
-- ACCTKD · SEED DATA · 2026-04-20
-- Carga inicial: métodos de pago, conceptos, planes, turnos, grados,
-- sede inicial y roles base.
-- =================================================================

-- ─── MÉTODOS DE PAGO ────────────────────────────────────────────
INSERT INTO metodo_pago (codigo, nombre, requiere_captura, orden) VALUES
  ('EFECTIVO',      'Efectivo',               false, 1),
  ('YAPE',          'Yape',                   true,  2),
  ('PLIN',          'Plin',                   true,  3),
  ('BCP',           'Transferencia BCP',      true,  4),
  ('INTERBANK',     'Transferencia Interbank',true,  5),
  ('TARJETA',       'Tarjeta',                false, 6)
ON CONFLICT (codigo) DO NOTHING;

-- ─── CONCEPTOS DE PAGO ──────────────────────────────────────────
INSERT INTO concepto_pago (codigo, nombre, tipo) VALUES
  ('MENSUALIDAD',    'Mensualidad',              'mensualidad'),
  ('MATRICULA',      'Matrícula',                'matricula'),
  ('EXAMEN_KUP',     'Examen de grado (KUP)',    'examen'),
  ('EXAMEN_DAN',     'Examen de grado (DAN)',    'examen'),
  ('CAMPEONATO',     'Inscripción a campeonato', 'campeonato'),
  ('UNIFORME',       'Uniforme / Dobok',         'producto'),
  ('PROTECCIONES',   'Protecciones',             'producto'),
  ('CLASE_SUELTA',   'Clase suelta',             'otro'),
  ('OTRO',           'Otro concepto',            'otro')
ON CONFLICT (codigo) DO NOTHING;

-- ─── PLANES DE MENSUALIDAD ──────────────────────────────────────
-- Precios placeholder — el admin los edita desde la UI
WITH s AS (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1)
INSERT INTO plan_mensualidad (id_sede, codigo, nombre, dias_semana, dias, monto, orden)
SELECT s.id_sede, v.codigo, v.nombre, v.dias_semana, v.dias, v.monto, v.orden
FROM s,
(VALUES
  ('PLAN_2D',  'Plan 2 días (Martes / Jueves)',        2, 'Ma-J',   100.00, 1),
  ('PLAN_3D',  'Plan 3 días (Lunes / Miércoles / Viernes)', 3, 'L-M-V', 130.00, 2),
  ('PLAN_5D',  'Plan 5 días (todos los días)',         5, 'L-M-Mi-J-V', 180.00, 3)
) AS v(codigo, nombre, dias_semana, dias, monto, orden)
ON CONFLICT (codigo) DO NOTHING;

-- ─── TURNOS ─────────────────────────────────────────────────────
-- Días: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 7=Dom
WITH s AS (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1)
INSERT INTO turno (id_sede, nombre, hora_inicio, hora_fin, dias_semana, dias_array, descripcion, activo)
SELECT s.id_sede, v.nombre, v.hora_inicio::time, v.hora_fin::time, v.dias_semana, v.dias_array, v.descripcion, true
FROM s,
(VALUES
  ('L-M-V 4:00 - 5:00 PM',  '16:00', '17:00', 'L-M-V',  ARRAY[1,3,5], 'Lunes, Miércoles y Viernes de 4 a 5 pm'),
  ('L-M-V 5:00 - 6:00 PM',  '17:00', '18:00', 'L-M-V',  ARRAY[1,3,5], 'Lunes, Miércoles y Viernes de 5 a 6 pm'),
  ('L-M-V 6:00 - 7:00 PM',  '18:00', '19:00', 'L-M-V',  ARRAY[1,3,5], 'Lunes, Miércoles y Viernes de 6 a 7 pm'),
  ('L-M-V 7:00 - 8:00 PM',  '19:00', '20:00', 'L-M-V',  ARRAY[1,3,5], 'Lunes, Miércoles y Viernes de 7 a 8 pm'),
  ('L-M-V 8:00 - 9:00 PM',  '20:00', '21:00', 'L-M-V',  ARRAY[1,3,5], 'Lunes, Miércoles y Viernes de 8 a 9 pm'),
  ('Ma-J 4:00 - 5:00 PM',   '16:00', '17:00', 'Ma-J',   ARRAY[2,4],   'Martes y Jueves de 4 a 5 pm'),
  ('Ma-J 5:00 - 6:00 PM',   '17:00', '18:00', 'Ma-J',   ARRAY[2,4],   'Martes y Jueves de 5 a 6 pm'),
  ('Ma-J 6:00 - 7:00 PM',   '18:00', '19:00', 'Ma-J',   ARRAY[2,4],   'Martes y Jueves de 6 a 7 pm'),
  ('Ma-J 7:00 - 8:00 PM',   '19:00', '20:00', 'Ma-J',   ARRAY[2,4],   'Martes y Jueves de 7 a 8 pm')
) AS v(nombre, hora_inicio, hora_fin, dias_semana, dias_array, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM turno t WHERE t.nombre = v.nombre AND t.id_sede = s.id_sede
);

-- ─── SEDE: actualización de datos ───────────────────────────────
UPDATE sede SET
  nombre = COALESCE(NULLIF(nombre,''), 'CCTKD Trujillo — El Recreo'),
  direccion = COALESCE(NULLIF(direccion,''), 'Calle Puerto Rico 302, Urb. El Recreo'),
  distrito = COALESCE(NULLIF(distrito,''), 'Trujillo'),
  telefono = COALESCE(NULLIF(telefono,''), '948849232')
WHERE id_sede = (SELECT id_sede FROM sede ORDER BY id_sede LIMIT 1);
