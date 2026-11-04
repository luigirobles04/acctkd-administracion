import { NextResponse } from 'next/server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { buildCredencialesCampeonato } from '@/lib/campeonato/credenciales-data'
import { portalPuedeVerFichaYCredenciales } from '@/lib/campeonato/portal-documentos-academia'
import { httpStatusParaErrorApi, mensajeErrorApi } from '@/lib/supabase-fetch-retry'
import { supabaseErrorMessage } from '@/lib/supabase-errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    if (!portalPuedeVerFichaYCredenciales(slug, { ...ac, academia: ac.academia })) {
      return NextResponse.json({ error: 'Tu academia no tiene acceso a credenciales en el portal' }, { status: 403 })
    }

    const data = await buildCredencialesCampeonato(sb, ac.id_campeonato, { idAcademiaCampeonato: ac.id })
    return NextResponse.json(data)
  } catch (e) {
    const msg = supabaseErrorMessage(e, mensajeErrorApi(e))
    return NextResponse.json({ error: msg }, { status: httpStatusParaErrorApi(e, msg) })
  }
}
