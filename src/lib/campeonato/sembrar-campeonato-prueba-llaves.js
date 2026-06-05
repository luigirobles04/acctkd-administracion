import { crearCampeonatoCompleto } from '@/lib/campeonato/crear-campeonato-server'
import { generarTodasLasLlaves } from '@/lib/campeonato/llaves-kyorugi'
import {
  asignarDorsalLinea,
  registrarPagoTotalAcademia,
  recalcularMontosAcademia,
} from '@/lib/campeonato/inscripcion-server'

export const SLUG_PRUEBA_LLAVES = 'prueba-llaves-cnu-2026'
export const NOMBRE_PRUEBA_LLAVES = 'Prueba Llaves CNU — FDPTKD 2026'

const ANIO = 2026

const NOMBRES_M = [
  'Diego', 'Carlos', 'Luis', 'Miguel', 'Jorge', 'Andrés', 'Ricardo', 'Fernando', 'Pablo', 'Sergio',
  'Roberto', 'Eduardo', 'Javier', 'Raúl', 'Óscar', 'Manuel', 'Héctor', 'Iván', 'Gustavo', 'Marco',
]
const NOMBRES_F = [
  'María', 'Ana', 'Lucía', 'Valentina', 'Camila', 'Daniela', 'Sofía', 'Andrea', 'Paola', 'Rosa',
  'Gabriela', 'Patricia', 'Claudia', 'Verónica', 'Natalia', 'Carolina', 'Diana', 'Elena', 'Laura', 'Silvia',
]
const APELLIDOS = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Vargas', 'Castillo', 'Mendoza', 'Rojas', 'Quispe', 'Huamán', 'Condori', 'Díaz', 'Silva', 'Morales',
  'Chávez', 'Ortiz', 'Ruiz', 'Herrera', 'Medina', 'Cruz', 'Reyes', 'Gutiérrez', 'Aguilar', 'Romero',
]

/** Academias con nombres creíbles para la simulación */
export const ACADEMIAS_PRUEBA = [
  { nombre: 'Dragones Rojos TKD Trujillo', prefijo: 'DR', ciudad: 'Trujillo' },
  { nombre: 'Titanes del Norte Chiclayo', prefijo: 'TN', ciudad: 'Chiclayo' },
  { nombre: 'Guerreros del Pacífico', prefijo: 'GP', ciudad: 'Piura' },
  { nombre: 'Lima Warriors Academy', prefijo: 'LW', ciudad: 'Lima' },
  { nombre: 'Samurai Kick Miraflores', prefijo: 'SK', ciudad: 'Lima' },
  { nombre: 'Phoenix Taekwondo Arequipa', prefijo: 'PH', ciudad: 'Arequipa' },
  { nombre: 'Cóndores Andinos Cusco', prefijo: 'CA', ciudad: 'Cusco' },
  { nombre: 'Leones Dorados Huancayo', prefijo: 'LD', ciudad: 'Huancayo' },
  { nombre: 'Black Belt Elite Perú', prefijo: 'BE', ciudad: 'Trujillo' },
  { nombre: 'Rising Stars TKD', prefijo: 'RS', ciudad: 'Lima' },
  { nombre: 'Thunder Team La Libertad', prefijo: 'TT', ciudad: 'Trujillo' },
  { nombre: 'Golden Kick Academy', prefijo: 'GK', ciudad: 'Chiclayo' },
  { nombre: 'Warrior Spirit Ica', prefijo: 'WS', ciudad: 'Ica' },
  { nombre: 'Eagles Martial Arts', prefijo: 'EA', ciudad: 'Lima' },
  { nombre: 'Cobra Kai Perú Norte', prefijo: 'CK', ciudad: 'Piura' },
  { nombre: 'Masters Pro Academy', prefijo: 'MP', ciudad: 'Trujillo' },
  { nombre: 'Andes Taekwondo Elite', prefijo: 'AT', ciudad: 'Huaraz' },
  { nombre: 'Valientes del Sur', prefijo: 'VS', ciudad: 'Tacna' },
  { nombre: 'Instituto Marcial Pacasmayo', prefijo: 'IM', ciudad: 'Pacasmayo' },
  { nombre: 'Academia Bustamante TKD', prefijo: 'AB', ciudad: 'Trujillo' },
  { nombre: 'Club Deportivo Huanchaco', prefijo: 'CH', ciudad: 'Huanchaco' },
  { nombre: 'Selección Costa Norte', prefijo: 'CN', ciudad: 'Chimbote' },
  { nombre: 'Team Pardo Taekwondo', prefijo: 'TP', ciudad: 'Lima' },
  { nombre: 'Escuela Olímpica Lambayeque', prefijo: 'EO', ciudad: 'Chiclayo' },
]

function gradoParaCategoria(cat) {
  const r = cat.grado_rango
  if (r === 'ranking') {
    if ((cat.edad_min ?? 0) >= 30) return '2º dan'
    return '1º kup'
  }
  const kup = String(r || '').match(/^kup:(\d+)-(\d+)$/)
  if (kup) {
    const mid = Math.ceil((Number(kup[1]) + Number(kup[2])) / 2)
    return `${mid}º kup`
  }
  const dan = String(r || '').match(/^(\d+)dan$/)
  if (dan) return `${dan[1]}º dan`
  return '6º kup'
}

function edadMedia(cat) {
  const min = cat.edad_min ?? 8
  const max = cat.edad_max ?? 45
  return Math.floor((min + max) / 2)
}

function sexoParaCategoria(cat, seq) {
  if (cat.genero === 'M') return 'M'
  if (cat.genero === 'F') return 'F'
  return seq % 2 === 0 ? 'M' : 'F'
}

function pesoParaCategoria(cat) {
  const min = Number(cat.peso_min || 0)
  const max = Number(cat.peso_max)
  if (!max || max >= 999) return Math.round((min + 3) * 10) / 10
  return Math.round((min + 0.5 + (max - min) / 2) * 10) / 10
}

function fechaNacimiento(cat, seq) {
  const edad = edadMedia(cat)
  const mes = 2 + ((cat.id_categoria || 0) + seq) % 10
  const dia = 3 + ((cat.id_categoria || 0) * 3 + seq) % 24
  return `${ANIO - edad}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function nombrePersona(sexo, seq) {
  const pool = sexo === 'F' ? NOMBRES_F : NOMBRES_M
  return {
    nombres: pool[seq % pool.length],
    apellidos: `${APELLIDOS[seq % APELLIDOS.length]} ${APELLIDOS[(seq + 11) % APELLIDOS.length]}`,
  }
}

/** 2–10 competidores por categoría (ciclo determinista) */
export function cupoParaCategoria(cat, idx) {
  return 2 + ((cat.id_categoria ?? idx) % 9)
}

export function perfilParaCategoria(cat, seq, idAcademia, idCampeonato = 0) {
  const sexo = sexoParaCategoria(cat, seq)
  const { nombres, apellidos } = nombrePersona(sexo, seq)
  return {
    id_academia: idAcademia,
    documento_tipo: 'DNI',
    documento_numero: `7${String(idCampeonato).padStart(3, '0')}${String(seq).padStart(8, '0')}`,
    nombres,
    apellidos,
    sexo,
    fecha_nacimiento: fechaNacimiento(cat, seq),
    grado: gradoParaCategoria(cat),
  }
}

async function crearAcademias(sb, idCampeonato) {
  const creadas = []
  for (const ac of ACADEMIAS_PRUEBA) {
    let { data: existente } = await sb.from('academia').select('id_academia').eq('codigo_prefijo', ac.prefijo).maybeSingle()
    if (!existente) {
      const { data: nueva, error } = await sb
        .from('academia')
        .insert({
          nombre: ac.nombre,
          telefono: `519${ac.prefijo}00001`,
          codigo_prefijo: ac.prefijo,
          ciudad: ac.ciudad,
          representante_nombre: `Prof. ${ac.prefijo} Demo`,
          representante_dni: `10${ac.prefijo}00001`.slice(0, 8),
          activa: true,
        })
        .select('id_academia')
        .single()
      if (error) throw error
      existente = nueva
    }

    const { data: link } = await sb
      .from('academia_campeonato')
      .insert({
        id_academia: existente.id_academia,
        id_campeonato: idCampeonato,
        token: `pll${ac.prefijo.toLowerCase()}${idCampeonato}`,
        estado_aprobacion: 'aprobada',
        estado_lista: 'enviada',
        estado_pago: 'validado',
        aceptacion_bases_at: new Date().toISOString(),
        aceptacion_bases_version: '4',
      })
      .select('id, academia(id_academia, nombre, codigo_prefijo)')
      .single()

    creadas.push(link)
  }
  return creadas
}

async function llenarCategoriasLote(sb, idCampeonato, categorias, academias, globalSeqStart, campId) {
  const perfiles = []
  const lineaPlan = []
  let seq = globalSeqStart

  for (const cat of categorias) {
    const cupo = cupoParaCategoria(cat)
    const modalidad = cat.modalidad === 'kyorugi' ? 'kyorugi_individual' : 'poomsae_individual'
    for (let n = 0; n < cupo; n++) {
      const ac = academias[n % academias.length]
      if (!ac?.academia?.id_academia) continue
      seq++
      perfiles.push(perfilParaCategoria(cat, seq, ac.academia.id_academia, campId))
      lineaPlan.push({
        acId: ac.id,
        catId: cat.id_categoria,
        modalidad,
        peso: modalidad === 'kyorugi_individual' ? pesoParaCategoria(cat) : null,
        perfilIdx: perfiles.length - 1,
      })
    }
  }

  if (!perfiles.length) return { added: 0, nextSeq: seq }

  const { data: perfilesIns, error: errP } = await sb.from('competidor_perfil').insert(perfiles).select('id_perfil')
  if (errP) throw errP

  const lineas = lineaPlan.map((p) => {
    const row = {
      id_academia_campeonato: p.acId,
      id_campeonato: idCampeonato,
      modalidad: p.modalidad,
      id_categoria: p.catId,
      es_cobro: true,
      precio_aplicado: 90,
      tipo_tarifa: 'regular',
      estado: 'pagado',
    }
    if (p.peso != null) row.peso_declarado = p.peso
    return row
  })

  const { data: lineasIns, error: errL } = await sb.from('linea_inscripcion').insert(lineas).select('id_linea')
  if (errL) throw errL

  const miembros = lineaPlan.map((p, i) => ({
    id_linea: lineasIns[i].id_linea,
    id_perfil: perfilesIns[p.perfilIdx].id_perfil,
  }))
  const { error: errM } = await sb.from('linea_inscripcion_miembro').insert(miembros)
  if (errM) throw errM

  return { added: perfiles.length, nextSeq: seq }
}

async function aprobarTodasLasLineas(sb, idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, modalidad, dorsal_numero, estado')
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'anulado')

  let dorsales = 0
  let poomsae = 0
  for (const l of lineas || []) {
    if (l.modalidad === 'kyorugi_individual') {
      if (!l.dorsal_numero) {
        await asignarDorsalLinea(sb, l.id_linea)
        dorsales++
      } else if (l.estado !== 'aprobado') {
        await asignarDorsalLinea(sb, l.id_linea)
      }
    } else if (l.estado !== 'aprobado') {
      await sb
        .from('linea_inscripcion')
        .update({ estado: 'aprobado', updated_at: new Date().toISOString() })
        .eq('id_linea', l.id_linea)
      poomsae++
    }
  }
  return { dorsales, poomsae }
}

async function aplicarPesaje(sb, idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, peso_declarado')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')

  for (const l of lineas || []) {
    await sb
      .from('linea_inscripcion')
      .update({
        peso_oficial: Number(l.peso_declarado),
        pesaje_estado: 'ok',
        pesaje_intentos: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id_linea', l.id_linea)
  }
  return (lineas || []).length
}

async function liquidarPagos(sb, idCampeonato) {
  const { data: academias } = await sb
    .from('academia_campeonato')
    .select('id')
    .eq('id_campeonato', idCampeonato)

  let pagadas = 0
  for (const ac of academias || []) {
    await recalcularMontosAcademia(sb, ac.id)
    const r = await registrarPagoTotalAcademia(sb, ac.id)
    if (r.monto > 0) pagadas++
  }
  return pagadas
}

export async function limpiarCampeonatoPruebaLlaves(sb, slug = SLUG_PRUEBA_LLAVES) {
  const { data: camp } = await sb.from('campeonato').select('id_campeonato').eq('slug', slug).maybeSingle()
  if (!camp) return null

  const id = camp.id_campeonato
  await sb.from('llave_kyorugi').delete().eq('id_campeonato', id)

  const { data: acs } = await sb.from('academia_campeonato').select('id').eq('id_campeonato', id)
  const acIds = (acs || []).map((a) => a.id)
  if (acIds.length) {
    const { data: lineas } = await sb.from('linea_inscripcion').select('id_linea').in('id_academia_campeonato', acIds)
    const lineaIds = (lineas || []).map((l) => l.id_linea)
    if (lineaIds.length) {
      await sb.from('asignacion_pago').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion_miembro').delete().in('id_linea', lineaIds)
      await sb.from('linea_inscripcion').delete().in('id_linea', lineaIds)
    }
    await sb.from('comprobante_pago').delete().in('id_academia_campeonato', acIds)
    await sb.from('academia_campeonato').delete().in('id', acIds)
  }

  await sb.from('campeonato_tarifa').delete().eq('id_campeonato', id)
  await sb.from('categoria_campeonato').delete().eq('id_campeonato', id)
  await sb.from('campeonato').delete().eq('id_campeonato', id)
  return id
}

async function obtenerOCrearCampeonato(sb, { reset = false } = {}) {
  if (reset) await limpiarCampeonatoPruebaLlaves(sb)

  const { data: existente } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG_PRUEBA_LLAVES).maybeSingle()
  if (existente) return existente.id_campeonato

  const { campeonato } = await crearCampeonatoCompleto(sb, {
    nombre: NOMBRE_PRUEBA_LLAVES,
    descripcion: 'Campeonato de prueba — todas las categorías con 2–10 competidores, llaves CNU',
    fecha_inicio: '2026-08-15',
    fecha_fin: '2026-08-17',
    lugar: 'Coliseo ACCTKD Trujillo',
    ciudad: 'Trujillo',
    estado: 'inscripciones',
    fecha_inicio_regular: '2026-06-01',
    fecha_fin_regular: '2026-07-31',
    fecha_cierre_inscripcion: '2026-08-01',
    fecha_gracia_pago: '2026-08-10',
    publicado: true,
    cuenta_bancaria_info: 'BCP · ACCTKD · CCI 12345678901234',
  })

  const id = campeonato.id_campeonato
  await sb.from('campeonato').update({ slug: SLUG_PRUEBA_LLAVES }).eq('id_campeonato', id)
  return id
}

/** Fases: setup | inscripciones | finalizar | todo */
export async function sembrarCampeonatoPruebaLlaves(sb, { onProgress, fase = 'todo', offset = 0, limit = 60, reset = false } = {}) {
  const runSetup = fase === 'todo' || fase === 'setup'
  const runInscripciones = fase === 'todo' || fase === 'inscripciones'
  const runFinalizar = fase === 'todo' || fase === 'finalizar'

  let id = null
  let academias = []
  let categorias_creadas = null

  if (runSetup) {
    id = await obtenerOCrearCampeonato(sb, { reset: fase === 'todo' || reset })
    onProgress?.('academias')
    academias = await crearAcademias(sb, id)
    const { count } = await sb
      .from('categoria_campeonato')
      .select('*', { count: 'exact', head: true })
      .eq('id_campeonato', id)
    categorias_creadas = count
    if (fase === 'setup') {
      return { id_campeonato: id, slug: SLUG_PRUEBA_LLAVES, fase, academias: academias.length, categorias_catalogo: categorias_creadas }
    }
  } else {
    const { data: camp } = await sb.from('campeonato').select('id_campeonato').eq('slug', SLUG_PRUEBA_LLAVES).single()
    id = camp.id_campeonato
    const { data: acs } = await sb
      .from('academia_campeonato')
      .select('id, academia(id_academia, nombre, codigo_prefijo)')
      .eq('id_campeonato', id)
      .eq('estado_aprobacion', 'aprobada')
    academias = acs || []
  }

  const { data: categorias } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_campeonato', id)
    .order('orden')

  let globalSeq = 100_000 + offset * 20
  let totalLineas = 0
  let catsKy = 0
  let catsPm = 0

  if (runInscripciones) {
    const all = categorias || []
    const lotes =
      fase === 'inscripciones'
        ? [all.slice(offset, offset + limit)]
        : Array.from({ length: Math.ceil(all.length / limit) }, (_, i) => all.slice(i * limit, (i + 1) * limit))

    for (let li = 0; li < lotes.length; li++) {
      const slice = lotes[li]
      if (!slice.length) continue
      const { added, nextSeq } = await llenarCategoriasLote(sb, id, slice, academias, globalSeq, id)
      globalSeq = nextSeq
      totalLineas += added
      for (const cat of slice) {
        if (cat.modalidad === 'kyorugi') catsKy++
        else catsPm++
      }
      if (fase === 'todo') onProgress?.('inscripciones', { hechas: Math.min((li + 1) * limit, all.length), total: all.length })
    }

    if (fase === 'inscripciones') {
      const slice = lotes[0] || []
      return {
        id_campeonato: id,
        slug: SLUG_PRUEBA_LLAVES,
        fase,
        offset,
        limit,
        procesadas: slice.length,
        total_categorias: all.length,
        siguiente_offset: offset + slice.length,
        completo: offset + slice.length >= all.length,
        lineas_creadas: totalLineas,
      }
    }
  }

  if (runFinalizar) {
    onProgress?.('dorsales')
    const aprob = await aprobarTodasLasLineas(sb, id)
    onProgress?.('pesaje')
    const pesaje = await aplicarPesaje(sb, id)
    onProgress?.('pagos')
    const pagadas = await liquidarPagos(sb, id)
    onProgress?.('llaves')
    await sb.from('llave_kyorugi').delete().eq('id_campeonato', id)
    const llaves = await generarTodasLasLlaves(sb, id)

    const { count: lineasKy } = await sb
      .from('linea_inscripcion')
      .select('*', { count: 'exact', head: true })
      .eq('id_campeonato', id)
      .eq('modalidad', 'kyorugi_individual')
      .eq('estado', 'aprobado')
    const { count: lineasPm } = await sb
      .from('linea_inscripcion')
      .select('*', { count: 'exact', head: true })
      .eq('id_campeonato', id)
      .like('modalidad', 'poomsae%')
      .eq('estado', 'aprobado')

    return {
      id_campeonato: id,
      slug: SLUG_PRUEBA_LLAVES,
      nombre: NOMBRE_PRUEBA_LLAVES,
      fase,
      categorias_catalogo: categorias_creadas ?? categorias.length,
      categorias_kyorugi: (categorias || []).filter((c) => c.modalidad === 'kyorugi').length,
      categorias_poomsae: (categorias || []).filter((c) => c.modalidad === 'poomsae').length,
      academias: academias.length,
      lineas_creadas: totalLineas,
      kyorugi_aprobados: lineasKy || 0,
      poomsae_aprobados: lineasPm || 0,
      dorsales_asignados: aprob.dorsales,
      pesaje_ok: pesaje,
      academias_pagadas: pagadas,
      llaves_generadas: llaves.generadas,
      errores_llaves: llaves.errores?.length || 0,
      errores_llaves_detalle: llaves.errores?.slice(0, 10) || [],
    }
  }

  return { id_campeonato: id, slug: SLUG_PRUEBA_LLAVES, fase: 'todo', lineas_creadas: totalLineas }
}
