import { fetchCombatesCampeonato, RONDA_LABEL } from '@/lib/campeonato/canchas-data'
import { etiquetaOrdenPista } from '@/lib/campeonato/orden-llave'
import { buildMapInscritosResueltos } from '@/lib/campeonato/inscripciones-resueltas'
import { campeonatoLlavesSinPesaje, conteosKyorugiLlave } from '@/lib/campeonato/llaves-kyorugi'

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

/** Agrupa combates por categoría con metadata para export */
export async function buildExportLlaves(sb, idCampeonato) {
  const { data: campeonato } = await sb
    .from('campeonato')
    .select('id_campeonato, nombre, slug, ciudad, lugar, fecha_inicio, llaves_sin_pesaje')
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

  const inscritosPorCatRaw = (inscripciones || []).reduce((acc, l) => {
    if (l.id_categoria) acc[l.id_categoria] = (acc[l.id_categoria] || 0) + 1
    return acc
  }, {})

  /** Misma regla que `generarLlaveCategoria`: aptos para llave (pesaje OK o llaves_sin_pesaje). */
  const omitirPesaje = await campeonatoLlavesSinPesaje(sb, idCampeonato)
  const { aptosPorCat: aptosLlavePorCatRaw } = await conteosKyorugiLlave(sb, idCampeonato, omitirPesaje)
  /** Con consolidación / ops: mismo criterio que generar llave (todos con dorsal cuentan). */
  const sinPesajeLlaves = Boolean(campeonato?.llaves_sin_pesaje)

  const { combates: todosCombates, porCancha } = await fetchCombatesCampeonato(sb, idCampeonato, {
    incluirSaltados: true,
  })

  const porCat = (todosCombates || []).reduce((acc, c) => {
    if (!acc[c.id_categoria]) acc[c.id_categoria] = []
    acc[c.id_categoria].push(c)
    return acc
  }, {})

  const inscritosResueltosDesdeLlave = buildMapInscritosResueltos(categorias || [], inscritosPorCatRaw, porCat)
  const inscritosPorCat = {
    ...inscritosPorCatRaw,
    ...inscritosResueltosDesdeLlave,
  }

  /** PDF / Excel: usar cancha y orden_pista **de la BD** (tras asignación manual o `asignarCanchasCampeonato`). */
  function conEtiquetaPista(c) {
    const ch = Number(c.cancha) || null
    const op = c.orden_pista
    const etiqueta = etiquetaOrdenPista(ch, op)
    return { ...c, etiqueta_pista: etiqueta || String(op ?? '') }
  }

  const categoriasExport = (categorias || []).map((cat) => {
    const rawCat = porCat[cat.id_categoria] || []
    const combRowCancha = rawCat.find((x) => x.cancha != null && x.cancha !== '')
    const canchaCategoria = combRowCancha ? Number(combRowCancha.cancha) : ''

    function enrichCombate(c) {
      return conEtiquetaPista(c)
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
        numero_combate: c.etiqueta_pista || etiquetaOrdenPista(Number(c.cancha), c.orden_pista) || String(c.orden_pista || ''),
        chung: labelCompetidor(c.competidor1),
        hong: labelCompetidor(c.competidor2),
        academia_chung: c.competidor1?.academia || '',
        academia_hong: c.competidor2?.academia || '',
        cancha: c.cancha || '',
        estado: c.estado,
        ganador: labelGanador(c),
      }))

    const idCat = cat.id_categoria
    /** Solo aprobados con dorsal en BD (sin inferir desde llave). */
    const conDorsal = inscritosPorCatRaw[idCat] ?? 0
    const aptosLlaveDb = aptosLlavePorCatRaw[idCat] ?? 0
    /** Sin exigir pesaje: export y PDF usan solo “con dorsal” (alineado a llave regenerada). */
    const aptosLlave = sinPesajeLlaves ? conDorsal : aptosLlaveDb
    /** Número principal: aptos para llave; si el campeonato no exige pesaje, aptos = dorsales. */
    const inscritos = aptosLlave > 0 ? aptosLlave : conDorsal

    return {
      id_categoria: cat.id_categoria,
      nombre: cat.nombre,
      orden: cat.orden,
      division: cat.division,
      genero: cat.genero,
      inscritos,
      /** Con pesaje obligatorio: puede ser mayor que aptos si falta pesar. Con llaves_sin_pesaje: igual a inscritos. */
      inscritos_con_dorsal: conDorsal,
      aptos_llave: aptosLlave,
      combates: combates.length,
      cancha: canchaCategoria,
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
    inscritos_con_dorsal: c.inscritos_con_dorsal,
    combates: c.combates,
    cancha: c.cancha ? `Área ${c.cancha}` : '—',
    llave: c.tiene_llave ? 'Sí' : 'No',
  }))

  const totales = {
    categorias: categoriasExport.length,
    con_llave: categoriasExport.filter((c) => c.tiene_llave).length,
    competidores: Object.values(inscritosPorCatRaw).reduce((a, b) => a + b, 0),
    combates: categoriasExport.reduce((a, c) => a + c.combates, 0),
  }

  return {
    campeonato,
    resumen,
    categorias: categoriasExport,
    totales,
    inscritosPorCat,
    aptosLlavePorCat: aptosLlavePorCatRaw,
    inscritosConDorsalPorCat: inscritosPorCatRaw,
    llaves_sin_pesaje: sinPesajeLlaves,
  }
}

export function nombreHojaExcel(nombre, max = 28) {
  return (nombre || 'Categoria')
    .replace(/[\\/?*[\]:]/g, '')
    .slice(0, max)
}
