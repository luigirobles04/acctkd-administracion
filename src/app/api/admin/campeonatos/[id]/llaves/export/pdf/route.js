import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { buildExportLlaves } from '@/lib/campeonato/export-llaves'
import { buildBracketPdfBuffer } from '@/lib/campeonato/export-bracket-pdf'
import { slugArchivo } from '@/lib/campeonato/export-utils'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const idCategoria = searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null

    const sb = getSupabaseAdmin()
    const data = await buildExportLlaves(sb, idCampeonato)
    const buffer = buildBracketPdfBuffer(data, { idCategoria: idCategoria || undefined })

    const camp = data.campeonato?.nombre || 'Campeonato'
    const cat = idCategoria
      ? (data.categorias || []).find((c) => c.id_categoria === idCategoria)
      : null
    const base = cat
      ? `llave-${slugArchivo(cat.nombre)}`
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
