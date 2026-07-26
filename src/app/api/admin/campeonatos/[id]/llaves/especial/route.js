import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  generarLlaveCategoriaUnico,
  insertarCombateExhibicion,
  consolidarOrosUnicos,
} from '@/lib/campeonato/llaves-kyorugi'

async function resolverDorsal(sb, idCampeonato, dorsal) {
  const d = String(dorsal || '').trim()
  if (!d) throw new Error('Dorsal requerido')
  const { data, error } = await sb
    .from('linea_inscripcion')
    .select('id_linea')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .or(`dorsal_display.eq.${d},dorsal_numero.eq.${d}`)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`Dorsal ${d} no encontrado`)
  return data.id_linea
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const sb = getSupabaseAdmin()

    if (body.accion === 'oro_unico') {
      const idCategoria = Number(body.idCategoria)
      if (!idCategoria) return NextResponse.json({ error: 'idCategoria requerido' }, { status: 400 })
      const result = await generarLlaveCategoriaUnico(sb, idCampeonato, idCategoria)
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.accion === 'exhibicion') {
      let idLinea1 = body.idLinea1
      let idLinea2 = body.idLinea2
      if (body.dorsal1 && body.dorsal2) {
        idLinea1 = await resolverDorsal(sb, idCampeonato, body.dorsal1)
        idLinea2 = await resolverDorsal(sb, idCampeonato, body.dorsal2)
      }
      const result = await insertarCombateExhibicion(sb, idCampeonato, {
        idLinea1,
        idLinea2,
        cancha: body.cancha,
      })
      return NextResponse.json(result)
    }

    if (body.accion === 'consolidar') {
      const result = await consolidarOrosUnicos(sb, idCampeonato, {
        idsCategoriasOrigen: body.idsCategorias,
        idCategoriaDestino: body.idCategoriaDestino,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'accion inválida (oro_unico | exhibicion | consolidar)' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
