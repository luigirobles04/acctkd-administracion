import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { buildExportLlaves } from '@/lib/campeonato/export-llaves'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const data = await buildExportLlaves(sb, idCampeonato)

    const { buildLlavesExcelBuffer } = await import('@/lib/campeonato/export-llaves-excel')
    const { slugArchivo } = await import('@/lib/campeonato/export-excel-html')

    const buffer = await buildLlavesExcelBuffer(data)
    const camp = data.campeonato?.nombre || 'Campeonato'
    const filename = `llaves-kyorugi-${slugArchivo(camp)}.xlsx`
    const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('[xlsx export]', e)
    return NextResponse.json({ error: e?.message || 'Error al exportar Excel' }, { status: 500 })
  }
}
