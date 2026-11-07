import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { buildExportLlaves } from '@/lib/campeonato/export-llaves'
import { buildBracketPdfBuffer } from '@/lib/campeonato/export-bracket-pdf'
import { slugArchivo } from '@/lib/campeonato/export-utils'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Mismos defaults que `scripts/gen-pdf-festcup-areas-1-2-3-vertical.mjs`:
 * retrato + escala de texto (env `PDF_TEXT_SCALE`, típ. 1.22).
 * Retrato: layout compacto (2 comp. → 3/hoja, 3+ → 2/hoja) salvo `PDF_BRACKET_COMPACT=0`.
 * Override por query: `orientacion=landscape|portrait`, `escala=1.1`, `compacto=0|1`
 */
function opcionesPdfDesdeRequest(searchParams) {
  const orientRaw =
    searchParams.get('orientacion') ||
    searchParams.get('orientation') ||
    process.env.PDF_BRACKET_ORIENTATION ||
    'portrait'
  const orientation = String(orientRaw).toLowerCase() === 'landscape' ? 'landscape' : 'portrait'

  const escalaRaw = searchParams.get('escala') ?? searchParams.get('textScale') ?? process.env.PDF_TEXT_SCALE ?? '1.22'
  const n = Number(escalaRaw)
  const textScale = Number.isFinite(n) ? Math.min(1.45, Math.max(0.85, n)) : 1.22

  const compactRaw = searchParams.get('compacto') ?? searchParams.get('compactLayout')
  let compactLayout = null
  if (compactRaw != null && String(compactRaw).trim() !== '') {
    const v = String(compactRaw).toLowerCase()
    compactLayout = v === '0' || v === 'false' || v === 'no' ? false : true
  }

  return { orientation, textScale, compactLayout }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const idCategoria = searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null
    const cancha = searchParams.get('cancha') ? Number(searchParams.get('cancha')) : null
    const { orientation, textScale, compactLayout } = opcionesPdfDesdeRequest(searchParams)

    const sb = getSupabaseAdmin()
    const data = await buildExportLlaves(sb, idCampeonato)
    const buffer = await buildBracketPdfBuffer(data, sb, {
      idCategoria: idCategoria || undefined,
      cancha: cancha || undefined,
      orientation,
      textScale,
      ...(compactLayout !== null ? { compactLayout } : {}),
    })

    const camp = data.campeonato?.nombre || 'Campeonato'
    const cat = idCategoria
      ? (data.categorias || []).find((c) => c.id_categoria === idCategoria)
      : null
    const base = cat
      ? `llave-${slugArchivo(cat.nombre)}`
      : cancha
        ? `llaves-graficas-area-${cancha}-${slugArchivo(camp)}`
        : `llaves-graficas-${slugArchivo(camp)}`
    const filename = `${base}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (e) {
    console.error('[pdf export]', e)
    return NextResponse.json({ error: e?.message || 'Error al exportar PDF' }, { status: 500 })
  }
}
