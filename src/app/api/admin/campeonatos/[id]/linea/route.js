import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  categoriasPoomsaeValidas,
  categoriasValidas,
  modalidadRequiereCategoriaPoomsae,
} from '@/lib/campeonato/validar-categoria'
import { asignarDorsalLinea } from '@/lib/campeonato/inscripcion-server'

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { idLinea, idCategoria, pesoDeclarado, accion } = body
    if (!idLinea) return NextResponse.json({ error: 'idLinea requerido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const { data: linea, error: errL } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        academia_campeonato(id, id_campeonato, campeonato:campeonato(fecha_inicio)),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(*))
      `)
      .eq('id_linea', idLinea)
      .eq('id_campeonato', idCampeonato)
      .single()
    if (errL || !linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
    if (linea.estado === 'anulado') return NextResponse.json({ error: 'Línea anulada' }, { status: 403 })

    if (accion === 'aprobar_dorsal') {
      const updated = await asignarDorsalLinea(sb, idLinea)
      return NextResponse.json({ linea: updated })
    }

    if (accion === 'marcar_pagada') {
      const { data: updated, error: errU } = await sb
        .from('linea_inscripcion')
        .update({ estado: 'pagado', updated_at: new Date().toISOString() })
        .eq('id_linea', idLinea)
        .select()
        .single()
      if (errU) throw errU
      return NextResponse.json({ linea: updated })
    }

    const patch = { updated_at: new Date().toISOString() }
    const perfil = linea.miembros?.[0]?.perfil
    const anio = new Date(linea.academia_campeonato?.campeonato?.fecha_inicio || Date.now()).getFullYear()

    if (idCategoria != null) {
      const catId = idCategoria ? Number(idCategoria) : null
      if (catId) {
        const { data: cat } = await sb
          .from('categoria_campeonato')
          .select('*')
          .eq('id_categoria', catId)
          .eq('id_campeonato', idCampeonato)
          .maybeSingle()
        if (!cat) return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })

        if (linea.modalidad === 'kyorugi_individual' && perfil) {
          const peso = pesoDeclarado != null ? pesoDeclarado : linea.peso_declarado
          const validas = categoriasValidas([cat], perfil, anio, peso)
          if (!validas.length) {
            return NextResponse.json({ error: 'La categoría kyorugi no calza con edad, sexo, peso o grado' }, { status: 400 })
          }
        } else if (modalidadRequiereCategoriaPoomsae(linea.modalidad) && perfil) {
          const validas = categoriasPoomsaeValidas([cat], perfil, anio)
          if (!validas.length) {
            return NextResponse.json({ error: 'La categoría poomsae no calza con edad, sexo o grado' }, { status: 400 })
          }
        }
      }
      patch.id_categoria = catId
    }

    if (pesoDeclarado != null) {
      patch.peso_declarado = pesoDeclarado ? Number(pesoDeclarado) : null
    }

    const { data: updated, error: errU } = await sb
      .from('linea_inscripcion')
      .update(patch)
      .eq('id_linea', idLinea)
      .select(`
        *,
        categoria:categoria_campeonato(nombre, peso_min, peso_max),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
      `)
      .single()
    if (errU) throw errU

    return NextResponse.json({ linea: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
