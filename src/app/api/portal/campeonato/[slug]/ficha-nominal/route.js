import { NextResponse } from 'next/server'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { buildExportFichaNominal } from '@/lib/campeonato/export-ficha-nominal'
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
      return NextResponse.json({ error: 'Tu academia no tiene acceso a la ficha nominal en el portal' }, { status: 403 })
    }

    const data = await buildExportFichaNominal(sb, ac.id_campeonato)
    const academia = (data.academias || []).find((a) => a.id === ac.id)
    if (!academia) {
      return NextResponse.json({
        campeonato: data.campeonato,
        academias: [],
        totales: { academias: 0, competidores: 0, oficiales: 0, lineas: 0 },
        anioCampeonato: data.anioCampeonato,
      })
    }

    return NextResponse.json({
      campeonato: data.campeonato,
      academias: [academia],
      totales: {
        academias: 1,
        competidores: academia.total_competidores,
        oficiales: academia.total_oficiales,
        lineas: academia.total,
      },
      anioCampeonato: data.anioCampeonato,
    })
  } catch (e) {
    const msg = supabaseErrorMessage(e, mensajeErrorApi(e))
    return NextResponse.json({ error: msg }, { status: httpStatusParaErrorApi(e, msg) })
  }
}
