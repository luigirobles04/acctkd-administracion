import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: lineas, error } = await sb
      .from('linea_inscripcion')
      .select(`
        id_linea, dorsal_display, dorsal_numero, modalidad,
        categoria:categoria_campeonato(nombre),
        academia_campeonato(academia(nombre)),
        miembros:linea_inscripcion_miembro(
          perfil:competidor_perfil(id_perfil, nombres, apellidos, foto_url, documento_numero)
        )
      `)
      .eq('id_campeonato', idCampeonato)
      .eq('estado', 'aprobado')
      .not('dorsal_numero', 'is', null)
      .order('dorsal_numero', { ascending: true })
    if (error) throw error

    const competidores = (lineas || []).map((l) => {
      const p = l.miembros?.[0]?.perfil
      return {
        id_linea: l.id_linea,
        dorsal: l.dorsal_display,
        nombres: p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '',
        foto_url: p?.foto_url || null,
        documento: p?.documento_numero || '',
        categoria: l.categoria?.nombre || '',
        academia: l.academia_campeonato?.academia?.nombre || '',
        modalidad: l.modalidad,
        qr_data: l.dorsal_display || String(l.id_linea),
      }
    })

    return NextResponse.json({ competidores })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
