import {
  categoriasPoomsaeValidas,
  categoriasValidas,
  modalidadRequiereCategoriaPoomsae,
} from '@/lib/campeonato/validar-categoria'
import { recalcularMontosAcademia } from '@/lib/campeonato/inscripcion-server'
import { clearPoomsaeLiveByLinea } from '@/lib/campeonato/poomsae-live'
import { esModalidadGrupo } from '@/lib/campeonato/validar-grupo'

export function portalPuedeGestionarInscripciones(check, ac) {
  if (ac?.estado_aprobacion === 'rechazada') return false
  return Boolean(check?.ok)
}

/** Anula una línea de la academia (portal): libera dorsal y recalcula montos. */
export async function anularLineaPortal(sb, ac, idLinea, actor = 'portal') {
  const { data: linea, error } = await sb
    .from('linea_inscripcion')
    .select('*')
    .eq('id_linea', idLinea)
    .eq('id_academia_campeonato', ac.id)
    .single()
  if (error || !linea) throw new Error('Línea no encontrada')
  if (linea.estado === 'anulado') throw new Error('La inscripción ya está anulada')

  await sb.from('asignacion_pago').delete().eq('id_linea', idLinea)
  if (linea.modalidad?.startsWith('poomsae_')) {
    try {
      await clearPoomsaeLiveByLinea(sb, linea.id_campeonato, idLinea)
    } catch {
      /* overlay opcional */
    }
  }

  const now = new Date().toISOString()
  const { error: errU } = await sb
    .from('linea_inscripcion')
    .update({
      estado: 'anulado',
      dorsal_prefijo: null,
      dorsal_numero: null,
      dorsal_display: null,
      orden_poomsae: null,
      poomsae_puntaje: null,
      poomsae_estado: 'pendiente',
      poomsae_cancha: null,
      updated_at: now,
    })
    .eq('id_linea', idLinea)
  if (errU) throw errU

  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: ac.id,
    id_linea: idLinea,
    accion: actor === 'portal' ? 'linea_anulada_portal' : 'linea_anulada_admin',
    detalle: { modalidad: linea.modalidad, dorsal: linea.dorsal_display },
    actor,
  })

  await sb.from('academia_campeonato').update({ ultimo_cambio_at: now }).eq('id', ac.id)
  await recalcularMontosAcademia(sb, ac.id)
  return { ok: true }
}

/** Actualiza categoría y/o peso de una línea activa (portal). */
export async function actualizarLineaPortal(sb, ac, idLinea, { idCategoria, pesoDeclarado }) {
  const { data: linea, error: errL } = await sb
    .from('linea_inscripcion')
    .select(`
      *,
      academia_campeonato(id, id_campeonato, campeonato:campeonato(fecha_inicio)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(*))
    `)
    .eq('id_linea', idLinea)
    .eq('id_academia_campeonato', ac.id)
    .single()
  if (errL || !linea) throw new Error('Línea no encontrada')
  if (linea.estado === 'anulado') throw new Error('La inscripción está anulada')
  if (esModalidadGrupo(linea.modalidad)) {
    throw new Error('Para pareja o equipo, anula la inscripción y vuelve a crear el grupo')
  }

  const perfil = linea.miembros?.[0]?.perfil
  const anio = new Date(linea.academia_campeonato?.campeonato?.fecha_inicio || Date.now()).getFullYear()
  const patch = { updated_at: new Date().toISOString() }

  if (linea.modalidad === 'festival') {
    if (pesoDeclarado == null) throw new Error('Indica el peso para festival')
    const p = Number(pesoDeclarado)
    if (!p || p <= 0) throw new Error('Peso inválido para festival')
    patch.peso_declarado = p
  } else if (linea.modalidad === 'kyorugi_individual') {
    const peso = pesoDeclarado != null ? pesoDeclarado : linea.peso_declarado
    if (idCategoria != null) {
      const catId = idCategoria ? Number(idCategoria) : null
      if (!catId) throw new Error('Elige una categoría kyorugi')
      const { data: cat } = await sb
        .from('categoria_campeonato')
        .select('*')
        .eq('id_categoria', catId)
        .eq('id_campeonato', ac.id_campeonato)
        .maybeSingle()
      if (!cat) throw new Error('Categoría inválida')
      if (!perfil) throw new Error('Falta datos del competidor')
      const validas = categoriasValidas([cat], perfil, anio, peso)
      if (!validas.length) {
        throw new Error('La categoría no calza con edad, sexo, peso o grado del competidor')
      }
      patch.id_categoria = catId
    }
    if (pesoDeclarado != null) patch.peso_declarado = peso ? Number(peso) : null
  } else if (modalidadRequiereCategoriaPoomsae(linea.modalidad)) {
    if (idCategoria == null) throw new Error('Elige una división poomsae')
    const catId = Number(idCategoria)
    const { data: cat } = await sb
      .from('categoria_campeonato')
      .select('*')
      .eq('id_categoria', catId)
      .eq('id_campeonato', ac.id_campeonato)
      .maybeSingle()
    if (!cat) throw new Error('Categoría inválida')
    if (!perfil) throw new Error('Falta datos del competidor')
    const validas = categoriasPoomsaeValidas([cat], perfil, anio)
    if (!validas.length) {
      throw new Error('La división poomsae no calza con edad, sexo o grado')
    }
    if (Number(linea.id_categoria) !== catId) {
      patch.id_categoria = catId
      patch.orden_poomsae = null
      patch.poomsae_puntaje = null
      patch.poomsae_estado = 'pendiente'
      patch.poomsae_cancha = null
    }
  } else if (linea.modalidad === 'oficial') {
    throw new Error('Los oficiales no tienen categoría editable aquí')
  } else {
    throw new Error('Modalidad no editable desde el portal')
  }

  const { data: updated, error: errU } = await sb
    .from('linea_inscripcion')
    .update(patch)
    .eq('id_linea', idLinea)
    .select()
    .single()
  if (errU) throw errU

  await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
  return updated
}

/** Anula todas las líneas activas de un perfil en la academia-campeonato. */
export async function anularLineasActivasPerfil(sb, ac, idPerfil) {
  const { data: miembros, error } = await sb
    .from('linea_inscripcion_miembro')
    .select('id_linea, linea_inscripcion!inner(estado, id_academia_campeonato)')
    .eq('id_perfil', idPerfil)
    .eq('linea_inscripcion.id_academia_campeonato', ac.id)
    .neq('linea_inscripcion.estado', 'anulado')
  if (error) throw error
  const ids = [...new Set((miembros || []).map((m) => m.id_linea))]
  for (const idLinea of ids) {
    await anularLineaPortal(sb, ac, idLinea, 'portal')
  }
  return ids.length
}
