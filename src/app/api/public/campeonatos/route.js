import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lista pública de campeonatos publicados para el landing. */
export async function GET() {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato')
      .select('id_campeonato, nombre, slug, ciudad, lugar, fecha_inicio, fecha_fin, estado, foto_url, descripcion, publicado')
      .order('fecha_inicio', { ascending: false })
      .limit(24)

    if (error) throw error

    const campeonatos = (data || [])
      .filter((c) => c.slug && (c.publicado === true || c.publicado == null))
      .map((c) => ({
        id_campeonato: c.id_campeonato,
        nombre: c.nombre,
        slug: c.slug,
        ciudad: c.ciudad,
        lugar: c.lugar,
        fecha_inicio: c.fecha_inicio,
        fecha_fin: c.fecha_fin,
        estado: c.estado,
        foto_url: c.foto_url,
        descripcion: c.descripcion,
        inscripciones_abiertas: c.estado === 'inscripciones',
      }))

    return NextResponse.json(
      { campeonatos },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (e) {
    return NextResponse.json({ campeonatos: [], error: e.message }, { status: 200 })
  }
}
