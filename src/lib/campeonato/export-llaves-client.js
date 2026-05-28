'use client'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { descargarExcelHtml, tdCell, thCell, XL, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { nombreHojaExcel } from '@/lib/campeonato/export-llaves'

function hojaCategoriaHtml(cat) {
  let html = `<table style="width:100%;margin-bottom:6px;"><tr>${thCell(cat.nombre, XL.red, '#fff', 6)}</tr></table>`
  html += `<p style="font-size:10pt;margin:0 0 8px;">${cat.inscritos} inscritos · Cancha ${cat.cancha ? `Área ${cat.cancha}` : '—'} · ${cat.division || ''} ${cat.genero || ''}</p>`

  const porRonda = {}
  for (const f of cat.filasCombates || []) {
    if (!porRonda[f.rondaLabel]) porRonda[f.rondaLabel] = []
    porRonda[f.rondaLabel].push(f)
  }

  for (const [ronda, filas] of Object.entries(porRonda)) {
    html += `<p style="font-weight:bold;font-size:11pt;margin:10px 0 4px;background:${XL.dark};color:#fff;padding:4px 8px;">${ronda}</p>`
    html += '<table style="width:100%;"><thead><tr>'
    html += ['#', 'Chung (Azul)', 'Academia Chung', 'Hong (Rojo)', 'Academia Hong', 'Ganador', 'Estado'].map((c) => thCell(c, XL.dark)).join('')
    html += '</tr></thead><tbody>'

    filas.forEach((f, i) => {
      const bg = i % 2 === 0 ? '#fff' : XL.gray
      html += '<tr>'
      html += tdCell(f.match_numero, { bg, align: 'center', bold: true })
      html += tdCell(f.chung, { bg: XL.chungBg, color: XL.chung, bold: true })
      html += tdCell(f.academia_chung, { bg })
      html += tdCell(f.hong, { bg: XL.hongBg, color: XL.hong, bold: true })
      html += tdCell(f.academia_hong, { bg })
      html += tdCell(f.ganador || '—', { bg: f.ganador ? XL.goldBg : bg, bold: Boolean(f.ganador) })
      html += tdCell(f.estado, { bg, align: 'center' })
      html += '</tr>'
    })
    html += '</tbody></table>'
  }
  return html
}

export async function descargarLlavesExcel(data) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const sheets = []

  let resHtml = `<table><tr>${thCell('LLAVES KYORUGI · RESUMEN', XL.red, '#fff', 7)}</tr></table>`
  resHtml += `<p style="font-size:11pt;margin:8px 0;">${camp} · ${data.totales?.competidores || 0} competidores · ${data.totales?.categorias || 0} categorías · ${data.totales?.combates || 0} combates</p>`
  resHtml += '<table><thead><tr>'
  resHtml += ['Categoría', 'División', 'Género', 'Inscritos', 'Combates', 'Cancha', 'Llave'].map((c) => thCell(c, XL.dark)).join('')
  resHtml += '</tr></thead><tbody>'
  ;(data.resumen || []).forEach((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : XL.gray
    resHtml += '<tr>'
    resHtml += tdCell(r.categoria, { bg, bold: true })
    resHtml += tdCell(r.division, { bg, align: 'center' })
    resHtml += tdCell(r.genero, { bg, align: 'center' })
    resHtml += tdCell(r.inscritos, { bg, align: 'center' })
    resHtml += tdCell(r.combates, { bg, align: 'center' })
    resHtml += tdCell(r.cancha, { bg, align: 'center' })
    resHtml += tdCell(r.llave, { bg: r.llave === 'Sí' ? XL.greenBg : XL.redBg, align: 'center', bold: true })
    resHtml += '</tr>'
  })
  resHtml += '</tbody></table>'
  sheets.push({ name: 'Resumen', html: resHtml })

  let todosHtml = `<table><tr>${thCell('TODOS LOS COMBATES', XL.dark, '#fff', 8)}</tr></table>`
  todosHtml += '<table><thead><tr>'
  todosHtml += ['Categoría', 'Ronda', '#', 'Chung', 'Acad. Chung', 'Hong', 'Acad. Hong', 'Ganador'].map((c) => thCell(c, XL.red)).join('')
  todosHtml += '</tr></thead><tbody>'
  for (const cat of data.categorias || []) {
    if (!cat.tiene_llave) continue
    for (const f of cat.filasCombates || []) {
      todosHtml += '<tr>'
      todosHtml += tdCell(cat.nombre, { bold: true })
      todosHtml += tdCell(f.rondaLabel, { bg: XL.gray })
      todosHtml += tdCell(f.match_numero, { align: 'center', bold: true })
      todosHtml += tdCell(f.chung, { bg: XL.chungBg, color: XL.chung })
      todosHtml += tdCell(f.academia_chung)
      todosHtml += tdCell(f.hong, { bg: XL.hongBg, color: XL.hong })
      todosHtml += tdCell(f.academia_hong)
      todosHtml += tdCell(f.ganador || '—', { bg: f.ganador ? XL.goldBg : '#fff', bold: Boolean(f.ganador) })
      todosHtml += '</tr>'
    }
  }
  todosHtml += '</tbody></table>'
  sheets.push({ name: 'Todos combates', html: todosHtml })

  const usados = new Set(['Resumen', 'Todos combates'])
  for (const cat of data.categorias || []) {
    if (!cat.tiene_llave) continue
    let base = nombreHojaExcel(cat.nombre)
    let nombre = base
    let n = 2
    while (usados.has(nombre)) {
      nombre = `${base.slice(0, 24)} ${n}`
      n++
    }
    usados.add(nombre)
    sheets.push({ name: nombre, html: hojaCategoriaHtml(cat) })
  }

  descargarExcelHtml(`llaves-${slugArchivo(camp)}`, sheets)
}

export async function descargarLlavesPdf(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const camp = data.campeonato?.nombre || 'Campeonato'
  let y = 14

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Llaves Kyorugi · ACCTKD', 14, y)
  y += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(camp, 14, y)
  y += 5
  doc.setFontSize(9)
  doc.text(
    `Competidores: ${data.totales?.competidores || 0} · Categorías: ${data.totales?.categorias || 0} · Combates: ${data.totales?.combates || 0}`,
    14,
    y
  )
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Div.', 'Gén.', 'Insc.', 'Combates', 'Cancha']],
    body: (data.resumen || []).map((r) => [
      r.categoria,
      r.division,
      r.genero,
      r.inscritos,
      r.combates,
      r.cancha,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [192, 0, 10] },
    margin: { left: 14, right: 14 },
  })

  for (const cat of data.categorias || []) {
    if (!cat.tiene_llave) continue
    doc.addPage()
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(cat.nombre, 14, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${cat.inscritos} inscritos · ${cat.combates} combates · Cancha ${cat.cancha || '—'}`,
      14,
      22
    )

    autoTable(doc, {
      startY: 28,
      head: [['Ronda', '#', 'Chung (Azul)', 'Hong (Rojo)', 'Ganador']],
      body: cat.filasCombates.map((f) => [
        f.rondaLabel,
        f.match_numero,
        f.chung,
        f.hong,
        f.ganador || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 10 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
      },
      margin: { left: 14, right: 14 },
    })
  }

  doc.save(`llaves-${slugArchivo(camp)}.pdf`)
}

export async function fetchExportLlaves(idCampeonato) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/llaves/export`, {
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al exportar')
  return json
}
