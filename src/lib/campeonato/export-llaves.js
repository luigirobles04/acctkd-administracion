import { fetchCombatesCampeonato, RONDA_LABEL } from '@/lib/campeonato/canchas-data'
import { combatesPeleables } from '@/lib/campeonato/schedule-canchas'

function labelCompetidor(c) {
  if (!c) return '—'
  const n = c.nombres || ''
  return c.dorsal ? `${c.dorsal} · ${n}`.trim() : n || '—'
}

function labelGanador(combate) {
  if (!combate?.ganador_id_linea) return ''
  if (combate.ganador_id_linea === combate.id_linea1) return labelCompetidor(combate.competidor1)
  if (combate.ganador_id_linea === combate.id_linea2) return labelCompetidor(combate.competidor2)
  return ''
}

function combateExportable(c) {
  return c && !['vacío', 'bye'].includes(c.estado)
}

function combateBracketExport(c) {
  return c && !['vacío', 'bye'].includes(c.estado)
}

function compararCategoria(a, b) {
  const oa = a.orden ?? 9999
  const ob = b.orden ?? 9999
  if (oa !== ob) return oa - ob
  return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true })
}

/**
 * Numeración continua por área en bloques de categoría:
 * Cat A: 1..N, Cat B: N+1.., sin huecos (final incluida al final de cada bloque).
 */
function buildOrdenBloquesPorCancha(categorias, porCat, canchaPorCat) {
  const map = {}
  for (const cancha of [1, 2, 3]) {
    const catsEnCancha = categorias
      .filter((c) => Number(canchaPorCat[c.id_categoria]) === cancha)
      .sort(compararCategoria)
    let orden = 1
    for (const cat of catsEnCancha) {
      for (const c of combatesPeleables(porCat[cat.id_categoria])) {
        map[c.id_llave] = orden++
      }
    }
  }
  return map
}

/** Agrupa combates por categoría con metadata para export */
export async function buildExportLlaves(sb, idCampeonato) {
  const { data: campeonato } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, ciudad, lugar, fecha_inicio')
    .eq('id_campeonato', idCampeonato)
    .single()

  const { data: categorias } = await sb
    .from('categoria_campeonato')
    .select('id_categoria, nombre, genero, division, orden')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi')
    .order('orden', { ascending: true })

  const { data: inscripciones } = await sb
    .from('linea_inscripcion')
    .select('id_categoria, id_linea')
    .eq('id_campeonato', idCampeonato)
    .eq('modalidad', 'kyorugi_individual')
    .eq('estado', 'aprobado')
    .not('dorsal_numero', 'is', null)

  const inscritosPorCat = (inscripciones || []).reduce((acc, l) => {
    if (l.id_categoria) acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1
    return acc
  }, {})

  const { combates: todosCombates, porCancha } = await fetchCombatesCampeonato(sb, idCampeonato, {
    incluirSaltados: true,
  })

  const porCat = (todosCombates || []).reduce((acc, c) => {
    if (!acc[c.id_categoria]) acc[c.id_categoria] = []
    acc[c.id_categoria].push(c)
    return acc
  }, {})

  const canchaPorCat = {}
  for (const [cancha, lista] of Object.entries(porCancha || {})) {
    for (const c of lista) {
      if (!canchaPorCat[c.id_categoria]) canchaPorCat[c.id_categoria] = Number(cancha)
    }
  }

  const ordenBloquesPorLlave = buildOrdenBloquesPorCancha(categorias || [], porCat, canchaPorCat)

  function conOrdenBloque(c) {
    const n = ordenBloquesPorLlave[c.id_llave]
    return n != null ? { ...c, orden_pista: n } : c
  }

  const categoriasExport = (categorias || []).map((cat) => {
    const rawCat = porCat[cat.id_categoria] || []

    function enrichCombate(c) {
      return conOrdenBloque(c)
    }

    const combates = rawCat.filter(combateExportable).map(enrichCombate)
    const porRonda = rawCat
      .filter(combateBracketExport)
      .map(enrichCombate)
      .reduce((acc, c) => {
        if (!acc[c.ronda]) acc[c.ronda] = []
        acc[c.ronda].push(c)
        return acc
      }, {})

    for (const r of Object.keys(porRonda)) {
      porRonda[r].sort((a, b) => a.match_numero - b.match_numero)
    }

    const filasCombates = combates
      .sort((a, b) => {
        if ((a.orden_pista || 9999) !== (b.orden_pista || 9999)) {
          return (a.orden_pista || 9999) - (b.orden_pista || 9999)
        }
        if (b.ronda !== a.ronda) return b.ronda - a.ronda
        return a.match_numero - b.match_numero
      })
      .map((c) => ({
        ronda: c.ronda,
        rondaLabel: c.rondaLabel || RONDA_LABEL[c.ronda] || `Ronda ${c.ronda}`,
        match_numero: c.match_numero,
        numero_combate: c.orden_pista || '',
        chung: labelCompetidor(c.competidor1),
        hong: labelCompetidor(c.competidor2),
        academia_chung: c.competidor1?.academia || '',
        academia_hong: c.competidor2?.academia || '',
        cancha: c.cancha || '',
        estado: c.estado,
        ganador: labelGanador(c),
      }))

    return {
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      orden: cat.orden,
      division: cat.division,
      genero: cat.genero,
      inscritos: inscritosPorCat[cat.id_categoria] || 0,
      combates: combates.length,
      cancha: canchaPorCat[cat.id_categoria] || '',
      tiene_llave: combates.length > 0,
      porRonda,
      filasCombates,
    }
  })

  const resumen = categoriasExport.map((c) => ({
    categoria: c.nombre,
    division: c.division || '',
    genero: c.genero || '',
    inscritos: c.inscritos,
    combates: c.combates,
    cancha: c.cancha ? `Área ${c.cancha}` : '—',
    llave: c.tiene_llave ? 'Sí' : 'No',
  }))

  const totales = {
    categorias: categoriasExport.length,
    con_llave: categoriasExport.filter((c) => c.tiene_llave).length,
    competidores: Object.values(inscritosPorCat).reduce((a, b) => a + b, 0),
    combates: categoriasExport.reduce((a, c) => a + c.combates, 0),
  }

  return { campeonato, resumen, categorias: categoriasExport, totales }
}

export function nombreHojaExcel(nombre, max = 28) {
  return (nombre || 'Categoria')
    .replace(/[\\/?*[\]:]/g, '')
    .slice(0, max)
}
