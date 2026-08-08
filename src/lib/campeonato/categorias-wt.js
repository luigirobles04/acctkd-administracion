import { TARIFAS_FDPTKD_DEFAULT } from '@/lib/campeonato/constants'
import { slugify } from '@/lib/campeonato/constants'

/** Versión del catálogo FestCup — incrementar al cambiar categorías */
export const CATALOG_VERSION = 7

/** Kyorugi · niveles por cinturón (FestCup 2026) */
const KYORUGI_NIVELES = [
  { nivel: 'Festival', grado_rango: 'kup:7-10' },
  { nivel: 'Noveles', grado_rango: 'kup:3-6' },
  { nivel: 'Avanzados', grado_rango: 'kup:1-2' },
]

/** Kyorugi · divisiones edad + pesos (FestCup 2026). Siempre M y F separados. */
const KYORUGI_DIVISIONES = [
  {
    division: 'Infantil A',
    edadMin: 6,
    edadMax: 7,
    pesosM: [19, 22, 25, 28, 31],
    pesosF: [19, 22, 25, 28, 31],
  },
  {
    division: 'Infantil B',
    edadMin: 8,
    edadMax: 9,
    pesosM: [21, 24, 27, 30, 33, 36, 39],
    pesosF: [21, 24, 27, 30, 33, 36, 39],
  },
  {
    division: 'Pre Cadete',
    edadMin: 10,
    edadMax: 11,
    pesosM: [30, 33, 36, 39, 42, 45, 48, 51, 54],
    pesosF: [30, 33, 36, 39, 42, 45, 48, 51, 54],
  },
  {
    division: 'Cadete',
    edadMin: 12,
    edadMax: 14,
    pesosM: [33, 37, 41, 45, 49, 53, 57, 61, 65],
    pesosF: [29, 33, 37, 41, 44, 47, 51, 55, 59],
  },
  {
    division: 'Juvenil',
    edadMin: 15,
    edadMax: 17,
    pesosM: [45, 48, 51, 55, 59, 63, 68, 73, 78],
    pesosF: [42, 44, 46, 49, 52, 55, 59, 63, 68],
  },
  {
    division: 'Mayores',
    edadMin: 18,
    edadMax: 99,
    pesosM: [54, 58, 62, 68, 72, 78, 84],
    pesosF: [46, 49, 53, 57, 62, 67, 73],
  },
]

/** Poomsae · divisiones edad (FestCup 2026) — Master 4 = 65 años a más */
export const POOMSAE_DIVISIONES = [
  { division: 'Pre Infantil', edadMin: 4, edadMax: 5, anioDesde: 2021, anioHasta: 2022 },
  { division: 'Infantil A', edadMin: 6, edadMax: 7, anioDesde: 2019, anioHasta: 2020 },
  { division: 'Infantil B', edadMin: 8, edadMax: 9, anioDesde: 2017, anioHasta: 2018 },
  { division: 'Pre Cadete', edadMin: 10, edadMax: 11, anioDesde: 2015, anioHasta: 2016 },
  { division: 'Cadete', edadMin: 12, edadMax: 14, anioDesde: 2012, anioHasta: 2014 },
  { division: 'Junior', edadMin: 15, edadMax: 17, anioDesde: 2009, anioHasta: 2011 },
  { division: 'Senior 1', edadMin: 18, edadMax: 30, anioDesde: 1996, anioHasta: 2008 },
  { division: 'Senior 2', edadMin: 31, edadMax: 40, anioDesde: 1986, anioHasta: 1995 },
  { division: 'Master 1', edadMin: 41, edadMax: 50, anioDesde: 1976, anioHasta: 1985 },
  { division: 'Master 2', edadMin: 51, edadMax: 60, anioDesde: 1966, anioHasta: 1975 },
  { division: 'Master 3', edadMin: 61, edadMax: 64, anioDesde: 1962, anioHasta: 1965 },
  { division: 'Master 4', edadMin: 65, edadMax: 99, anioDesde: 1900, anioHasta: 1961 },
]

/** Poomsae reconocido · cintas de color */
const POOMSAE_RECONOCIDO = [
  { label: 'Kibom', kupMin: 9, kupMax: 10 },
  { label: 'Il Jang', kupMin: 8, kupMax: 8 },
  { label: 'I Jang', kupMin: 7, kupMax: 7 },
  { label: 'Sam Jang', kupMin: 6, kupMax: 6 },
  { label: 'Sa Jang', kupMin: 5, kupMax: 5 },
  { label: 'Oh Jang', kupMin: 4, kupMax: 4 },
  { label: 'Yuk Jang', kupMin: 3, kupMax: 3 },
  { label: 'Chil Jang', kupMin: 2, kupMax: 2 },
  { label: 'Pal Jang', kupMin: 1, kupMax: 1 },
]

/** Poomsae de dan / poom */
const POOMSAE_DAN = [
  { label: 'Koryo', dan: 1 },
  { label: 'Keumgang', dan: 2 },
  { label: 'Taebaek', dan: 3 },
  { label: 'Pyongwon', dan: 4 },
  { label: 'Sip Jin', dan: 5 },
  { label: 'Jitae', dan: 6 },
  { label: 'Chongkwon', dan: 7 },
  { label: 'Hansu', dan: 8 },
]

function kupRango(min, max) {
  return min === max ? `kup:${min}-${max}` : `kup:${min}-${max}`
}

function bandasPeso(limitesSuperiores) {
  const bands = []
  let prev = 0
  for (const max of limitesSuperiores) {
    bands.push({ peso_min: prev === 0 ? 0 : prev + 0.01, peso_max: max })
    prev = max
  }
  bands.push({ peso_min: prev + 0.01, peso_max: 999 })
  return bands
}

function labelPeso(b) {
  return b.peso_max >= 999
    ? `+${Math.floor(b.peso_min - 0.01)}kg`
    : `-${Math.floor(b.peso_max)}kg`
}

function kyorugiNivelDivision(grupo, nivel, grado_rango, edadMin, edadMax, bands, genero, ordenStart) {
  const out = []
  let orden = ordenStart
  const division = `${grupo.division} · ${nivel}`
  for (const b of bands) {
    const peso = labelPeso(b)
    const sufijo = genero === 'M' ? ' M' : genero === 'F' ? ' F' : ''
    out.push({
      nombre: `${division}${sufijo} ${peso}`.trim(),
      genero: genero || 'X',
      edad_min: edadMin,
      edad_max: edadMax,
      peso_min: b.peso_min,
      peso_max: b.peso_max,
      modalidad: 'kyorugi',
      division,
      grado_rango,
      orden: orden++,
    })
  }
  return out
}

function buildKyorugiFestcup() {
  const cats = []
  let orden = 1
  for (const div of KYORUGI_DIVISIONES) {
    for (const { nivel, grado_rango } of KYORUGI_NIVELES) {
      cats.push(
        ...kyorugiNivelDivision(
          div,
          nivel,
          grado_rango,
          div.edadMin,
          div.edadMax,
          bandasPeso(div.pesosM),
          'M',
          orden,
        ),
        ...kyorugiNivelDivision(
          div,
          nivel,
          grado_rango,
          div.edadMin,
          div.edadMax,
          bandasPeso(div.pesosF),
          'F',
          orden,
        ),
      )
      orden = cats.length + 1
    }
  }
  return cats
}

function buildPoomsaeReconocido() {
  const out = []
  let orden = 1
  for (const { division, edadMin, edadMax, anioDesde, anioHasta } of POOMSAE_DIVISIONES) {
    for (const form of POOMSAE_RECONOCIDO) {
      const grado = kupRango(form.kupMin, form.kupMax)
      const base = `Poomsae ${form.label} · ${division}`
      out.push(
        {
          nombre: `${base} · M`,
          genero: 'M',
          edad_min: edadMin,
          edad_max: edadMax,
          anio_nacimiento_desde: anioDesde,
          anio_nacimiento_hasta: anioHasta,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Reconocido · ${division}`,
          grado_rango: grado,
          orden: orden++,
        },
        {
          nombre: `${base} · F`,
          genero: 'F',
          edad_min: edadMin,
          edad_max: edadMax,
          anio_nacimiento_desde: anioDesde,
          anio_nacimiento_hasta: anioHasta,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Reconocido · ${division}`,
          grado_rango: grado,
          orden: orden++,
        },
      )
    }
  }
  return out
}

function buildPoomsaeDan() {
  const out = []
  let orden = 1
  for (const { division, edadMin, edadMax, anioDesde, anioHasta } of POOMSAE_DIVISIONES) {
    for (const form of POOMSAE_DAN) {
      const base = `Poomsae ${form.label} · ${division}`
      out.push(
        {
          nombre: `${base} · M`,
          genero: 'M',
          edad_min: edadMin,
          edad_max: edadMax,
          anio_nacimiento_desde: anioDesde,
          anio_nacimiento_hasta: anioHasta,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Dan · ${division}`,
          grado_rango: `dan:${form.dan}`,
          orden: orden++,
        },
        {
          nombre: `${base} · F`,
          genero: 'F',
          edad_min: edadMin,
          edad_max: edadMax,
          anio_nacimiento_desde: anioDesde,
          anio_nacimiento_hasta: anioHasta,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Dan · ${division}`,
          grado_rango: `dan:${form.dan}`,
          orden: orden++,
        },
      )
    }
  }
  return out
}

function buildCategoriasWT() {
  return [...buildKyorugiFestcup(), ...buildPoomsaeReconocido(), ...buildPoomsaeDan()]
}

export const CATEGORIAS_WT = buildCategoriasWT()

export { TARIFAS_FDPTKD_DEFAULT as TARIFAS_CAMPEONATO }

export function generarSlugUnico(nombre, fechaInicio) {
  const base = slugify(nombre)
  const anio = fechaInicio ? String(fechaInicio).slice(0, 4) : ''
  return anio ? `${base}-${anio}` : base
}

/**
 * @param {object} sb
 * @param {number} idCampeonato
 * @param {Array<{ modalidad: string, precio_regular: number, precio_tardia: number }>|null} tarifasCustom
 */
export async function sembrarCampeonatoCompleto(sb, idCampeonato, tarifasCustom = null) {
  const categorias = CATEGORIAS_WT.map((c) => ({ ...c, id_campeonato: idCampeonato }))
  const { error: errCat } = await sb.from('categoria_campeonato').insert(categorias)
  if (errCat) throw errCat

  const { count: numTarifas } = await sb
    .from('campeonato_tarifa')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)

  if ((numTarifas || 0) === 0) {
    const base = Array.isArray(tarifasCustom) && tarifasCustom.length
      ? fusionarTarifas(tarifasCustom)
      : TARIFAS_FDPTKD_DEFAULT
    const tarifas = base.map((t) => ({
      modalidad: t.modalidad,
      precio_regular: Number(t.precio_regular) || 0,
      precio_tardia: Number(t.precio_tardia) || 0,
      id_campeonato: idCampeonato,
      activo: true,
    }))
    const { error: errTar } = await sb.from('campeonato_tarifa').insert(tarifas)
    if (errTar) throw errTar
  } else {
    await asegurarTarifasCampeonato(sb, idCampeonato)
  }
}

function fusionarTarifas(custom) {
  const byMod = new Map((custom || []).map((t) => [t.modalidad, t]))
  return TARIFAS_FDPTKD_DEFAULT.map((def) => {
    const c = byMod.get(def.modalidad)
    if (!c) return { ...def }
    return {
      modalidad: def.modalidad,
      precio_regular: Number(c.precio_regular) >= 0 ? Number(c.precio_regular) : def.precio_regular,
      precio_tardia: Number(c.precio_tardia) >= 0 ? Number(c.precio_tardia) : def.precio_tardia,
    }
  })
}

/** Actualiza precios de tarifas existentes (no crea modalidades nuevas). */
export async function actualizarTarifasCampeonato(sb, idCampeonato, tarifas) {
  if (!Array.isArray(tarifas) || !tarifas.length) return 0
  let n = 0
  for (const t of tarifas) {
    if (!t?.modalidad) continue
    const { error } = await sb
      .from('campeonato_tarifa')
      .update({
        precio_regular: Number(t.precio_regular) || 0,
        precio_tardia: Number(t.precio_tardia) || 0,
      })
      .eq('id_campeonato', idCampeonato)
      .eq('modalidad', t.modalidad)
    if (error) throw error
    n += 1
  }
  return n
}

/** Inserta tarifas faltantes (p. ej. festival en campeonatos creados antes de ampliar el catálogo) */
export async function asegurarTarifasCampeonato(sb, idCampeonato) {
  const { data: existentes, error } = await sb
    .from('campeonato_tarifa')
    .select('modalidad')
    .eq('id_campeonato', idCampeonato)
    .eq('activo', true)
  if (error) throw error

  const have = new Set((existentes || []).map((t) => t.modalidad))
  const faltantes = TARIFAS_FDPTKD_DEFAULT.filter((t) => !have.has(t.modalidad))
  if (!faltantes.length) return 0

  const { error: errIns } = await sb.from('campeonato_tarifa').insert(
    faltantes.map((t) => ({ ...t, id_campeonato: idCampeonato, activo: true })),
  )
  if (errIns) throw errIns
  return faltantes.length
}

/** Detecta catálogo viejo (unisex infantil / sin M-F / sin dan) */
export async function catalogoNecesitaReseed(sb, idCampeonato) {
  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)

  if ((count || 0) < MIN_CATEGORIAS_CATALOGO) return true

  const { data: festcup } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .ilike('nombre', '%· Festival %')
    .limit(1)

  if (!festcup?.length) return true

  const { data: dan } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .ilike('nombre', 'Poomsae Koryo%')
    .limit(1)

  if (!dan?.length) return true

  // v5 tenía Infantil/Pre Cadete unisex (genero X) — v6 exige M/F
  const { data: unisex } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .eq('genero', 'X')
    .limit(1)

  if (unisex?.length) return true

  // v7: Juvenil M incluye +78 (foto oficial FestCup 2026)
  const { data: juv78 } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .ilike('nombre', '%Juvenil%+78kg%')
    .limit(1)

  if (!juv78?.length) return true

  // v7: Master 4 desde 65 inclusive (antes edad_min 66)
  const { data: m4viejo } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'poomsae')
    .ilike('nombre', '%Master 4%')
    .eq('edad_min', 66)
    .limit(1)

  return Boolean(m4viejo?.length)
}

/**
 * Convierte categorías kyorugi unisex (genero X) en M/F y reasigna inscripciones por sexo.
 * No borra el catálogo completo (seguro con plantel ya cargado).
 */
export async function migrarKyorugiUnisexAMF(sb, idCampeonato) {
  const { data: xcats, error } = await sb
    .from('categoria_campeonato')
    .select('*')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .eq('genero', 'X')
  if (error) throw error
  if (!xcats?.length) {
    const { count } = await sb
      .from('categoria_campeonato')
      .select('*', { count: 'exact', head: true })
      .eq('id_campeonato', idCampeonato)
    return count || 0
  }

  const toInsert = []
  for (const cat of xcats) {
    for (const genero of ['M', 'F']) {
      const sufijo = genero === 'M' ? ' M' : ' F'
      const nombre = String(cat.nombre || '').replace(/ ([-+]\d+kg)$/i, `${sufijo} $1`)
      toInsert.push({
        id_campeonato: idCampeonato,
        nombre,
        genero,
        edad_min: cat.edad_min,
        edad_max: cat.edad_max,
        peso_min: cat.peso_min,
        peso_max: cat.peso_max,
        modalidad: cat.modalidad,
        division: cat.division,
        grado_rango: cat.grado_rango,
        orden: cat.orden,
        anio_nacimiento_desde: cat.anio_nacimiento_desde ?? null,
        anio_nacimiento_hasta: cat.anio_nacimiento_hasta ?? null,
      })
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    const { error: errIns } = await sb.from('categoria_campeonato').insert(toInsert.slice(i, i + 100))
    if (errIns) throw errIns
  }

  const { data: nuevas, error: errN } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, genero, division, peso_min, peso_max, grado_rango')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .in('genero', ['M', 'F'])
  if (errN) throw errN

  const destKey = (c, genero) =>
    `${genero}|${c.division}|${c.peso_min}|${c.peso_max}|${c.grado_rango}`
  const destMap = new Map((nuevas || []).map((c) => [destKey(c, c.genero), c.id_categoria]))

  const { data: lineas, error: errL } = await sb
    .from('linea_inscripcion')
    .select(`
      id_linea, id_categoria,
      miembros:linea_inscripcion_miembro(perfil:competidor_perfil(sexo)),
      categoria:categoria_campeonato(genero, division, peso_min, peso_max, grado_rango)
    `)
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .neq('estado', 'anulado')
  if (errL) throw errL

  for (const l of lineas || []) {
    if (l.categoria?.genero !== 'X') continue
    const sexo = l.miembros?.[0]?.perfil?.sexo
    if (sexo !== 'M' && sexo !== 'F') continue
    const idDest = destMap.get(destKey(l.categoria, sexo))
    if (!idDest) continue
    const { error: errU } = await sb
      .from('linea_inscripcion')
      .update({ id_categoria: idDest, updated_at: new Date().toISOString() })
      .eq('id_linea', l.id_linea)
    if (errU) throw errU
  }

  const idsX = xcats.map((c) => c.id_categoria)
  for (let i = 0; i < idsX.length; i += 50) {
    const { error: errDel } = await sb
      .from('categoria_campeonato')
      .delete()
      .in('id_categoria', idsX.slice(i, i + 50))
    if (errDel) throw errDel
  }

  await sb
    .from('campeonato')
    .update({ bases_version: String(CATALOG_VERSION) })
    .eq('id_campeonato', idCampeonato)

  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)
  return count || 0
}

export async function resincronizarCatalogo(sb, idCampeonato) {
  const { count: lineasActivas } = await sb
    .from('linea_inscripcion')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)
    .neq('estado', 'anulado')

  // Con plantel cargado: no borrar catálogo; migrar unisex → M/F si aplica
  if ((lineasActivas || 0) > 0) {
    return migrarKyorugiUnisexAMF(sb, idCampeonato)
  }

  await sb.from('categoria_campeonato').delete().eq('id_campeonato', idCampeonato)
  await sembrarCampeonatoCompleto(sb, idCampeonato)
  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)
  return count || 0
}

export const MIN_CATEGORIAS_CATALOGO = 635
