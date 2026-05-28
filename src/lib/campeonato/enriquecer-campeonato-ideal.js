import { generarTodasLasLlaves, registrarGanadorCombate } from '@/lib/campeonato/llaves-kyorugi'
import { asignarDorsalLinea } from '@/lib/campeonato/inscripcion-server'

const KYORUGI_TARGETS = [5, 7, 9, 11]
const POOMSAE_MIN = 5

const NUEVAS_ACADEMIAS = [
  { nombre: 'Leones del Norte TKD', prefijo: 'LN' },
  { nombre: 'Samurai Kick Lima', prefijo: 'SK' },
  { nombre: 'Masters Pro Academy', prefijo: 'MP' },
  { nombre: 'Rising Stars TKD', prefijo: 'RS' },
  { nombre: 'Black Belt Elite Perú', prefijo: 'BE' },
]

const GRADOS = ['10º kup', '8º kup', '6º kup', '4º kup', '2º kup', '1º dan', '2º dan']
const EDADES = [8, 10, 12, 14, 16, 18, 22, 28, 35, 45, 55]
const ANIO = 2026

function pesoPara(cat) {
  if (!cat?.peso_max || Number(cat.peso_max) >= 999) return Number(cat.peso_min || 50) + 2
  return Math.round(((Number(cat.peso_min || 0) + Number(cat.peso_max)) / 2) * 10) / 10
}

function perfilDemo(academiaIdx, seq, sexo = null) {
  const s = sexo || (seq % 2 === 0 ? 'M' : 'F')
  const edad = EDADES[(academiaIdx + seq) % EDADES.length]
  return {
    documento_tipo: 'DNI',
    documento_numero: `8${String(academiaIdx * 1000 + seq).padStart(7, '0')}`,
    nombres: s === 'M' ? `Atleta${seq}` : `AtletaF${seq}`,
    apellidos: `Demo ${NUEVAS_ACADEMIAS[academiaIdx % NUEVAS_ACADEMIAS.length]?.prefijo || 'XX'}`,
    sexo: s,
    fecha_nacimiento: `${ANIO - edad}-03-10`,
    grado: GRADOS[(academiaIdx + seq) % GRADOS.length],
  }
}

async function ensureAcademias(sb, idCampeonato) {
  const { data: existentes } = await sb
    .from('academia_campeonato')
    .select('id, academia(id_academia, nombre, codigo_prefijo)')
    .eq('id_campeonato', idCampeonato)
  const nombres = new Set((existentes || []).map((a) => a.academia?.nombre))

  for (const na of NUEVAS_ACADEMIAS) {
    if (nombres.has(na.nombre)) continue
    const { data: acad } = await sb
      .from('academia')
      .insert({ nombre: na.nombre, telefono: `519${na.prefijo}00001`, codigo_prefijo: na.prefijo })
      .select()
      .single()
    await sb.from('academia_campeonato').insert({
      id_academia: acad.id_academia,
      id_campeonato: idCampeonato,
      token: `ideal${na.prefijo.toLowerCase()}${idCampeonato}`,
      estado_aprobacion: 'aprobada',
      estado_lista: 'enviada',
      aceptacion_bases_at: new Date().toISOString(),
      aceptacion_bases_version: '4',
    })
  }

  const { data: all } = await sb
    .from('academia_campeonato')
    .select('id, academia(id_academia, nombre, codigo_prefijo)')
    .eq('id_campeonato', idCampeonato)
    .eq('estado_aprobacion', 'aprobada')
  return all || []
}

async function countKyorugi(sb, idCategoria) {
  const { count } = await sb
    .from('linea_inscripcion')
    .select('id_linea', { count: 'exact', head: true })
    .eq('id_categoria', idCategoria)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)
  return count || 0
}

async function crearLineaKyorugi(sb, ac, idCampeonato, cat, perfil, peso) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .insert({
      id_academia_campeonato: ac.id,
      id_campeonato: idCampeonato,
      modalidad: 'kyorugi_individual',
      id_categoria: cat.id_categoria,
      es_cobro: true,
      precio_aplicado: 90,
      tipo_tarifa: 'regular',
      peso_declarado: peso,
      estado: 'pagado',
    })
    .select()
    .single()
  await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: perfil.id_perfil })
  return linea
}

async function crearLineaPoomsae(sb, ac, idCampeonato, cat, perfil) {
  const { data: linea } = await sb
    .from('linea_inscripcion')
    .insert({
      id_academia_campeonato: ac.id,
      id_campeonato: idCampeonato,
      modalidad: 'poomsae_individual',
      id_categoria: cat.id_categoria,
      es_cobro: true,
      precio_aplicado: 90,
      tipo_tarifa: 'regular',
      estado: 'pagado',
    })
    .select()
    .single()
  await sb.from('linea_inscripcion_miembro').insert({ id_linea: linea.id_linea, id_perfil: perfil.id_perfil })
  return linea
}

function apiError(json, fallback = 'Error') {
  const e = json?.error
  if (typeof e === 'string') return e
  if (e?.message) return e.message
  return fallback
}

async function llenarKyorugi(sb, idCampeonato, academias, catsKy) {
  const seleccionadas = catsKy.slice(0, 24)
  let globalSeq = 9000
  let added = 0

  for (let i = 0; i < seleccionadas.length; i++) {
    const cat = seleccionadas[i]
    const target = KYORUGI_TARGETS[i % KYORUGI_TARGETS.length]
    const actuales = await countKyorugi(sb, cat.id_categoria)
    const needed = Math.max(0, target - actuales)
    if (!needed) continue

    for (let n = 0; n < needed; n++) {
      const ac = academias[n % academias.length]
      if (!ac?.academia?.id_academia) continue
      const seq = globalSeq++
      const sexo = cat.genero === 'F' ? 'F' : cat.genero === 'M' ? 'M' : null
      const p = perfilDemo(academias.indexOf(ac), seq, sexo)
      p.apellidos = `${ac.academia.codigo_prefijo || 'AC'} Demo`
      p.documento_numero = `8${idCampeonato}${String(seq).padStart(6, '0')}`

      const { data: perfil, error: errP } = await sb
        .from('competidor_perfil')
        .insert({ ...p, id_academia: ac.academia.id_academia })
        .select()
        .single()
      if (errP || !perfil?.id_perfil) throw new Error(errP?.message || 'No se pudo crear perfil de competidor')

      await crearLineaKyorugi(sb, ac, idCampeonato, cat, perfil, pesoPara(cat))
      added++
    }
  }
  return added
}

async function llenarPoomsae(sb, idCampeonato, academias, catsPm) {
  const seleccionadas = catsPm.slice(0, 30)
  let globalSeq = 8000
  let added = 0

  for (const cat of seleccionadas) {
    const { count } = await sb
      .from('linea_inscripcion')
      .select('id_linea', { count: 'exact', head: true })
      .eq('id_categoria', cat.id_categoria)
      .like('modalidad', 'poomsae%')
      .eq('estado', 'aprobado')
    const needed = Math.max(0, POOMSAE_MIN - (count || 0))
    if (!needed) continue

    for (let n = 0; n < needed; n++) {
      const ac = academias[(globalSeq + n) % academias.length]
      if (!ac?.academia?.id_academia) continue
      const seq = globalSeq++
      const p = perfilDemo(academias.indexOf(ac), seq)
      p.apellidos = `${ac.academia.codigo_prefijo || 'AC'} Poomsae`
      p.documento_numero = `9${idCampeonato}${String(seq).padStart(6, '0')}`

      const { data: perfil, error: errP } = await sb
        .from('competidor_perfil')
        .insert({ ...p, id_academia: ac.academia.id_academia })
        .select()
        .single()
      if (errP || !perfil?.id_perfil) throw new Error(errP?.message || 'No se pudo crear perfil poomsae')

      await crearLineaPoomsae(sb, ac, idCampeonato, cat, perfil)
      added++
    }
  }
  return added
}

async function aprobarYDorsales(sb, idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, dorsal_numero')
    .eq('id_campeonato', idCampeonato)
    .in('estado', ['pagado', 'pendiente_pago', 'borrador'])

  let n = 0
  for (const l of lineas || []) {
    if (l.dorsal_numero) continue
    await asignarDorsalLinea(sb, l.id_linea)
    n++
  }
  return n
}

async function aplicarPesaje(sb, idCampeonato) {
  const { data: lineas } = await sb
    .from('linea_inscripcion')
    .select('id_linea, peso_declarado, categoria:categoria_campeonato(peso_min, peso_max)')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')

  for (const l of lineas || []) {
    const peso = Number(l.peso_declarado || pesoPara(l.categoria))
    await sb
      .from('linea_inscripcion')
      .update({ peso_oficial: peso, pesaje_estado: 'ok', pesaje_intentos: 1, updated_at: new Date().toISOString() })
      .eq('id_linea', l.id_linea)
  }
  return (lineas || []).length
}

async function finalizarCombates(sb, idCampeonato) {
  let ok = 0
  for (let pass = 0; pass < 8; pass++) {
    const { data: combates } = await sb
      .from('llave_kyorugi')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .eq('estado', 'pendiente')
      .not('id_linea1', 'is', null)
      .not('id_linea2', 'is', null)
      .order('orden_pista', { ascending: true, nullsFirst: false })

    for (const c of combates || []) {
      try {
        const g = Math.random() > 0.5 ? c.id_linea1 : c.id_linea2
        const p1 = Math.floor(Math.random() * 8) + 5
        const p2 = g === c.id_linea1 ? Math.max(0, p1 - 2) : p1 + 2
        await registrarGanadorCombate(sb, c.id_llave, g, { puntaje1: p1, puntaje2: Math.max(0, p2) })
        ok++
      } catch {
        /* ronda bloqueada */
      }
    }
  }
  return ok
}

/** Enriquece campeonato existente con escenario ideal terminado */
export async function enriquecerCampeonatoIdeal(sb, idCampeonato, { fase = 'todo' } = {}) {
  const { data: camp } = await sb.from('campeonato').select('id_campeonato, slug').eq('id_campeonato', idCampeonato).single()
  if (!camp) throw new Error('Campeonato no encontrado')

  const result = { id_campeonato: idCampeonato, slug: camp.slug, fase }

  if (fase === 'inscripciones' || fase === 'todo') {
    const academias = await ensureAcademias(sb, idCampeonato)
    const { data: catsKy } = await sb
      .from('categoria_campeonato')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'kyorugi')
      .order('orden')
    const { data: catsPm } = await sb
      .from('categoria_campeonato')
      .select('*')
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', 'poomsae')
      .order('orden')

    result.academias = academias.length
    result.kyorugi_agregados = await llenarKyorugi(sb, idCampeonato, academias, catsKy || [])
    result.poomsae_agregados = await llenarPoomsae(sb, idCampeonato, academias, catsPm || [])
    result.dorsales_asignados = await aprobarYDorsales(sb, idCampeonato)
    result.pesaje_ok = await aplicarPesaje(sb, idCampeonato)
  }

  if (fase === 'llaves' || fase === 'todo') {
    await sb.from('llave_kyorugi').delete().eq('id_campeonato', idCampeonato)
    const llaves = await generarTodasLasLlaves(sb, idCampeonato)
    result.llaves_generadas = llaves.generadas
    result.errores_llaves = llaves.errores?.length || 0
  }

  if (fase === 'combates' || fase === 'todo') {
    result.combates_finalizados = await finalizarCombates(sb, idCampeonato)
    await sb.from('campeonato').update({ estado: 'finalizado' }).eq('id_campeonato', idCampeonato)
  }

  return result
}
