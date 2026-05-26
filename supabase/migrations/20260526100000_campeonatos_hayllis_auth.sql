-- Campeonatos Hayllis-style · Auth representante + aprobación ACCTKD

INSERT INTO rol (nombre, descripcion)
SELECT 'representante', 'Representante de academia externa — inscribe competidores'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'representante');

ALTER TABLE academia
  ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
  ADD COLUMN IF NOT EXISTS representante_nombre VARCHAR(120),
  ADD COLUMN IF NOT EXISTS representante_dni VARCHAR(20);

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS dni VARCHAR(20),
  ADD COLUMN IF NOT EXISTS id_academia INTEGER REFERENCES academia(id_academia) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usuario_dni_key ON usuario(dni) WHERE dni IS NOT NULL;

ALTER TABLE academia_campeonato
  ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(20) DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

ALTER TABLE academia_campeonato DROP CONSTRAINT IF EXISTS academia_campeonato_estado_lista_check;
ALTER TABLE academia_campeonato ADD CONSTRAINT academia_campeonato_estado_lista_check
  CHECK (estado_lista IN ('en_edicion', 'notificada', 'enviada'));

ALTER TABLE academia_campeonato DROP CONSTRAINT IF EXISTS academia_campeonato_estado_aprobacion_check;
ALTER TABLE academia_campeonato ADD CONSTRAINT academia_campeonato_estado_aprobacion_check
  CHECK (estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada'));

ALTER TABLE academia_campeonato ALTER COLUMN token DROP NOT NULL;

-- Academias seed existentes → aprobadas
UPDATE academia_campeonato SET estado_aprobacion = 'aprobada' WHERE estado_aprobacion = 'pendiente';
