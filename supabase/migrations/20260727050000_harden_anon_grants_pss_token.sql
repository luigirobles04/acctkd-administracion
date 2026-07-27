-- Seguridad: anon/authenticated no pueden modificar campeonato.pss_token ni truncar tablas.
-- Aplicada en FestCup el 2026-07-27 (vía MCP). Idempotente.

REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE UPDATE ON public.campeonato FROM anon, authenticated;

GRANT UPDATE (
  nombre, descripcion, fecha_inicio, fecha_fin, lugar, ciudad, estado, foto_url,
  tipo, disciplinas, monto_inscripcion, fecha_cierre_inscripcion, numero_inicial_dorsal,
  cuenta_bancaria, link_inscripcion_publico, template_competidor_url, template_coach_url,
  template_delegado_url, template_oficial_url, template_staff_url, dias_evento, slug,
  fecha_inicio_regular, fecha_fin_regular, fecha_inicio_tardia, fecha_gracia_pago,
  bases_pdf_url, bases_version, cuenta_bancaria_info, puntos_oro, puntos_plata, puntos_bronce,
  poomsae_modo_vs, whatsapp_staff_telefonos, whatsapp_plantillas, limite_academias_dia,
  publicado, credencial_layout, llaves_sin_pesaje
) ON public.campeonato TO anon, authenticated;
