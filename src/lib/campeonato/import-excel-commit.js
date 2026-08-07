import { randomUUID } from 'crypto'
import { MODALIDADES, MAX_OFICIALES } from '@/lib/campeonato/constants'
import {
  puedeInscribir,
  recalcularMontosAcademia,
  tipoTarifaActual,
  precioModalidad,
  siguienteDorsalGlobal,
} from '@/lib/campeonato/inscripcion-server'
import { formatearDorsal } from '@/lib/campeonato/prefix'
import { normTxt } from '@/lib/campeonato/import-excel-categorias'
import { asegurarTarifasCampeonato } from '@/lib/campeonato/categorias-wt'

const CHUNK_DEFAULT = 80
const CHUNK_MAX = 120

async function fetchPerfilesAcademia(sb, idAcademia) {
  const pageSize = 1000
  const all = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from('competidor_perfil')
      .select('id_perfil, documento_tipo, documento_numero')
      .eq('id_academia', idAcademia)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
  }
  return all
}

/** Upsert de perfiles en lote (1 lectura + inserts/updates por chunks) */
async function upsertPerfilesImport(sb, ac, perfiles) {
  const existentes = await fetchPerfilesAcademia(sb, ac.id_academia)
  const byDoc = new Map(
    existentes.map((e) => [`${e.documento_tipo}:${e.documento_numero}`, e]),
  )
  const keyToId = new Map()
  const now = new Date().toISOString()
  const toInsert = []
  const updates = []

  for (const perfil of perfiles) {
    const docKey = `${perfil.documento_tipo}:${perfil.documento_numero}`
    const payload = {
      id_academia: ac.id_academia,
      documento_tipo: perfil.documento_tipo,
      documento_numero: perfil.documento_numero,
      nombres: perfil.nombres,
      apellidos: perfil.apellidos,
      sexo: perfil.sexo || null,
      fecha_nacimiento: perfil.fecha_nacimiento || null,
      grado: perfil.grado || null,
      updated_at: now,
    }
    const ex = byDoc.get(docKey)
    if (ex) {
      updates.push({ id_perfil: ex.id_perfil, payload, key: perfil.key })
    } else {
      toInsert.push({ payload, key: perfil.key, docKey })
    }
  }

  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50)
    const { data, error } = await sb
      .from('competidor_perfil')
      .insert(batch.map((b) => b.payload))
      .select('id_perfil, documento_tipo, documento_numero')
    if (error) throw error
    for (const row of data || []) {
      const dk = `${row.documento_tipo}:${row.documento_numero}`
      const src = batch.find((b) => b.docKey === dk)
      if (src) keyToId.set(src.key, row.id_perfil)
      byDoc.set(dk, row)
    }
  }

  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10)
    await Promise.all(
      batch.map(async (u) => {
        const { error } = await sb
          .from('competidor_perfil')
          .update(u.payload)
          .eq('id_perfil', u.id_perfil)
        if (error) throw error
        keyToId.set(u.key, u.id_perfil)
      }),
    )
  }

  return keyToId
}

async function loadPreciosCache(sb, idCampeonato, tipoTarifa, modalidades) {
  const cache = new Map()
  const unicas = [...new Set(modalidades.filter(Boolean))]
  await Promise.all(
    unicas.map(async (mod) => {
      if (mod === 'oficial') {
        cache.set(mod, 0)
        return
      }
      cache.set(mod, await precioModalidad(sb, idCampeonato, mod, tipoTarifa))
    }),
  )
  return cache
}

async function insertarLineaImportRapido(sb, ac, body, { precios, oficialesCount }) {
  const { modalidad, idPerfiles, idCategoria, pesoDeclarado, tipoOficial } = body

  if (modalidad === 'oficial') {
    if ((oficialesCount.value || 0) >= MAX_OFICIALES) {
      throw new Error(`Máximo ${MAX_OFICIALES} oficiales`)
    }
  }

  const precio = modalidad === 'oficial' ? 0 : Number(precios.get(modalidad) ?? 0)
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
      tipo_tarifa: tipoTarifaActual(ac.campeonato),
      peso_declarado: pesoDeclarado || null,
      estado: modalidad === 'oficial' || precio === 0 ? 'pagado' : 'pendiente_pago',
    })
    .select('id_linea, estado')
    .single()
  if (errL) throw errL

  if (idPerfiles?.length) {
    const { error: errM } = await sb.from('linea_inscripcion_miembro').insert(
      idPerfiles.map((id_perfil) => ({ id_linea: linea.id_linea, id_perfil })),
    )
    if (errM) throw errM
  }

  if (modalidad === 'oficial') oficialesCount.value = (oficialesCount.value || 0) + 1
  return linea
}

/** Asigna dorsales a líneas recién creadas sin reconsultar el máximo cada vez */
async function asignarDorsalesALineas(sb, ac, idLineas) {
  if (!idLineas?.length) return 0

  const { data: academia } = await sb
    .from('academia')
    .select('codigo_prefijo')
    .eq('id_academia', ac.id_academia)
    .maybeSingle()

  const prefijo = academia?.codigo_prefijo || 'AC'
  let numero = await siguienteDorsalGlobal(sb, ac.id_campeonato)
  const now = new Date().toISOString()

  for (const id_linea of idLineas) {
    const display = formatearDorsal(prefijo, numero)
    const { error } = await sb
      .from('linea_inscripcion')
      .update({
        estado: 'aprobado',
        dorsal_prefijo: prefijo,
        dorsal_numero: numero,
        dorsal_display: display,
        updated_at: now,
      })
      .eq('id_linea', id_linea)
    if (error) throw error
    numero += 1
  }
  return idLineas.length
}

/**
 * Confirma importación Excel en BD.
 * Soporta lotes: { offset, limit } para no saturar el timeout de Vercel.
 */
export async function commitFestcupImport(sb, ac, parsed, opts = {}) {
  const check = puedeInscribir(ac.campeonato)
  if (!check.ok) throw new Error(check.reason)
  if (!ac.aceptacion_bases_at) throw new Error('Debes aceptar las bases primero')

  const offset = Math.max(0, Number(opts.offset) || 0)
  const limit = Math.min(CHUNK_MAX, Math.max(1, Number(opts.limit) || CHUNK_DEFAULT))

  const validas = parsed.lineas.filter((l) => !l.errores?.length)
  if (!validas.length) throw new Error('No hay líneas válidas para importar')

  const slice = validas.slice(offset, offset + limit)
  if (!slice.length) {
    return {
      creadas: 0,
      fallidas: [],
      omitidas: [],
      dorsales: 0,
      offset,
      nextOffset: offset,
      totalValidas: validas.length,
      remaining: 0,
      done: true,
    }
  }

  await asegurarTarifasCampeonato(sb, ac.id_campeonato)

  const perfilesNecesarios = (() => {
    const keys = new Set()
    for (const l of slice) for (const k of l.perfilKeys || []) keys.add(k)
    return parsed.perfiles.filter((p) => keys.has(p.key))
  })()

  const keyToId = await upsertPerfilesImport(sb, ac, perfilesNecesarios)

  const lineasExistentes = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('linea_inscripcion')
      .select(`
        id_linea, modalidad, id_categoria, tipo_oficial, estado,
        miembros:linea_inscripcion_miembro(id_perfil)
      `)
      .eq('id_academia_campeonato', ac.id)
      .neq('estado', 'anulado')
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    lineasExistentes.push(...data)
    if (data.length < 1000) break
  }
  const oficialesCount = {
    value: lineasExistentes.filter((l) => l.modalidad === 'oficial').length,
  }

  const tipoTarifa = tipoTarifaActual(ac.campeonato)
  const precios = await loadPreciosCache(
    sb,
    ac.id_campeonato,
    tipoTarifa,
    slice.map((l) => l.tipo),
  )

  const creadas = []
  const fallidas = []
  const omitidas = []

  for (const l of slice) {
    if (lineaYaExiste(lineasExistentes, l, keyToId)) {
      omitidas.push(l.label)
      continue
    }

    try {
      const idPerfiles = l.perfilKeys.map((k) => keyToId.get(k)).filter(Boolean)
      if (!idPerfiles.length) throw new Error('Perfiles no resueltos')

      const linea = await insertarLineaImportRapido(
        sb,
        ac,
        {
          modalidad: l.tipo,
          idPerfiles,
          idCategoria: l.idCategoria,
          pesoDeclarado: l.pesoDeclarado,
          tipoOficial: l.tipoOficial,
        },
        { precios, oficialesCount },
      )
      creadas.push(linea)
      lineasExistentes.push({
        modalidad: l.tipo,
        id_categoria: l.idCategoria,
        tipo_oficial: l.tipoOficial || null,
        estado: linea.estado,
        miembros: idPerfiles.map((id_perfil) => ({ id_perfil })),
      })
    } catch (e) {
      fallidas.push({ label: l.label, error: e.message })
    }
  }

  const dorsales = creadas.length
    ? await asignarDorsalesALineas(
        sb,
        ac,
        creadas.map((c) => c.id_linea),
      )
    : 0

  const nextOffset = offset + slice.length
  const remaining = Math.max(0, validas.length - nextOffset)
  const done = remaining === 0

  await sb
    .from('academia_campeonato')
    .update({
      ultimo_cambio_at: new Date().toISOString(),
      ...(creadas.length ? { estado_lista: 'enviada', ultima_notificacion_at: new Date().toISOString() } : {}),
    })
    .eq('id', ac.id)

  if (done) {
    await recalcularMontosAcademia(sb, ac.id)
    await sb.from('bitacora_inscripcion').insert({
      id_academia_campeonato: ac.id,
      accion: 'import_excel',
      detalle: {
        perfiles: parsed.perfiles.length,
        lineas_ok_lote: creadas.length,
        lineas_fail: fallidas.length,
        lineas_omitidas: omitidas.length,
        dorsales_asignados: dorsales,
        total_validas: validas.length,
      },
      actor: 'portal',
    })
  }

  return {
    creadas: creadas.length,
    fallidas,
    omitidas,
    dorsales,
    offset,
    nextOffset,
    totalValidas: validas.length,
    remaining,
    done,
  }
}

/** Evita duplicar misma inscripción si reimportan */
export function lineaYaExiste(lineasExistentes, nueva, keyToIdPerfil) {
  const ids = nueva.perfilKeys
    .map((k) => keyToIdPerfil.get(k))
    .filter(Boolean)
    .sort()
    .join(',')
  if (!ids) return false

  return lineasExistentes.some((ex) => {
    if (ex.modalidad !== nueva.tipo || ex.estado === 'anulado') return false
    const miembros = (ex.miembros || []).map((m) => m.id_perfil).sort().join(',')
    if (miembros !== ids) return false

    if (nueva.tipo === 'festival') return true

    if (nueva.tipo === 'oficial') {
      return String(ex.tipo_oficial || '') === String(nueva.tipoOficial || '')
    }

    return String(ex.id_categoria ?? '') === String(nueva.idCategoria ?? '')
  })
}

export { normTxt, CHUNK_DEFAULT }
