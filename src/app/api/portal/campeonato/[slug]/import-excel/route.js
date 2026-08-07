import { NextResponse } from 'next/server'
import { readUploadFile } from '@/lib/campeonato/upload-file'
import { resolverPortalCampeonato } from '@/lib/campeonato/portal-server'
import { puedeInscribir } from '@/lib/campeonato/inscripcion-server'
import {
  parseFestcupInscripcionExcel,
  buildImportPreviewResponse,
} from '@/lib/campeonato/import-inscripcion-excel'
import { commitFestcupImport, CHUNK_DEFAULT } from '@/lib/campeonato/import-excel-commit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/** Excel grandes: commit por lotes; cada lote puede tardar ~30–60s */
export const maxDuration = 300

async function fetchCategoriasCampeonato(sb, idCampeonato) {
  const pageSize = 1000
  const all = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from('categoria_campeonato')
      .select(
        'id_categoria, nombre, genero, edad_min, edad_max, peso_min, peso_max, modalidad, division, grado_rango, orden',
      )
      .eq('id_campeonato', idCampeonato)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
  }
  return all
}

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
    const offset = Number(form.get('offset') || 0) || 0
    const limit = Number(form.get('limit') || CHUNK_DEFAULT) || CHUNK_DEFAULT

    if (!file) return NextResponse.json({ error: 'Archivo Excel requerido' }, { status: 400 })

    const { buffer, filename } = await readUploadFile(file)
    if (!filename.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: 'Solo archivos .xlsx' }, { status: 400 })
    }

    const categorias = await fetchCategoriasCampeonato(sb, ac.id_campeonato)
    const anio = new Date(ac.campeonato.fecha_inicio).getFullYear()
    const parsed = parseFestcupInscripcionExcel(buffer, { categorias, anioCampeonato: anio })
    const preview = buildImportPreviewResponse(parsed, { maxLineasUi: 120 })

    if (!commit) {
      const { perfiles, ...rest } = preview
      return NextResponse.json({
        preview: true,
        ...rest,
        perfilesCount: perfiles.length,
      })
    }

    if (!ac.aceptacion_bases_at) {
      return NextResponse.json({ error: 'Debes aceptar las bases primero' }, { status: 400 })
    }

    const result = await commitFestcupImport(sb, ac, parsed, { offset, limit })
    return NextResponse.json({
      ok: true,
      importado: result.creadas,
      fallidas: result.fallidas,
      omitidas: result.omitidas,
      dorsales: result.dorsales,
      offset: result.offset,
      nextOffset: result.nextOffset,
      totalValidas: result.totalValidas,
      remaining: result.remaining,
      done: result.done,
      resumen: preview.resumen,
    })
  } catch (e) {
    console.error('[import-excel]', e)
    return NextResponse.json({ error: e.message || 'Error al procesar Excel' }, { status: 500 })
  }
}
