-- Usuario de prueba · Christopher · rol admin
-- Contraseña: acctkd2026 (hash bcrypt bcryptjs, cost 10)
-- Ejecutar en Supabase SQL Editor si lo necesitas fuera del MCP.
INSERT INTO usuario (username, password_hash, id_rol, activo, email, nombre_completo)
VALUES (
  'chrisopher',
  '$2b$10$iKA.H2Bgjg88cl8hOesDJOc4xe5DbRXbxBV82D5HN1l322wGpu3P.',
  1,
  true,
  'christopher.cctkd@gmail.com',
  'Christopher'
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  id_rol = EXCLUDED.id_rol,
  activo = EXCLUDED.activo,
  email = EXCLUDED.email,
  nombre_completo = EXCLUDED.nombre_completo;
