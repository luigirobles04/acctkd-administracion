import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { registrarGanadorCombate } from '@/lib/campeonato/llaves-kyorugi'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { idLlave, ganadorIdLinea, puntaje1, puntaje2 } = await request.json()
    if (!idLlave || !ganadorIdLinea) {
      return NextResponse.json({ error: 'idLlave y ganadorIdLinea requeridos' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const idNum = Number(idLlave)

    const { data: combate } = await sb
      .from('llave_kyorugi')
      .select('id_llave, id_campeonato')
      .eq('id_llave', idNum)
      .eq('id_campeonato', idCampeonato)
      .maybeSingle()
    if (!combate) return NextResponse.json({ error: 'Combate no encontrado' }, { status: 404 })

    const result = await registrarGanadorCombate(sb, idNum, ganadorIdLinea, { puntaje1, puntaje2 })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
