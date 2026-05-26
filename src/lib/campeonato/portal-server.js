import { getSessionFromRequest } from '@/lib/auth-session'
import {
  resolverRepresentante,
  resolverAcademiaCampeonato,
} from '@/lib/campeonato/inscripcion-server'

export async function resolverPortalCampeonato(request, slug) {
  const session = getSessionFromRequest(request)
  if (!session) return { error: 'No autorizado', status: 401 }

  const sb = (await import('@/lib/supabase-server')).getSupabaseAdmin()
  const rep = await resolverRepresentante(sb, session.id_usuario)
  if (!rep) return { error: 'Acceso solo para representantes', status: 403 }

  const ac = await resolverAcademiaCampeonato(sb, { idAcademia: rep.id_academia, slug })
  if (!ac) return { error: 'No estás inscrito en este campeonato', status: 404 }

  return { sb, rep, ac, session }
}
