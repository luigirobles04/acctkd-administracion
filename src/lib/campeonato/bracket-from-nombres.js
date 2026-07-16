/** ACBRACKET 1.0 — datos de llaves Kyorugi desde listas de nombres. */

import { buildSlotsCnu } from '@/lib/campeonato/llaves-kyorugi'
import { colorByeEnBloque } from '@/lib/campeonato/bracket-export'
import { asignarOrdenPistaPorCancha } from '@/lib/campeonato/schedule-canchas'

function playerFromNombre(nombre, id) {
  return {
    id,
    id_linea: id,
    nombres: String(nombre).trim(),
    academia: '',
  }
}

/**
 * @param {string[]} nombres — competidores reales (2–32)
 * @returns {Record<number, object[]>} porRonda para export-bracket-pdf
 */
export function buildPorRondaFromNombres(nombres) {
  const nPlayers = nombres.length
  if (nPlayers < 2) throw new Error('Se necesitan al menos 2 competidores')

  const bracketSize = 2 ** Math.ceil(Math.log2(nPlayers))
  const maxR = Math.log2(bracketSize)
  const byId = Object.fromEntries(nombres.map((nombre, i) => [i + 1, playerFromNombre(nombre, i + 1)]))
  const seeds = [null, ...nombres.map((_, i) => byId[i + 1])]
  const slots = buildSlotsCnu(seeds, nPlayers)
  const porRonda = {}
  let ord = 1

  for (let r = maxR; r >= 1; r--) {
    const count = 2 ** (r - 1)
    porRonda[r] = []
    for (let m = 1; m <= count; m++) {
      let id_linea1 = null
      let id_linea2 = null
      let es_bye = false
      let estado = 'pendiente'

      if (r === maxR) {
        const p1 = slots[(m - 1) * 2]
        const p2 = slots[(m - 1) * 2 + 1]
        id_linea1 = p1?.id_linea || null
        id_linea2 = p2?.id_linea || null
        if (p1 && !p2) {
          es_bye = true
          estado = 'saltado'
        } else if (!p1 && p2) {
          es_bye = true
          id_linea1 = p2.id_linea
          id_linea2 = null
          estado = 'saltado'
        } else if (!p1 && !p2) {
          estado = 'vacío'
        }
      }

      const c1 = id_linea1 ? byId[id_linea1] : null
      const c2 = id_linea2 ? byId[id_linea2] : null

      porRonda[r].push({
        ronda: r,
        match_numero: m,
        orden_pista: estado === 'vacío' || es_bye ? 0 : ord++,
        estado,
        es_bye,
        competidor1: c1
          ? {
              id_linea: c1.id_linea,
              nombres: c1.nombres,
              academia: c1.academia,
              color: es_bye ? colorByeEnBloque(m) : 'azul',
            }
          : null,
        competidor2: c2
          ? {
              id_linea: c2.id_linea,
              nombres: c2.nombres,
              academia: c2.academia,
              color: 'rojo',
            }
          : null,
        color1: es_bye ? colorByeEnBloque(m) : 'azul',
        color2: c2 ? 'rojo' : null,
      })
    }
  }

  return porRonda
}

/**
 * @param {{ nombre: string, nombres: string[], cancha?: number, orden?: number }[]} categorias
 */
export function buildExportDataFromNombres(categorias, { campeonatoNombre = 'Llaves Kyorugi', fecha = '2026-08-15', canchaDefault = 1 } = {}) {
  const categoriasExport = categorias.map((cat, idx) => {
    const nombres = cat.nombres.map((n) => String(n).trim()).filter(Boolean)
    return {
      id_categoria: idx + 1,
      nombre: cat.nombre,
      orden: cat.orden ?? idx + 1,
      cancha: cat.cancha ?? canchaDefault,
      inscritos: nombres.length,
      tiene_llave: true,
      porRonda: buildPorRondaFromNombres(nombres),
    }
  })

  asignarOrdenPistaPorCancha(categoriasExport)

  return {
    campeonato: {
      nombre: campeonatoNombre,
      fecha_inicio: fecha,
    },
    categorias: categoriasExport,
  }
}
