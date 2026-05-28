import { TARIFAS_FDPTKD_DEFAULT } from '@/lib/campeonato/constants'
import { slugify } from '@/lib/campeonato/constants'

/** Versión del catálogo — incrementar al cambiar categorías */
export const CATALOG_VERSION = 4

/** Rangos de kup por subdivisión kyorugi (10 = blanco, 1 = rojo) · FDPTKD */
const KUP_SUB = {
  'Infantil A': 'kup:1-8',
  'Infantil B': 'kup:9-9',
  'Infantil C': 'kup:10-10',
  'Pre-cadete E': 'kup:1-6',
  'Pre-cadete F': 'kup:7-8',
  'Pre-cadete G': 'kup:9-9',
  'Pre-cadete H': 'kup:10-10',
  'Pre-cadete A': 'kup:1-3',
  'Pre-cadete B': 'kup:4-5',
  'Pre-cadete C': 'kup:6-7',
  'Pre-cadete D': 'kup:8-10',
  'Cadete A': 'kup:1-3',
  'Cadete B': 'kup:4-5',
  'Cadete C': 'kup:6-7',
  'Cadete D': 'kup:8-10',
  'Juvenil A': 'kup:1-3',
  'Juvenil B': 'kup:4-5',
  'Juvenil C': 'kup:6-7',
  'Juvenil D': 'kup:8-10',
  'Senior A': 'kup:1-3',
  'Senior B': 'kup:4-5',
  'Senior C': 'kup:6-7',
  'Senior D': 'kup:8-10',
}

/** Poomsae reconocido · cintas de color (FDPTKD pág. 11–12) */
const POOMSAE_CINTAS_EDAD = [
  { division: 'Infantil A', edadMin: 6, edadMax: 7 },
  { division: 'Infantil B', edadMin: 8, edadMax: 9 },
  { division: 'Pre-cadete', edadMin: 10, edadMax: 11 },
  { division: 'Cadete', edadMin: 12, edadMax: 14 },
  { division: 'Juvenil', edadMin: 15, edadMax: 17 },
  { division: 'Senior I', edadMin: 18, edadMax: 30 },
  { division: 'Senior II', edadMin: 31, edadMax: 40 },
  { division: 'Master I', edadMin: 41, edadMax: 50 },
  { division: 'Master II', edadMin: 51, edadMax: 60 },
  { division: 'Master III', edadMin: 61, edadMax: 65 },
  { division: 'Master IV', edadMin: 66, edadMax: 99 },
]

/** Poomsae reconocido · ranking G3 (FDPTKD pág. 10) */
const POOMSAE_RANKING_EDAD = [
  { division: 'Pre-cadete', edadMin: 9, edadMax: 10 },
  { division: 'Cadete', edadMin: 11, edadMax: 13 },
  { division: 'Junior', edadMin: 14, edadMax: 16 },
  { division: 'Senior I', edadMin: 17, edadMax: 29 },
  { division: 'Senior II', edadMin: 30, edadMax: 39 },
  { division: 'Master I', edadMin: 40, edadMax: 49 },
  { division: 'Master II', edadMin: 50, edadMax: 59 },
  { division: 'Master III', edadMin: 60, edadMax: 64 },
  { division: 'Master IV', edadMin: 65, edadMax: 99 },
]

/** Poomsae por cinturón (kup 10 = blanco) */
const POOMSAE_FORMS = [
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

function kyorugiUnisex(grupo, edadMin, edadMax, letras, limites, ordenStart) {
  const bands = bandasPeso(limites)
  const out = []
  let orden = ordenStart
  for (const letra of letras) {
    const division = `${grupo} ${letra}`
    for (const b of bands) {
      const label = b.peso_max >= 999
        ? `+${Math.floor(b.peso_min - 0.01)}kg`
        : `-${Math.floor(b.peso_max)}kg`
      out.push({
        nombre: `${division} ${label}`,
        genero: 'X',
        edad_min: edadMin,
        edad_max: edadMax,
        peso_min: b.peso_min,
        peso_max: b.peso_max,
        modalidad: 'kyorugi',
        division,
        grado_rango: KUP_SUB[division],
        orden: orden++,
      })
    }
  }
  return out
}

function kyorugiMH(grupo, edadMin, edadMax, letras, limitesM, limitesF, ordenStart) {
  const out = []
  let orden = ordenStart
  for (const letra of letras) {
    const division = `${grupo} ${letra}`
    const grado = KUP_SUB[division]
    for (const b of bandasPeso(limitesM)) {
      const label = b.peso_max >= 999
        ? `+${Math.floor(b.peso_min - 0.01)}kg`
        : `-${Math.floor(b.peso_max)}kg`
      out.push({
        nombre: `${division} M ${label}`,
        genero: 'M',
        edad_min: edadMin,
        edad_max: edadMax,
        peso_min: b.peso_min,
        peso_max: b.peso_max,
        modalidad: 'kyorugi',
        division,
        grado_rango: grado,
        orden: orden++,
      })
    }
    for (const b of bandasPeso(limitesF)) {
      const label = b.peso_max >= 999
        ? `+${Math.floor(b.peso_min - 0.01)}kg`
        : `-${Math.floor(b.peso_max)}kg`
      out.push({
        nombre: `${division} F ${label}`,
        genero: 'F',
        edad_min: edadMin,
        edad_max: edadMax,
        peso_min: b.peso_min,
        peso_max: b.peso_max,
        modalidad: 'kyorugi',
        division,
        grado_rango: grado,
        orden: orden++,
      })
    }
  }
  return out
}

/** Poomsae cintas: forma + división edad + M/F (sin A/B/C/D kyorugi) */
function poomsaeCintasColor(ordenStart) {
  const out = []
  let orden = ordenStart
  for (const { division, edadMin, edadMax } of POOMSAE_CINTAS_EDAD) {
    for (const form of POOMSAE_FORMS) {
      const grado = kupRango(form.kupMin, form.kupMax)
      const base = `Poomsae ${form.label} · ${division}`
      out.push(
        {
          nombre: `${base} · M`,
          genero: 'M',
          edad_min: edadMin,
          edad_max: edadMax,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Cintas · ${division}`,
          grado_rango: grado,
          orden: orden++,
        },
        {
          nombre: `${base} · F`,
          genero: 'F',
          edad_min: edadMin,
          edad_max: edadMax,
          peso_min: null,
          peso_max: null,
          modalidad: 'poomsae',
          division: `Cintas · ${division}`,
          grado_rango: grado,
          orden: orden++,
        },
      )
    }
  }
  return out
}

/** Poomsae ranking G3: división edad + M/F · VS (1er kup y danes) */
function poomsaeRankingG3(ordenStart) {
  const out = []
  let orden = ordenStart
  for (const { division, edadMin, edadMax } of POOMSAE_RANKING_EDAD) {
    const base = `Poomsae Ranking · ${division}`
    out.push(
      {
        nombre: `${base} · M`,
        genero: 'M',
        edad_min: edadMin,
        edad_max: edadMax,
        peso_min: null,
        peso_max: null,
        modalidad: 'poomsae',
        division: `Ranking · ${division}`,
        grado_rango: 'ranking',
        orden: orden++,
      },
      {
        nombre: `${base} · F`,
        genero: 'F',
        edad_min: edadMin,
        edad_max: edadMax,
        peso_min: null,
        peso_max: null,
        modalidad: 'poomsae',
        division: `Ranking · ${division}`,
        grado_rango: 'ranking',
        orden: orden++,
      },
    )
  }
  return out
}

function buildCategoriasWT() {
  let orden = 1
  const cats = []

  // ── Kyorugi · FDPTKD (subdivisión A/B/C/D por cinturón) ───────────
  cats.push(...kyorugiUnisex('Infantil', 6, 7, ['A', 'B', 'C'], [22, 25, 28, 31, 34, 37, 40], orden))
  orden = cats.length + 1

  cats.push(...kyorugiUnisex('Pre-cadete', 8, 9, ['E', 'F', 'G', 'H'], [24, 27, 30, 33, 36, 39, 42, 46, 50], orden))
  orden = cats.length + 1

  cats.push(...kyorugiUnisex('Pre-cadete', 10, 11, ['A', 'B', 'C', 'D'], [24, 27, 30, 33, 36, 40, 44, 48, 52, 57], orden))
  orden = cats.length + 1

  const cadM = [33, 37, 41, 45, 49, 53, 57, 61, 65]
  const cadF = [29, 33, 37, 41, 44, 47, 51, 55, 59]
  cats.push(...kyorugiMH('Cadete', 12, 14, ['A', 'B', 'C', 'D'], cadM, cadF, orden))
  orden = cats.length + 1

  const juvM = [45, 48, 51, 55, 59, 63, 68, 73]
  const juvF = [42, 44, 46, 49, 53, 57, 62]
  cats.push(...kyorugiMH('Juvenil', 15, 17, ['A', 'B', 'C', 'D'], juvM, juvF, orden))
  orden = cats.length + 1

  const senM = [54, 58, 63, 68, 74, 80]
  const senF = [46, 49, 53, 57, 62, 67]
  cats.push(...kyorugiMH('Senior', 18, 99, ['A', 'B', 'C', 'D'], senM, senF, orden))
  orden = cats.length + 1

  // ── Poomsae · FDPTKD (edad + forma; ranking aparte) ──────────────
  cats.push(...poomsaeCintasColor(orden))
  orden = cats.length + 1

  cats.push(...poomsaeRankingG3(orden))

  return cats
}

export const CATEGORIAS_WT = buildCategoriasWT()

export { TARIFAS_FDPTKD_DEFAULT as TARIFAS_CAMPEONATO }

export function generarSlugUnico(nombre, fechaInicio) {
  const base = slugify(nombre)
  const anio = fechaInicio ? String(fechaInicio).slice(0, 4) : ''
  return anio ? `${base}-${anio}` : base
}

export async function sembrarCampeonatoCompleto(sb, idCampeonato) {
  const categorias = CATEGORIAS_WT.map((c) => ({ ...c, id_campeonato: idCampeonato }))
  const { error: errCat } = await sb.from('categoria_campeonato').insert(categorias)
  if (errCat) throw errCat

  const { count: numTarifas } = await sb
    .from('campeonato_tarifa')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)

  if ((numTarifas || 0) === 0) {
    const tarifas = TARIFAS_FDPTKD_DEFAULT.map((t) => ({
      ...t,
      id_campeonato: idCampeonato,
      activo: true,
    }))
    const { error: errTar } = await sb.from('campeonato_tarifa').insert(tarifas)
    if (errTar) throw errTar
  }
}

/** Detecta catálogo viejo (poomsae con subdivisión kyorugi o pocas filas) */
export async function catalogoNecesitaReseed(sb, idCampeonato) {
  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)

  if ((count || 0) < MIN_CATEGORIAS_CATALOGO) return true

  const { data: infantil } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .ilike('nombre', 'Infantil A%')
    .limit(1)

  if (!infantil?.length) return true

  const { data: poomsaeCadeteB } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .ilike('nombre', 'Poomsae Cadete B%')
    .limit(1)

  if (poomsaeCadeteB?.length) return true

  const { data: poomsaeOk } = await sb
    .from('categoria_campeonato')
    .select('id_categoria')
    .eq('id_campeonato', idCampeonato)
    .ilike('nombre', 'Poomsae Il Jang · Cadete%')
    .limit(1)

  return !poomsaeOk?.length
}

export async function resincronizarCatalogo(sb, idCampeonato) {
  await sb.from('categoria_campeonato').delete().eq('id_campeonato', idCampeonato)
  await sembrarCampeonatoCompleto(sb, idCampeonato)
  const { count } = await sb
    .from('categoria_campeonato')
    .select('*', { count: 'exact', head: true })
    .eq('id_campeonato', idCampeonato)
  return count || 0
}

export const MIN_CATEGORIAS_CATALOGO = 480
