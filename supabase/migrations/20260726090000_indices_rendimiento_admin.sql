-- Índices para acelerar el panel admin de campeonatos con cientos/miles de inscripciones.
-- Todos usan IF NOT EXISTS: es seguro re-ejecutar.
--
-- CÓMO APLICAR EN PRODUCCIÓN (el MCP/CLI no tiene acceso directo a la BD):
--   1. Supabase Dashboard → SQL Editor
--   2. Pegar este archivo completo y ejecutar (Run)
--   3. Verificar con: select indexname from pg_indexes where schemaname='public' and indexname like 'idx_%';
-- No es destructivo: solo crea índices, no modifica datos ni esquema de columnas.

-- Listados admin: líneas activas de un campeonato (academias, pagos, detalle, pesaje)
create index if not exists idx_linea_insc_camp_activas
  on public.linea_inscripcion (id_campeonato)
  where estado <> 'anulado';

-- Líneas por academia dentro de un campeonato (lazy load al expandir)
create index if not exists idx_linea_insc_camp_academia
  on public.linea_inscripcion (id_campeonato, id_academia_campeonato);

-- Orden y búsqueda por dorsal (pesaje, credenciales, búsqueda global)
create index if not exists idx_linea_insc_camp_dorsal_num
  on public.linea_inscripcion (id_campeonato, dorsal_numero);

create index if not exists idx_linea_insc_camp_dorsal_disp
  on public.linea_inscripcion (id_campeonato, dorsal_display);

-- Academias de un campeonato
create index if not exists idx_academia_camp_campeonato
  on public.academia_campeonato (id_campeonato);

-- Pantallas de canchas / llamados / impresión de llaves
create index if not exists idx_llave_kyorugi_camp_cancha
  on public.llave_kyorugi (id_campeonato, cancha, orden_pista);

-- Joins de miembros/perfiles (embedded selects de PostgREST)
create index if not exists idx_linea_insc_miembro_linea
  on public.linea_inscripcion_miembro (id_linea);

create index if not exists idx_linea_insc_miembro_perfil
  on public.linea_inscripcion_miembro (id_perfil);

-- Suma de pagos por línea (pagos FIFO y resumen server-side)
create index if not exists idx_asignacion_pago_linea
  on public.asignacion_pago (id_linea);

-- Comprobantes por academia
create index if not exists idx_comprobante_pago_academia
  on public.comprobante_pago (id_academia_campeonato);
