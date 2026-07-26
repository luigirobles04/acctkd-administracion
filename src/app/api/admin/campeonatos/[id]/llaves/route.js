import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  generarLlaveCategoria,
  generarTodasLasLlaves,
  asignarCanchasCampeonato,
  campeonatoLlavesSinPesaje,
  conteosKyorugiLlave,
} from '@/lib/campeonato/llaves-kyorugi'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function claveOpsValida(clave) {
  const esperada = process.env.ACCTKD_OPS_KEY || process.env.CRON_SECRET || ''
  return Boolean(esperada && clave && clave === esperada)
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()
    const llavesSinPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)

    const { data: categorias, error: errC } = await sb
      .from('categoria_campeonato')
      .select('id_categoria, nombre, genero, division')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi')
      .order('orden', { ascending: true })
    if (errC) throw errC

    const { inscritosPorCat, aptosPorCat } = await conteosKyorugiLlave(sb, idCampeonato, llavesSinPesaje)

    const { data: llavesExistentes } = await sb
      .from('llave_kyorugi')
      .select('id_categoria')
      .eq('id_campeonato', idCampeonato)

    const conLlave = new Set((llavesExistentes || []).map((l) => l.id_categoria))

    const cats = (categorias || []).map((c) => {
      const inscritos = inscritosPorCat[c.id_categoria] || 0
      const aptos = aptosPorCat[c.id_categoria] || 0
      return {
        ...c,
        inscritos,
        aptos,
        puede_generar: aptos >= 2,
        tiene_llave: conLlave.has(c.id_categoria),
      }
    })

    // Dorsal/nombre del único apto (para consolidar oros en la UI)
    const soloIds = cats
      .filter((c) => (llavesSinPesaje ? c.inscritos === 1 : c.aptos === 1) && !c.tiene_llave)
      .map((c) => c.id_categoria)
    if (soloIds.length) {
      let qSolo = sb
        .from('linea_inscripcion')
        .select(`
          id_linea, id_categoria, dorsal_display,
          miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
        `)
        .eq('id_campeonato', idCampeonato)
        .eq('modalidad', 'kyorugi_individual')
        .eq('estado', 'aprobado')
        .not('dorsal_numero', 'is', null)
        .in('id_categoria', soloIds)
      if (!llavesSinPesaje) qSolo = qSolo.in('pesaje_estado', ['ok', 'subido'])
      const { data: lineasSolo } = await qSolo
      const porCat = {}
      for (const l of lineasSolo || []) {
        const p = l.miembros?.[0]?.perfil
        const nombre = p ? `${p.nombres || ''} ${p.apellidos || ''}`.trim() : ''
        porCat[l.id_categoria] = {
          id_linea: l.id_linea,
          dorsal: l.dorsal_display,
          nombre: nombre || '—',
        }
      }
      for (const c of cats) {
        if (porCat[c.id_categoria]) c.solo = porCat[c.id_categoria]
      }
    }

    return NextResponse.json({
      categorias: cats,
      llaves_sin_pesaje: llavesSinPesaje,
      requiere_pesaje: !llavesSinPesaje,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const sb = getSupabaseAdmin()

    if (body.reasignarCanchas) {
      const result = await asignarCanchasCampeonato(sb, idCampeonato)
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.todas || body.idsCategorias) {
      const ids = body.idsCategorias ?? null
      const result = await generarTodasLasLlaves(sb, idCampeonato, { idsCategorias: ids })
      return NextResponse.json({ ok: true, ...result })
    }

    const { idCategoria } = body
    if (!idCategoria) return NextResponse.json({ error: 'idCategoria requerido' }, { status: 400 })

    const result = await generarLlaveCategoria(sb, idCampeonato, Number(idCategoria))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** Config interna (clave ops): omitir pesaje en llaves */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    if (body.accion !== 'config_ops') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
    if (!claveOpsValida(body.clave)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (typeof body.llaves_sin_pesaje !== 'boolean') {
      return NextResponse.json({ error: 'llaves_sin_pesaje requerido' }, { status: 400 })
    }

    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('campeonato')
      .update({ llaves_sin_pesaje: body.llaves_sin_pesaje })
      .eq('id_campeonato', idCampeonato)
      .select('llaves_sin_pesaje')
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, llaves_sin_pesaje: Boolean(data?.llaves_sin_pesaje) })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
