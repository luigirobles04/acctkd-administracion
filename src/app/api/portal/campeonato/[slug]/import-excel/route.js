import { NextResponse } from 'next/server'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { puedeInscribir } from '@/lib/campeonato/inscripcion-server'
import {
  parseFestcupInscripcionExcel,
  buildImportPreviewResponse,
} from '@/lib/campeonato/import-inscripcion-excel'
import { commitFestcupImport } from '@/lib/campeonato/import-excel-commit'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { slug } = await params
    const ctx = await resolverPortalCampeonato(request, slug)
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { sb, ac } = ctx
    const check = puedeInscribir(ac.campeonato)
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 })
    if (check.soloPago) return NextResponse.json({ error: 'Inscripción cerrada. Solo pagos.' }, { status: 403 })

    const form = await request.formData()
    const file = form.get('file')
    const commit = form.get('commit') === 'true'

    if (!file) return NextResponse.json({ error: 'Archivo Excel requerido' }, { status: 400 })

    const { buffer, filename } = await readUploadFile(file)
    if (!filename.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: 'Solo archivos .xlsx' }, { status: 400 })
    }

    const { data: categorias } = await sb
      .from('categoria_campeonato')
      .select('*')
      .eq('id_campeonato', ac.id_campeonato)

    const anio = new Date(ac.campeonato.fecha_inicio).getFullYear()
    const parsed = parseFestcupInscripcionExcel(buffer, { categorias: categorias || [], anioCampeonato: anio })
    const preview = buildImportPreviewResponse(parsed)

    if (!commit) {
      return NextResponse.json({ preview: true, ...preview })
    }

    if (!ac.aceptacion_bases_at) {
      return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
    }

    const result = await commitFestcupImport(sb, ac, parsed)
    return NextResponse.json({
      ok: true,
      importado: result.creadas,
      fallidas: result.fallidas,
      omitidas: result.omitidas,
      dorsales: result.dorsales,
      resumen: preview.resumen,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
