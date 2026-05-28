import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  MAX_INTENTOS_PESAJE,
  evaluarPesoEnCategoria,
  sugerirCategoriaSuperior,
} from '@/lib/campeonato/pesaje'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const sb = getSupabaseAdmin()

    const [{ data: lineas, error: errL }, { data: categorias, error: errC }] = await Promise.all([
      sb
        .from('linea_inscripcion')
        .select(`
          *,
          categoria:categoria_campeonato(*),
          academia_campeonato(academia:academia(nombre)),
          miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos, sexo, fecha_nacimiento, grado))
        `)
        .eq('id_campeonato', idCampeonato)
        .eq('modalidad', 'kyorugi_individual')
        .eq('estado', 'aprobado')
        .order('dorsal_numero', { ascending: true }),
      sb.from('categoria_campeonato').select('*').eq('id_campeonato', idCampeonato).eq('modalidad', 'kyorugi'),
    ])
    if (errL) throw errL
    if (errC) throw errC

    return NextResponse.json({ lineas: lineas || [], categorias: categorias || [], maxIntentos: MAX_INTENTOS_PESAJE })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const idCampeonato = Number(id)
    if (!idCampeonato) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { idLinea, peso, recategorizar, forzar, reiniciar } = await request.json()
    const pesoNum = Number(peso)

    const sb = getSupabaseAdmin()

    if (reiniciar && idLinea) {
      const { data: updated, error: errR } = await sb
        .from('linea_inscripcion')
        .update({
          peso_oficial: null,
          pesaje_estado: 'pendiente',
          pesaje_intentos: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id_linea', idLinea)
        .eq('id_campeonato', idCampeonato)
        .select('*, categoria:categoria_campeonato(nombre)')
        .single()
      if (errR) throw errR
      return NextResponse.json({ linea: updated, mensaje: 'Pesaje reiniciado. Nuevas oportunidades disponibles.' })
    }

    if (!idLinea || !Number.isFinite(pesoNum) || pesoNum <= 0) {
      return NextResponse.json({ error: 'Línea y peso válido requeridos' }, { status: 400 })
    }

    const { data: linea, error: errL } = await sb
      .from('linea_inscripcion')
      .select(`
        *,
        categoria:categoria_campeonato(*),
        miembros:linea_inscripcion_miembro(perfil:competidor_perfil(*))
      `)
      .eq('id_linea', idLinea)
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi_individual')
      .single()
    if (errL || !linea) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
    if (linea.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se pesa kyorugi con dorsal aprobado' }, { status: 403 })
    }

    const intentosPrevios = Number(linea.pesaje_intentos || 0)
    if (!forzar && linea.pesaje_estado === 'ok') {
      return NextResponse.json({ error: 'Este competidor ya aprobó el pesaje. Usa "Corregir" para modificar.' }, { status: 403 })
    }
    if (!forzar && intentosPrevios >= MAX_INTENTOS_PESAJE && linea.pesaje_estado === 'descalificado') {
      return NextResponse.json({ error: 'Sin oportunidades. Usa "Corregir pesaje" para consolidación manual.' }, { status: 403 })
    }

    const categoria = linea.categoria
    const evaluacion = evaluarPesoEnCategoria(pesoNum, categoria)
    const nuevoIntento = forzar ? intentosPrevios : intentosPrevios + 1
    const patch = {
      peso_oficial: pesoNum,
      pesaje_intentos: forzar ? intentosPrevios : nuevoIntento,
      updated_at: new Date().toISOString(),
    }

    let mensaje = evaluacion.mensaje
    let categoriaSugerida = null

    if (forzar) {
      if (evaluacion.ok) {
        patch.pesaje_estado = 'ok'
        mensaje = `Consolidación manual: ${evaluacion.mensaje}`
      } else if (recategorizar) {
        const perfil = linea.miembros?.[0]?.perfil
        const { data: todasCats } = await sb
          .from('categoria_campeonato')
          .select('*')
          .eq('id_campeonato', idCampeonato)
          .eq('modalidad', 'kyorugi')
        categoriaSugerida = sugerirCategoriaSuperior(todasCats, categoria, perfil)
        if (categoriaSugerida) {
          patch.id_categoria = categoriaSugerida.id_categoria
          patch.pesaje_estado = 'subido'
          mensaje = `Consolidación: recategorizado a ${categoriaSugerida.nombre}.`
        } else {
          patch.pesaje_estado = 'ok'
          mensaje = `Consolidación manual (fuera de rango): ${evaluacion.mensaje}`
        }
      } else {
        patch.pesaje_estado = evaluacion.ok ? 'ok' : 'subido'
        mensaje = `Consolidación manual: ${evaluacion.mensaje}`
      }
    } else if (evaluacion.ok) {
      patch.pesaje_estado = 'ok'
    } else if (nuevoIntento < MAX_INTENTOS_PESAJE) {
      patch.pesaje_estado = 'reintento'
      mensaje = `${evaluacion.mensaje} · Oportunidad ${nuevoIntento}/${MAX_INTENTOS_PESAJE}. Queda 1 reintento.`
    } else {
      const perfil = linea.miembros?.[0]?.perfil
      const { data: todasCats } = await sb
        .from('categoria_campeonato')
        .select('*')
        .eq('id_campeonato', idCampeonato)
        .eq('modalidad', 'kyorugi')

      categoriaSugerida = sugerirCategoriaSuperior(todasCats, categoria, perfil)

      if (recategorizar && categoriaSugerida) {
        const reeval = evaluarPesoEnCategoria(pesoNum, categoriaSugerida)
        if (reeval.ok) {
          patch.id_categoria = categoriaSugerida.id_categoria
          patch.pesaje_estado = 'subido'
          mensaje = `Recategorizado a ${categoriaSugerida.nombre}. Peso ${pesoNum} kg aprobado.`
        } else {
          patch.pesaje_estado = 'descalificado'
          mensaje = `Agotadas ${MAX_INTENTOS_PESAJE} oportunidades. ${evaluacion.mensaje}`
        }
      } else {
        patch.pesaje_estado = 'descalificado'
        mensaje = `Agotadas ${MAX_INTENTOS_PESAJE} oportunidades. ${evaluacion.mensaje}`
        if (categoriaSugerida) {
          mensaje += ` Puede recategorizar a ${categoriaSugerida.nombre}.`
        }
      }
    }

    const { data: updated, error: errU } = await sb
      .from('linea_inscripcion')
      .update(patch)
      .eq('id_linea', idLinea)
      .select(`
        *,
        categoria:categoria_campeonato(nombre, peso_min, peso_max)
      `)
      .single()
    if (errU) throw errU

    await sb.from('bitacora_inscripcion').insert({
      id_academia_campeonato: linea.id_academia_campeonato,
      id_linea: idLinea,
      accion: 'pesaje_registrado',
      detalle: {
        peso: pesoNum,
        resultado: patch.pesaje_estado,
        intento: patch.pesaje_intentos,
        evaluacion: evaluacion.resultado,
        forzar: Boolean(forzar),
      },
      actor: 'admin',
    })

    return NextResponse.json({
      linea: updated,
      evaluacion,
      intento: nuevoIntento,
      maxIntentos: MAX_INTENTOS_PESAJE,
      mensaje,
      categoriaSugerida: categoriaSugerida ? { id: categoriaSugerida.id_categoria, nombre: categoriaSugerida.nombre } : null,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
