/**
 * Planilla kyorugi (sin festival): por división → categoría → competidores.
 */

const DIVISION_ORDER = [
  'Pre Infantil',
  'Infantil A',
  'Infantil B',
  'Pre Cadete',
  'Cadete',
  'Juvenil',
  'Junior',
  'Senior 1',
  'Senior 2',
  'Senior A',
  'Senior B',
  'Master 1',
  'Master 2',
  'Master 3',
  'Master 4',
]

function divisionRank(division) {
  const d = String(division || '').trim()
  const i = DIVISION_ORDER.findIndex((x) => x.toLowerCase() === d.toLowerCase())
  if (i >= 0) return i
  return DIVISION_ORDER.length + 1
}

export function tituloDivisionKyorugi(division) {
  const d = String(division || 'General').trim()
  return d.toUpperCase()
}

function nombreCompetidor(linea) {
  const miembros = linea.miembros || []
  if (!miembros.length) return linea.dorsal_display || '—'
  return miembros
    .map((m) => {
      const p = m.perfil
      if (!p) return ''
      return `${p.nombres || ''} ${p.apellidos || ''}`.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

function lineaVisiblePlanillaKyorugi(linea) {
  if (!linea || linea.estado === 'anulado' || linea.estado === 'borrador') return false
  if (linea.modalidad !== 'kyorugi_individual') return false
  return linea.dorsal_numero != null || Boolean(linea.dorsal_display)
}

function pesoTexto(linea) {
  const p = linea.peso_oficial != null ? Number(linea.peso_oficial) : Number(linea.peso_declarado)
  if (!Number.isFinite(p) || p <= 0) return '—'
  return `${p} kg`
}

/** @returns {{ campeonato, categorias: Array, bloques: Array }} */
export async function fetchPlanillaKyorugiCampeonato(sb, idCampeonato) {
  const { data: campeonato, error: errCamp } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, fecha_inicio, ciudad')
    .eq('id_campeonato', idCampeonato)
    .single()
  if (errCamp) throw errCamp

  const { data: categorias, error: errC } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, genero, division, orden, peso_min, peso_max')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })
  if (errC) throw errC

  const { data: lineas, error: errL } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, id_categoria, modalidad, estado, dorsal_display, dorsal_numero,
      peso_declarado, peso_oficial, pesaje_estado,
      academia_campeonato(academia(nombre)),
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(nombres, apellidos))
    `)
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .neq('estado', 'anulado')
    .neq('estado', 'borrador')
    .not('dorsal_numero', 'is', null)
    .order('dorsal_numero', { ascending: true })
  if (errL) throw errL

  const catMeta = new Map((categorias || []).map((c) => [c.id_categoria, c]))
  const porCat = new Map()

  for (const l of (lineas || []).filter(lineaVisiblePlanillaKyorugi)) {
    if (!l.id_categoria) continue
    if (!porCat.has(l.id_categoria)) porCat.set(l.id_categoria, [])
    porCat.get(l.id_categoria).push({
      id_linea: l.id_linea,
      dorsal: l.dorsal_display || '',
      nombres: nombreCompetidor(l),
      academia: l.academia_campeonato?.academia?.nombre || '',
      peso: pesoTexto(l),
      pesaje_estado: l.pesaje_estado || '',
      dorsal_numero: l.dorsal_numero,
    })
  }

  const categoriasOut = []
  for (const [idCat, participantes] of porCat.entries()) {
    const cat = catMeta.get(idCat)
    if (!cat) continue
    participantes.sort((a, b) => (a.dorsal_numero ?? 0) - (b.dorsal_numero ?? 0))
    const conOrden = participantes.map((p, i) => ({ ...p, orden: i + 1 }))
    categoriasOut.push({
      id_categoria: idCat,
      nombre: cat.nombre,
      division: cat.division || '',
      genero: cat.genero || '',
      orden: cat.orden ?? 9999,
      inscritos: conOrden.length,
      participantes: conOrden,
    })
  }

  categoriasOut.sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden
    return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
  })

  const bloques = agruparKyorugiPlanillaPorGeneroYDivision(categoriasOut)

  return { campeonato, categorias: categoriasOut, bloques }
}

export function tituloGeneroKyorugi(genero) {
  const g = String(genero || '').toUpperCase()
  if (g === 'M') return 'MASCULINO'
  if (g === 'F') return 'FEMENINO'
  return 'GENERAL'
}

/** Masculino completo (por división → categoría), luego femenino. */
export function agruparKyorugiPlanillaPorGeneroYDivision(categorias) {
  const bloques = []
  const grupos = [
    { genero: 'M', titulo: 'MASCULINO' },
    { genero: 'F', titulo: 'FEMENINO' },
  ]
  const otros = (categorias || []).filter((c) => !['M', 'F'].includes(String(c.genero || '').toUpperCase()))
  if (otros.length) grupos.push({ genero: null, titulo: 'GENERAL', cats: otros })

  for (const g of grupos) {
    const cats =
      g.cats ||
      (categorias || []).filter((c) => String(c.genero || '').toUpperCase() === g.genero)
    if (!cats.length) continue
    bloques.push({ generoBanner: g.titulo })
    bloques.push(...agruparKyorugiPlanillaPorDivision(cats))
  }
  return bloques
}

export function agruparKyorugiPlanillaPorDivision(categorias) {
  const map = new Map()
  for (const cat of categorias || []) {
    const div = cat.division || 'General'
    if (!map.has(div)) map.set(div, { division: div, categorias: [], minOrden: cat.orden ?? 9999 })
    const g = map.get(div)
    g.categorias.push(cat)
    g.minOrden = Math.min(g.minOrden, cat.orden ?? 9999)
  }

  return [...map.values()]
    .map((g) => {
      g.categorias.sort((a, b) => {
        if (a.orden !== b.orden) return a.orden - b.orden
        return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
      })
      return {
        banner: tituloDivisionKyorugi(g.division),
        division: g.division,
        categorias: g.categorias,
      }
    })
    .sort((a, b) => {
      const ra = divisionRank(a.division)
      const rb = divisionRank(b.division)
      if (ra !== rb) return ra - rb
      return a.minOrden - b.minOrden
    })
}

function kyorugiParticipanteRows(participantes, resaltarIdLineas) {
  return (participantes || []).map((p) => {
    const highlight = resaltarIdLineas?.has(p.id_linea)
    const mark = (cell) =>
      cell && typeof cell === 'object' ? { ...cell, highlight } : { text: cell, highlight }
    return [
      mark({ text: String(p.orden), align: 'center', bold: true }),
      mark({ text: p.dorsal || '—', align: 'center', bold: true }),
      mark(p.nombres),
      mark(p.academia),
      mark(p.peso),
    ]
  })
}

export function buildKyorugiPlanillaSections(bloques, { resaltarIdLineas } = {}) {
  const highlightSet =
    resaltarIdLineas instanceof Set
      ? resaltarIdLineas
      : resaltarIdLineas
        ? new Set(resaltarIdLineas)
        : null
  const sections = []
  const lineasVistas = new Set()

  for (const bloque of bloques || []) {
    if (bloque.generoBanner) {
      sections.push({ formaBanner: bloque.generoBanner })
      continue
    }
    if (!bloque.categorias?.length) continue
    sections.push({ formaBanner: bloque.banner })

    for (const cat of bloque.categorias) {
      const participantes = (cat.participantes || []).filter((p) => {
        if (lineasVistas.has(p.id_linea)) return false
        lineasVistas.add(p.id_linea)
        return true
      })
      if (!participantes.length) continue

      sections.push({
        title: `${cat.nombre} · ${cat.genero || ''} · ${participantes.length} competidor(es)`,
        rows: kyorugiParticipanteRows(participantes, highlightSet),
      })
    }
  }

  return sections
}
