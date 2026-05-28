'use client'

import { jsPDF } from 'jspdf'
import { columnasBracket, rondasOrdenadas, byePlayersEnLlave } from '@/lib/campeonato/bracket-export'

const GRAY = [100, 116, 139]
const DARK = [17, 17, 17]
const GOLD = [180, 83, 9]
const CHUNG = [29, 78, 216]
const HONG = [220, 38, 38]

function trunc(doc, text, maxW) {
  let s = String(text || '')
  while (s.length > 2 && doc.getTextWidth(s) > maxW) s = `${s.slice(0, -2)}…`
  return s
}

function drawHeader(doc, campeonato, cat, pageW) {
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(trunc(doc, campeonato?.nombre || 'Campeonato', pageW - 24), pageW / 2, 9, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const subtitle = [cat.nombre, cat.cancha ? `Área ${cat.cancha}` : null, cat.inscritos ? `${cat.inscritos} competidores` : null].filter(Boolean).join(' · ')
  doc.text(trunc(doc, subtitle, pageW - 24), pageW / 2, 15, { align: 'center' })

  if (campeonato?.fecha_inicio) {
    const f = new Date(campeonato.fecha_inicio)
    doc.setFontSize(8)
    doc.text(
      f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }),
      pageW / 2,
      20,
      { align: 'center' }
    )
  }

  doc.setDrawColor(180, 180, 180)
  doc.line(10, 23, pageW - 10, 23)
}

function drawFightBadge(doc, x, y, area, num, fontSize = 10) {
  if (!num) return
  const label = area ? `${area}/${String(num).padStart(2, '0')}` : String(num)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const w = Math.max(16, doc.getTextWidth(label) + 8)
  const h = fontSize + 4
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.35)
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 1.5, 1.5, 'FD')
  doc.setTextColor(...DARK)
  doc.text(label, x, y + fontSize * 0.12, { align: 'center' })
}

function colorSideFrom(slot) {
  if (slot?.color === 'rojo') return 'rojo'
  if (slot?.color === 'azul') return 'azul'
  return null
}

function drawCompetidorBox(doc, x, y, w, h, slot, { highlight = false, bye = false, colorSide = null, hideByeDuplicate = false } = {}) {
  const vacio = hideByeDuplicate || bye || slot?.vacio || !slot?.nombre || slot.nombre === 'POR DEFINIR'
  const label = hideByeDuplicate ? 'POR DEFINIR' : bye ? 'BYE' : (slot?.nombre || 'POR DEFINIR').toUpperCase()
  const side = colorSide || colorSideFrom(slot)
  const fill = vacio ? [248, 250, 252] : highlight ? [255, 251, 235] : [255, 255, 255]

  doc.setFillColor(...fill)
  doc.setDrawColor(vacio ? 180 : highlight ? GOLD[0] : 160, vacio ? 180 : highlight ? GOLD[1] : 160, vacio ? 180 : highlight ? GOLD[2] : 160)
  doc.setLineWidth(highlight ? 0.55 : 0.4)
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1.2], 0)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, vacio ? 'S' : highlight ? 'FD' : 'S')
  if (vacio && doc.setLineDashPattern) doc.setLineDashPattern([], 0)

  if (side === 'azul') {
    doc.setFillColor(...CHUNG)
    doc.rect(x, y, 3.5, h, 'F')
  } else if (side === 'rojo') {
    doc.setFillColor(...HONG)
    doc.rect(x, y, 3.5, h, 'F')
  }

  if (!vacio && !bye && !hideByeDuplicate) {
    doc.setFillColor(225, 225, 225)
    doc.roundedRect(x + 5, y + 2, 9, 4.5, 1, 1, 'F')
    doc.setFontSize(4.2)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.text('PER', x + 9.5, y + 4.8, { align: 'center' })
  }

  doc.setFont('helvetica', vacio ? 'italic' : 'bold')
  doc.setFontSize(vacio ? Math.max(6, h * 0.42) : Math.max(6.5, h * 0.46))
  if (side === 'azul' && !vacio) doc.setTextColor(...CHUNG)
  else if (side === 'rojo' && !vacio) doc.setTextColor(...HONG)
  else doc.setTextColor(...(vacio ? GRAY : DARK))

  const nameX = vacio ? x + 4 : x + 15
  const lines = doc.splitTextToSize(label, w - (vacio ? 8 : 18))
  doc.text(lines.slice(0, 1), nameX, y + h * 0.42)

  if (!vacio && !bye && !hideByeDuplicate && slot?.academia) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(5, h * 0.34))
    doc.setTextColor(...GRAY)
    doc.text(trunc(doc, slot.academia, w - 6), x + 5, y + h - 2)
  }

  if (bye) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...GOLD)
    doc.text('BYE →', x + w - 14, y + 4)
  }
}

function drawBracketConnector(doc, xFrom, yTop, yBot, xMid, xTo, yOut) {
  doc.setDrawColor(60, 60, 60)
  doc.setLineWidth(0.55)
  const yMid = (yTop + yBot) / 2
  doc.line(xFrom, yTop, xMid, yTop)
  doc.line(xFrom, yBot, xMid, yBot)
  doc.line(xMid, yTop, xMid, yBot)
  doc.line(xMid, yMid, xTo, yOut)
}

function calcLayout(cols, pageW, pageH, { byeCount = 0 } = {}) {
  const marginT = 32           // header termina en y≈25, 7mm de buffer
  const marginB = 8
  // Reservar espacio para bye boxes al final (byeCount caja + separador)
  const byeReserve = byeCount > 0 ? byeCount * 20 + 12 : 0
  const availH = pageH - marginT - marginB - byeReserve
  const availW = pageW - 20
  const firstCount = Math.max(1, cols[0]?.combates.length || 1)
  const numRoundCols = cols.length + 1  // +1 para caja winner

  let boxH = 18
  let gap = 5
  let boxW = 58
  let colGap = 20

  const interBlock = () => Math.max(0.5, boxH * 0.25)
  // La altura total incluye un +boxH de seguridad para que el último box no se corte
  const blockH = () => firstCount * (boxH * 2 + gap) + Math.max(0, firstCount - 1) * interBlock() + boxH

  while (blockH() > availH && boxH > 4) {
    boxH = Math.max(4, boxH * 0.9)
    gap = Math.max(0.5, gap * 0.9)
  }

  // Escalar ancho; minimums más bajos para brackets de 5+ rondas
  const minBoxW = cols.length >= 5 ? 22 : cols.length >= 4 ? 28 : 36
  const minColGap = cols.length >= 5 ? 8 : 10
  let colW = boxW + colGap
  let totalW = numRoundCols * colW + boxW + 20
  if (totalW > availW) {
    const scale = availW / totalW
    boxW = Math.max(minBoxW, boxW * scale)
    colGap = Math.max(minColGap, colGap * scale)
    colW = boxW + colGap
    totalW = numRoundCols * colW + boxW + 20
    // Segunda pasada si aún no cabe
    if (totalW > availW) {
      const scale2 = availW / totalW
      boxW = Math.max(minBoxW * 0.8, boxW * scale2)
      colGap = Math.max(minColGap * 0.8, colGap * scale2)
      colW = boxW + colGap
    }
  }

  const totalH = firstCount * (boxH * 2 + gap) + Math.max(0, firstCount - 1) * interBlock()
  const marginL = Math.max(6, (pageW - (numRoundCols * colW + boxW + 20)) / 2)
  const fightFont = firstCount > 12 ? 6 : firstCount > 8 ? 7 : firstCount > 4 ? 8 : 9
  const connectorMid = Math.min(12, colGap * 0.5)

  return { marginL, marginT, boxW, boxH, gap, colW, colGap, totalH, firstCount, fightFont, connectorMid }
}

function drawColumnHeaders(doc, cols, layout, y) {
  const { marginL, boxW, colW, connectorMid } = layout
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Name / Team', marginL, y)
  cols.forEach((col, i) => {
    doc.text(col.label, marginL + (i + 1) * colW + boxW * 0.1, y)
  })
  doc.text('Winner', marginL + (cols.length + 1) * colW + 2, y)
}

export function dibujarBracketCategoriaPdf(doc, campeonato, cat, { pageW = 297, pageH = 210 } = {}) {
  const cols = columnasBracket(cat.porRonda)
  const rondas = rondasOrdenadas(cat.porRonda)
  if (!cols.length || !rondas.length) return

  drawHeader(doc, campeonato, cat, pageW)
  const byes = byePlayersEnLlave(cat.porRonda)
  const layout = calcLayout(cols, pageW, pageH, { byeCount: byes.length })
  const { marginL, marginT, boxW, boxH, gap, colW, totalH, fightFont, connectorMid } = layout
  const byeNames = new Set(byes.map((b) => b.nombre))

  drawColumnHeaders(doc, cols, layout, marginT - 4)

  const matchPositions = cols.map((col, colIdx) => {
    const count = col.combates.length
    return col.combates.map((m, i) => {
      const span = totalH / count
      const blockTop = marginT + i * span + (span - (boxH * 2 + gap)) / 2
      const yChung = blockTop
      const yHong = blockTop + boxH + gap
      const yMid = blockTop + boxH + gap / 2
      const yBadge = yChung + boxH / 2 + (yHong - yChung) / 2
      const x = marginL + colIdx * colW
      return { m, yChung, yHong, yMid, yBadge, x, colIdx }
    })
  })

  const hideIfBye = (m, slot) => m.es_bye && slot?.nombre && byeNames.has(slot.nombre.toUpperCase())

  matchPositions.forEach((colMatches, colIdx) => {
    colMatches.forEach(({ m, yChung, yHong, yMid, yBadge, x }, matchIdx) => {
      const chung = m.chung || { nombre: 'POR DEFINIR', vacio: true }
      const hong = m.hong || { nombre: 'POR DEFINIR', vacio: true }
      const hideChung = colIdx > 0 && hideIfBye(m, chung)
      const hideHong = colIdx > 0 && hideIfBye(m, hong)

      drawCompetidorBox(doc, x, yChung, boxW, boxH, chung, {
        highlight: Boolean(m.ganador && chung.nombre === m.ganador.toUpperCase()),
        colorSide: chung.color || 'azul',
        hideByeDuplicate: hideChung,
      })
      drawCompetidorBox(doc, x, yHong, boxW, boxH, hong, {
        highlight: Boolean(m.ganador && hong.nombre === m.ganador.toUpperCase()),
        colorSide: hong.color || 'rojo',
        hideByeDuplicate: hideHong,
      })

      const badgeX = x + boxW + connectorMid
      if (m.numero_combate) {
        drawFightBadge(doc, badgeX, yBadge, cat.cancha, m.numero_combate, fightFont)
      }

      if (colIdx < cols.length - 1) {
        const targetIdx = Math.floor(matchIdx / 2)
        const target = matchPositions[colIdx + 1]?.[targetIdx]
        const yTarget = target ? target.yBadge : badgeY
        drawBracketConnector(doc, x + boxW, yChung + boxH / 2, yHong + boxH / 2, badgeX, x + colW, yTarget)
      }
    })
  })

  // Bye(s) en extremo inferior — columna Name / Team
  if (byes.length && matchPositions[0]?.length) {
    const lastCol = matchPositions[0]
    const lastMatch = lastCol[lastCol.length - 1]
    let yBye = lastMatch.yHong + boxH + 10
    for (const bye of byes) {
      drawCompetidorBox(doc, marginL, yBye, boxW, boxH, bye, {
        colorSide: bye.color || 'azul',
        bye: false,
      })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(...GOLD)
      doc.text('BYE', marginL + boxW + 4, yBye + boxH / 2)
      if (lastMatch) {
        const sfIdx = cols.length >= 2 ? matchPositions[1]?.length - 1 : 0
        const sfPos = matchPositions[1]?.[sfIdx]
        if (sfPos) {
          drawBracketConnector(
            doc,
            marginL + boxW,
            yBye + boxH / 2,
            yBye + boxH / 2,
            marginL + boxW + connectorMid,
            sfPos.x,
            sfPos.yMid + boxH / 2
          )
        }
      }
      yBye += boxH + 8
    }
  }

  const finalCol = cols[cols.length - 1]
  const finalMatch = finalCol?.combates[0]
  const finalPos = matchPositions[cols.length - 1]?.[0]
  if (finalPos) {
    const xWin = finalPos.x + boxW + connectorMid + 2
    const yWin = finalPos.yBadge - boxH / 2

    drawBracketConnector(
      doc,
      finalPos.x + boxW,
      finalPos.yChung + boxH / 2,
      finalPos.yHong + boxH / 2,
      finalPos.x + boxW + connectorMid,
      xWin,
      finalPos.yBadge
    )

    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.7)
    doc.roundedRect(xWin, yWin, boxW + 4, boxH + 4, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GOLD)
    doc.text('Winner', xWin + 3, yWin + 5)
    doc.setFontSize(Math.max(7, boxH * 0.45))
    doc.setTextColor(17, 17, 17)
    doc.text(trunc(doc, (finalMatch?.ganador || 'POR DEFINIR').toUpperCase(), boxW), xWin + 3, yWin + 11)
  }

  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('ACCTKD · World Taekwondo', pageW / 2, pageH - 6, { align: 'center' })
}

export function descargarLlavesBracketPdf(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const cats = (data.categorias || []).filter((c) => c.tiene_llave && c.porRonda)
  if (!cats.length) throw new Error('No hay llaves generadas para exportar')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  cats.forEach((cat, i) => {
    if (i > 0) doc.addPage()
    dibujarBracketCategoriaPdf(doc, data.campeonato, cat, { pageW, pageH })
  })

  const slug = (camp || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)

  doc.save(`llaves-graficas-${slug}.pdf`)
}

export function descargarCategoriaBracketPdf(data, idCategoria) {
  const cat = (data.categorias || []).find((c) => c.id_categoria === idCategoria)
  if (!cat?.porRonda) throw new Error('Categoría sin llave')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  dibujarBracketCategoriaPdf(doc, data.campeonato, cat, {
    pageW: doc.internal.pageSize.getWidth(),
    pageH: doc.internal.pageSize.getHeight(),
  })

  const slug = cat.nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 40)
  doc.save(`llave-${slug}.pdf`)
}
