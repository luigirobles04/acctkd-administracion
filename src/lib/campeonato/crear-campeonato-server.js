import { generarSlugUnico, sembrarCampeonatoCompleto, catalogoNecesitaReseed, resincronizarCatalogo, MIN_CATEGORIAS_CATALOGO, CATALOG_VERSION } from '@/lib/campeonato/categorias-wt'
import { throwSupabase } from '@/lib/supabase-errors'

/** Crea campeonato publicado con slug, categorías WT y tarifas FDPTKD */
export async function crearCampeonatoCompleto(sb, input) {
  const {
    nombre,
    descripcion,
    fecha_inicio,
    fecha_fin,
    lugar,
    ciudad,
    estado,
    fecha_cierre_inscripcion,
    fecha_inicio_regular,
    fecha_fin_regular,
    fecha_inicio_tardia,
    fecha_gracia_pago,
    cuenta_bancaria_info,
    publicado,
  } = input

  if (!nombre?.trim() || !fecha_inicio || !fecha_fin) {
    throw new Error('Nombre y fechas del evento son obligatorios')
  }

  let slug = generarSlugUnico(nombre, fecha_inicio)
  const { data: slugExiste } = await sb.from('campeonato').select('id_campeonato').eq('slug', slug).maybeSingle()
  if (slugExiste) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const hoy = new Date().toISOString().slice(0, 10)
  const payload = {
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    slug,
    fecha_inicio,
    fecha_fin,
    lugar: lugar?.trim() || null,
    ciudad: ciudad?.trim() || 'Trujillo',
    estado: estado || 'inscripciones',
    fecha_inicio_regular: fecha_inicio_regular || hoy,
    fecha_fin_regular: fecha_fin_regular || fecha_cierre_inscripcion || fecha_inicio,
    fecha_inicio_tardia: fecha_inicio_tardia || null,
    fecha_cierre_inscripcion: fecha_cierre_inscripcion || fecha_inicio,
    fecha_gracia_pago: fecha_gracia_pago || null,
    cuenta_bancaria_info: cuenta_bancaria_info || null,
    publicado: publicado !== false,
    bases_version: String(CATALOG_VERSION),
  }

  const { data: camp, error } = await sb.from('campeonato').insert(payload).select().single()
  if (error) throwSupabase(error, 'No se pudo crear el campeonato')

  try {
    await sembrarCampeonatoCompleto(sb, camp.id_campeonato)
  } catch (e) {
    await sb.from('campeonato').delete().eq('id_campeonato', camp.id_campeonato)
    throw e
  }

  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', camp.id_campeonato)

  return { campeonato: camp, categorias_creadas: count || 0 }
}

/** Repara campeonato incompleto o resincroniza catálogo FDPTKD */
export async function activarCampeonatoCompleto(sb, idCampeonato) {
  const { data: camp, error: errCamp } = await sb
    .from('campeonato')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .single()
  if (errCamp) throwSupabase(errCamp, 'Campeonato no encontrado')

  const patch = {}
  if (!camp.slug) {
    let slug = generarSlugUnico(camp.nombre, camp.fecha_inicio)
    const { data: slugExiste } = await sb
      .from('campeonato')
      .select('id_campeonato')
      .eq('slug', slug)
      .neq('id_campeonato', idCampeonato)
      .maybeSingle()
    if (slugExiste) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    patch.slug = slug
  }
  if (!camp.publicado) patch.publicado = true
  if (camp.estado === 'planificado') patch.estado = 'inscripciones'
  if (!camp.fecha_cierre_inscripcion) patch.fecha_cierre_inscripcion = camp.fecha_inicio
  patch.bases_version = String(CATALOG_VERSION)

  let campeonato = camp
  if (Object.keys(patch).length > 0) {
    const { data: updated, error: errUp } = await sb
      .from('campeonato')
      .update(patch)
      .eq('id_campeonato', idCampeonato)
      .select()
      .single()
    if (errUp) throwSupabase(errUp, 'No se pudo actualizar el campeonato')
    campeonato = updated
  }

  let categoriasReseed = 0
  if (await catalogoNecesitaReseed(sb, idCampeonato)) {
    categoriasReseed = await resincronizarCatalogo(sb, idCampeonato)
  } else {
    const { count } = await sb
      .from('categoria_campeonato')
      .select('*', { count: 'exact', head: true })
      .eq('id_campeonato', idCampeonato)
    categoriasReseed = count || 0
  }

  return { campeonato, categorias_creadas: categoriasReseed, catalogo_version: CATALOG_VERSION }
}

export async function campeonatoNecesitaActivacion(sb, camp, numCategorias = 0) {
  if (!camp) return false
  if (!camp.slug || !camp.publicado) return true
  if (numCategorias < MIN_CATEGORIAS_CATALOGO) return true
  if (String(camp.bases_version) !== String(CATALOG_VERSION)) return true
  return catalogoNecesitaReseed(sb, camp.id_campeonato)
}
