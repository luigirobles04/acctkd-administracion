/** Utilidades para exportar llaves como árbol visual (Excel FESTCUP / PDF CNU) */

export const RONDA_LABEL_EXPORT = {
  1: 'Final',
  2: 'S-Final',
  3: 'Q-Final',
  4: 'R16',
  5: 'R32',
}

export function combateEnBracket(m) {
  return m && m.estado !== 'vacío' && m.estado !== 'bye'
}

/** @deprecated use combateEnBracket */
export function combateExportable(m) {
  return combateEnBracket(m)
}

export function rondasOrdenadas(porRonda) {
  return Object.keys(porRonda || {})
    .map(Number)
    .filter((r) => (porRonda[r] || []).some(combateEnBracket))
    .sort((a, b) => b - a)
}

export function labelRondaExport(ronda, maxRonda) {
  if (ronda === 1) return 'Final'
  if (ronda === 2) return 'S-Final'
  if (ronda === maxRonda) {
    const map = { 2: 'S-Final', 3: 'Q-Final', 4: 'R16', 5: 'R32' }
    return map[maxRonda] || `Ronda ${ronda}`
  }
  if (ronda === maxRonda - 1 && maxRonda >= 4) return 'Q-Final'
  return RONDA_LABEL_EXPORT[ronda] || `R${ronda}`
}

function slotFromCompetidor(c) {
  if (!c?.id_linea && !c?.nombres) {
    return { nombre: 'POR DEFINIR', academia: '', dorsal: '', vacio: true }
  }
  return {
    nombre: (c.nombres || 'POR DEFINIR').toUpperCase(),
    academia: c.academia || '',
    dorsal: c.dorsal || '',
    vacio: false,
  }
}

export function emparejamientosPrimeraRonda(porRonda) {
  const rondas = rondasOrdenadas(porRonda)
  if (!rondas.length) return []
  const primera = rondas[0]
  const combates = (porRonda[primera] || [])
    .filter(combateEnBracket)
    .sort((a, b) => a.match_numero - b.match_numero)

  return combates.map((m) => ({
    match_numero: m.match_numero,
    ronda: m.ronda,
    chung: slotFromCompetidor(m.competidor1),
    hong: slotFromCompetidor(m.competidor2),
    ganador_id_linea: m.ganador_id_linea,
    id_llave: m.id_llave,
  }))
}

export function ganadorNombre(combate) {
  if (!combate?.ganador_id_linea) return ''
  if (combate.ganador_id_linea === combate.id_linea1) return combate.competidor1?.nombres || ''
  if (combate.ganador_id_linea === combate.id_linea2) return combate.competidor2?.nombres || ''
  return ''
}

export function columnasBracket(porRonda) {
  const rondas = rondasOrdenadas(porRonda)
  const maxR = rondas[0] || 1
  return rondas.map((r) => ({
    ronda: r,
    label: labelRondaExport(r, maxR),
    combates: (porRonda[r] || [])
      .filter(combateEnBracket)
      .sort((a, b) => a.match_numero - b.match_numero)
      .map((m) => ({
        match_numero: m.match_numero,
        numero_combate: m.orden_pista || '',
        chung: slotFromCompetidor(m.competidor1),
        hong: slotFromCompetidor(m.competidor2),
        ganador: ganadorNombre(m),
      })),
  }))
}

const BORDER = '1px solid #111'
const BORDER_MED = '2px solid #111'
const BG_SLOT = '#e8e8e8'
const BG_CAT = '#FFFF00'
const BG_AREA = '#f3f4f6'

function cell(html, style = '') {
  return `<td style="padding:2px 6px;vertical-align:middle;${style}">${html}</td>`
}

function emptyCell(style = '') {
  return `<td style="${style}">&nbsp;</td>`
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function bracketCategoriaHtmlExcel(cat) {
  const pairs = emparejamientosPrimeraRonda(cat.porRonda)
  if (!pairs.length) return ''

  let html = `<table style="border-collapse:collapse;width:100%;margin:18px 0 8px;font-family:Calibri,Arial,sans-serif;font-size:10pt;">`
  html += `<tr><td colspan="12" style="background:${BG_CAT};font-weight:bold;font-size:11pt;padding:6px 10px;border:${BORDER};">Categoría ${esc(cat.nombre)}</td></tr>`
  html += '</table>'

  html += `<table style="border-collapse:collapse;width:100%;background:${BG_AREA};font-family:Calibri,Arial,sans-serif;font-size:9pt;margin-bottom:20px;">`

  pairs.forEach((pair, idx) => {
    const seedA = idx * 2 + 1
    const seedB = idx * 2 + 2
    const chung = pair.chung || { nombre: 'POR DEFINIR', academia: '', vacio: true }
    const hong = pair.hong || { nombre: 'POR DEFINIR', academia: '', vacio: true }

    html += '<tr>'
    html += cell(String(seedA), `background:#fff;border-left:${BORDER_MED};border-top:${BORDER_MED};width:28px;text-align:center;font-weight:bold;`)
    html += cell(`<b>${esc(chung.nombre)}</b>`, `background:${BG_SLOT};border-top:${BORDER_MED};min-width:180px;${chung.vacio ? 'color:#888;font-style:italic;' : ''}`)
    html += cell(esc(chung.academia) || '&nbsp;', `background:${BG_SLOT};border-top:${BORDER_MED};color:#333;font-size:8pt;min-width:140px;`)
    html += emptyCell(`border-top:${BORDER};border-right:${BORDER};width:36px;height:10px;`)
    html += emptyCell(`border-top:${BORDER};width:28px;height:10px;`)
    html += emptyCell(`border-top:${BORDER};border-right:${BORDER};width:28px;height:10px;`)
    html += emptyCell('width:24px;')
    html += '</tr>'

    html += '<tr>'
    html += emptyCell(`border-left:${BORDER_MED};`)
    html += emptyCell(`background:${BG_SLOT};`)
    html += emptyCell(`background:${BG_SLOT};`)
    html += emptyCell(`border-right:${BORDER};width:36px;`)
    html += emptyCell(`border-right:${BORDER};width:28px;`)
    html += emptyCell(`border-right:${BORDER};width:28px;`)
    html += emptyCell('')
    html += '</tr>'

    html += '<tr>'
    html += cell(String(seedB), `background:#fff;border-left:${BORDER_MED};border-bottom:${BORDER_MED};text-align:center;font-weight:bold;`)
    html += cell(`<b>${esc(hong.nombre)}</b>`, `background:${BG_SLOT};border-bottom:${BORDER_MED};${hong.vacio ? 'color:#888;font-style:italic;' : ''}`)
    html += cell(esc(hong.academia) || '&nbsp;', `background:${BG_SLOT};border-bottom:${BORDER_MED};color:#333;font-size:8pt;`)
    html += emptyCell(`border-right:${BORDER};border-bottom:${BORDER};width:36px;`)
    html += emptyCell(`border-bottom:${BORDER};width:28px;`)
    html += emptyCell(`border-right:${BORDER};border-bottom:${BORDER};width:28px;`)
    html += emptyCell('')
    html += '</tr>'

    if (idx < pairs.length - 1) {
      html += '<tr><td colspan="12" style="height:6px;border:none;"></td></tr>'
    }
  })

  html += '</table>'

  return html
}

export function hojaAreaHtmlExcel(camp, areaNum, categorias) {
  let html = `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;"><tr>`
  html += `<td style="background:#C0000A;color:#fff;font-weight:bold;font-size:14pt;padding:10px 14px;">LLAVES KYORUGI · ${esc(camp)} · ÁREA ${areaNum}</td>`
  html += '</tr></table>'
  html += `<p style="font-family:Calibri,Arial;font-size:10pt;color:#555;margin:0 0 12px;">${categorias.length} categoría(s) en esta área</p>`

  for (const cat of categorias) {
    html += bracketCategoriaHtmlExcel(cat)
  }
  return html
}

export function agruparPorArea(categorias) {
  const areas = { 1: [], 2: [], 3: [] }
  for (const cat of categorias || []) {
    if (!cat.tiene_llave) continue
    const a = Number(cat.cancha) || 1
    if (areas[a]) areas[a].push(cat)
    else areas[1].push(cat)
  }
  return areas
}
