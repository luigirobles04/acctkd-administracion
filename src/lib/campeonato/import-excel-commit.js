import { randomUUID } from 'crypto'
import { MODALIDADES, MAX_OFICIALES } from '@/lib/campeonato/constants'
import { validarLineaInscripcion } from '@/lib/campeonato/validar-linea-inscripcion'
import {
  puedeInscribir,
  recalcularMontosAcademia,
  tipoTarifaActual,
  precioModalidad,
} from '@/lib/campeonato/inscripcion-server'
import { normTxt } from '@/lib/campeonato/import-excel-categorias'

async function upsertPerfilImport(sb, ac, perfil) {
  const { data: existente } = await sb
    .from('competidor_perfil')
    .select('*')
    .eq('id_academia', ac.id_academia)
    .eq('documento_tipo', perfil.documento_tipo)
    .eq('documento_numero', perfil.documento_numero)
    .maybeSingle()

  const payload = {
    id_academia: ac.id_academia,
    documento_tipo: perfil.documento_tipo,
    documento_numero: perfil.documento_numero,
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    sexo: perfil.sexo || null,
    fecha_nacimiento: perfil.fecha_nacimiento || null,
    grado: perfil.grado || null,
    updated_at: new Date().toISOString(),
  }

  if (existente) {
    const { data, error } = await sb
      .from('competidor_perfil')
      .update(payload)
      .eq('id_perfil', existente.id_perfil)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await sb.from('competidor_perfil').insert(payload).select().single()
  if (error) throw error
  return data
}

async function insertarLineaImport(sb, ac, body) {
  const { modalidad, idPerfiles, idCategoria, pesoDeclarado, tipoOficial } = body
  await validarLineaInscripcion(sb, ac, body)

  if (modalidad === 'oficial') {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('*', { count: 'exact', head: true })
      .eq('id_academia_campeonato', ac.id)
      .eq('modalidad', 'oficial')
      .neq('estado', 'anulado')
    if ((count || 0) >= MAX_OFICIALES) {
      throw new Error(`Máximo ${MAX_OFICIALES} oficiales`)
    }
  }

  const tipoTarifa = tipoTarifaActual(ac.campeonato)
  const precio =
    modalidad === 'oficial' ? 0 : await precioModalidad(sb, ac.id_campeonato, modalidad, tipoTarifa)

  const grupoUuidFinal = MODALIDADES[modalidad]?.miembros > 1 ? randomUUID() : null

  const { data: linea, error: errL } = await sb
    .from('linea_inscripcion')
    .insert({
      id_academia_campeonato: ac.id,
      id_campeonato: ac.id_campeonato,
      modalidad,
      tipo_oficial: tipoOficial || null,
      id_categoria: idCategoria || null,
      grupo_uuid: grupoUuidFinal,
      es_cobro: modalidad !== 'oficial',
      precio_aplicado: precio,
      tipo_tarifa: tipoTarifa,
      peso_declarado: pesoDeclarado || null,
      estado: modalidad === 'oficial' || precio === 0 ? 'pagado' : 'pendiente_pago',
    })
    .select()
    .single()
  if (errL) throw errL

  for (const idPerfil of idPerfiles || []) {
    await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: idPerfil })
  }

  return linea
}

/** Confirma importación Excel en BD */
export async function commitFestcupImport(sb, ac, parsed) {
  const check = puedeInscribir(ac.campeonato)
  if (!check.ok) throw new Error(check.reason)
  if (!ac.aceptacion_bases_at) throw new Error('Debes aceptar las bases primero')

  const validas = parsed.lineas.filter((l) => !l.errores?.length)
  if (!validas.length) throw new Error('No hay líneas válidas para importar')

  const keyToId = new Map()
  for (const p of parsed.perfiles) {
    const saved = await upsertPerfilImport(sb, ac, p)
    keyToId.set(p.key, saved.id_perfil)
  }

  const creadas = []
  const fallidas = []

  for (const l of validas) {
    try {
      const idPerfiles = l.perfilKeys.map((k) => keyToId.get(k)).filter(Boolean)
      if (!idPerfiles.length) throw new Error('Perfiles no resueltos')

      const linea = await insertarLineaImport(sb, ac, {
        modalidad: l.tipo,
        idPerfiles,
        idCategoria: l.idCategoria,
        pesoDeclarado: l.pesoDeclarado,
        tipoOficial: l.tipoOficial,
      })
      creadas.push(linea)
    } catch (e) {
      fallidas.push({ label: l.label, error: e.message })
    }
  }

  await sb.from('academia_campeonato').update({ ultimo_cambio_at: new Date().toISOString() }).eq('id', ac.id)
  await recalcularMontosAcademia(sb, ac.id)

  await sb.from('bitacora_inscripcion').insert({
    id_academia_campeonato: ac.id,
    accion: 'import_excel',
    detalle: {
      perfiles: parsed.perfiles.length,
      lineas_ok: creadas.length,
      lineas_fail: fallidas.length,
    },
    actor: 'portal',
  })

  return { creadas: creadas.length, fallidas }
}

/** Evita duplicar misma inscripción si reimportan */
export function lineaYaExiste(lineasExistentes, nueva, keyToIdPerfil) {
  const ids = nueva.perfilKeys.map((k) => keyToIdPerfil.get(k)).sort().join(',')
  return lineasExistentes.some((ex) => {
    if (ex.modalidad !== nueva.tipo || ex.estado === 'anulado') return false
    const miembros = (ex.miembros || []).map((m) => m.id_perfil).sort().join(',')
    return miembros === ids && String(ex.id_categoria) === String(nueva.idCategoria)
  })
}

export { normTxt }
