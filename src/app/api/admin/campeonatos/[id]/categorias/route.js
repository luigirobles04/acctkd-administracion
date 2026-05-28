import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('categoria_campeonato')
      .select('id_categoria, nombre, modalidad, genero, edad_min, edad_max, peso_min, peso_max, orden')
      .eq('id_campeonato', idCampeonato)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    if (error) throw error

    return NextResponse.json({ categorias: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
