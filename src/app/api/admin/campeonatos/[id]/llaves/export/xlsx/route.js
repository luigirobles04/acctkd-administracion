import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { buildExportLlaves } from '@/lib/campeonato/export-llaves'
import { buildLlavesExcelResponse } from '@/lib/campeonato/export-llaves-excel'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const data = await buildExportLlaves(sb, idCampeonato)
    return buildLlavesExcelResponse(data)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
