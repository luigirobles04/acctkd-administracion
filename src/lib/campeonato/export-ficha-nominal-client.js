'use client'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { descargarExcelHtml, tdCell, thCell, XL, slugArchivo } from '@/lib/campeonato/export-excel-html'
import { nombreHojaExcel } from '@/lib/campeonato/export-ficha-nominal'

const COLS_COMP = ['Dorsal', 'Nombre', 'Documento', 'Sexo', 'Edad', 'Grado', 'Categoría', 'Peso']
const COLS_POOM = ['Nombre', 'Documento', 'Sexo', 'Edad', 'Grado', 'Categoría', 'Modalidad']
const COLS_OFIC = ['Rol', 'Nombre', 'Documento']

function tablaCompetidoresHtml(rows, titulo) {
  if (!rows.length) return ''
  let html = `<p style="font-weight:bold;font-size:12pt;margin:12px 0 4px;color:${XL.dark};">${titulo} (${rows.length})</p><table><thead><tr>`
  html += COLS_COMP.map((c) => thCell(c)).join('')
  html += '</tr></thead><tbody>'
  rows.forEach((r, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : XL.gray
    html += '<tr>'
    html += [
      tdCell(r.dorsal, { bg, bold: true, align: 'center' }),
      tdCell(r.nombre, { bg }),
      tdCell(r.documento, { bg, align: 'center' }),
      tdCell(r.sexo, { bg, align: 'center' }),
      tdCell(r.edad, { bg, align: 'center' }),
      tdCell(r.grado, { bg }),
      tdCell(r.categoria, { bg }),
      tdCell(r.peso, { bg, align: 'center' }),
    ].join('')
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}

function tablaPoomsaeHtml(rows) {
  if (!rows.length) return ''
  let html = `<p style="font-weight:bold;font-size:12pt;margin:12px 0 4px;color:${XL.dark};">Poomsae (${rows.length})</p><table><thead><tr>`
  html += COLS_POOM.map((c) => thCell(c, XL.dark)).join('')
  html += '</tr></thead><tbody>'
  rows.forEach((r, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : XL.gray
    html += '<tr>'
    html += [
      tdCell(r.nombre, { bg }),
      tdCell(r.documento, { bg, align: 'center' }),
      tdCell(r.sexo, { bg, align: 'center' }),
      tdCell(r.edad, { bg, align: 'center' }),
      tdCell(r.grado, { bg }),
      tdCell(r.categoria, { bg }),
      tdCell(r.modalidad, { bg }),
    ].join('')
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}

function tablaOficialesHtml(rows) {
  if (!rows.length) return ''
  let html = `<p style="font-weight:bold;font-size:12pt;margin:12px 0 4px;color:${XL.dark};">Coaches y oficiales (${rows.length})</p><table><thead><tr>`
  html += COLS_OFIC.map((c) => thCell(c, '#059669')).join('')
  html += '</tr></thead><tbody>'
  rows.forEach((r, i) => {
    const bg = i % 2 === 0 ? XL.greenBg : '#ffffff'
    html += '<tr>'
    html += [
      tdCell(r.rol, { bg, bold: true }),
      tdCell(r.nombre, { bg }),
      tdCell(r.documento, { bg, align: 'center' }),
    ].join('')
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}

function hojaAcademiaHtml(ac, camp) {
  let html = `<table style="width:100%;margin-bottom:8px;"><tr>`
  html += thCell(`FICHA NOMINAL · ${camp?.nombre || ''}`, XL.red, '#fff', 4)
  html += '</tr></table>'
  html += `<table style="width:100%;margin-bottom:12px;">`
  html += `<tr>${tdCell(`Academia: ${ac.nombre}`, { bold: true, bg: XL.gray, border: 'none' })}${tdCell(`Código: ${ac.codigo || '—'}`, { bg: XL.gray, border: 'none' })}</tr>`
  html += `<tr>${tdCell(`Representante: ${ac.representante}`, { bg: '#fff', border: 'none' })}${tdCell(`DNI: ${ac.representante_dni}`, { bg: '#fff', border: 'none' })}</tr>`
  html += `<tr>${tdCell(`Ciudad: ${ac.ciudad}`, { bg: '#fff', border: 'none' })}${tdCell(`Tel: ${ac.telefono}`, { bg: '#fff', border: 'none' })}</tr>`
  html += `<tr>${tdCell(`Kyorugi: ${ac.kyorugi.length} · Poomsae: ${ac.poomsae.length} · Oficiales: ${ac.oficiales.length}`, { bold: true, bg: XL.goldBg, border: 'none' })}</tr>`
  html += `</table>`
  html += tablaCompetidoresHtml(ac.kyorugi, 'Kyorugi')
  html += tablaPoomsaeHtml(ac.poomsae)
  html += tablaOficialesHtml(ac.oficiales)
  return html
}

export async function descargarFichaNominalExcel(data, { idAcademia } = {}) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const academias = idAcademia
    ? (data.academias || []).filter((a) => a.id === idAcademia)
    : data.academias || []

  const sheets = []

  let resHtml = `<table><tr>${thCell('FICHA NOMINAL · RESUMEN', XL.red, '#fff', 6)}</tr></table>`
  resHtml += `<p style="font-size:11pt;margin:8px 0;">${camp} · ${data.totales?.academias || 0} academias · ${data.totales?.competidores || 0} competidores · ${data.totales?.oficiales || 0} oficiales</p>`
  resHtml += '<table><thead><tr>'
  resHtml += ['Academia', 'Código', 'Kyorugi', 'Poomsae', 'Oficiales', 'Total'].map((c) => thCell(c, XL.dark)).join('')
  resHtml += '</tr></thead><tbody>'
  academias.forEach((a, i) => {
    const bg = i % 2 === 0 ? '#fff' : XL.gray
    resHtml += '<tr>'
    resHtml += [
      tdCell(a.nombre, { bg, bold: true }),
      tdCell(a.codigo, { bg, align: 'center' }),
      tdCell(a.kyorugi.length, { bg, align: 'center' }),
      tdCell(a.poomsae.length, { bg, align: 'center' }),
      tdCell(a.oficiales.length, { bg, align: 'center' }),
      tdCell(a.total, { bg: XL.goldBg, align: 'center', bold: true }),
    ].join('')
    resHtml += '</tr>'
  })
  resHtml += '</tbody></table>'
  sheets.push({ name: 'Resumen', html: resHtml })

  const usados = new Set(['Resumen'])
  for (const ac of academias) {
    let base = nombreHojaExcel(ac.nombre)
    let nombre = base
    let n = 2
    while (usados.has(nombre)) {
      nombre = `${base.slice(0, 24)} ${n}`
      n++
    }
    usados.add(nombre)
    sheets.push({ name: nombre, html: hojaAcademiaHtml(ac, data.campeonato) })
  }

  const suffix = idAcademia ? `-${slugArchivo(academias[0]?.nombre)}` : ''
  descargarExcelHtml(`ficha-nominal-${slugArchivo(camp)}${suffix}`, sheets)
}

export async function descargarFichaNominalPdf(data, { idAcademia } = {}) {
  const camp = data.campeonato?.nombre || 'Campeonato'
  const academias = idAcademia
    ? (data.academias || []).filter((a) => a.id === idAcademia)
    : data.academias || []

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  academias.forEach((ac, idx) => {
    if (idx > 0) doc.addPage()

    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(192, 0, 10)
    doc.text('Ficha nominal · ACCTKD', 14, 16)
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(camp, 14, 23)

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(ac.nombre, 14, 32)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Rep: ${ac.representante} · DNI ${ac.representante_dni} · ${ac.ciudad} · ${ac.kyorugi.length} kyorugi · ${ac.poomsae.length} poomsae · ${ac.oficiales.length} oficiales`,
      14,
      38
    )

    let y = 44

    if (ac.kyorugi.length) {
      autoTable(doc, {
        startY: y,
        head: [COLS_COMP],
        body: ac.kyorugi.map((r) => [r.dorsal, r.nombre, r.documento, r.sexo, r.edad, r.grado, r.categoria, r.peso]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [192, 0, 10] },
        margin: { left: 14, right: 14 },
        theme: 'striped',
      })
      y = doc.lastAutoTable.finalY + 6
    }

    if (ac.poomsae.length) {
      autoTable(doc, {
        startY: y,
        head: [COLS_POOM],
        body: ac.poomsae.map((r) => [r.nombre, r.documento, r.sexo, r.edad, r.grado, r.categoria, r.modalidad]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: 14, right: 14 },
        theme: 'striped',
      })
      y = doc.lastAutoTable.finalY + 6
    }

    if (ac.oficiales.length) {
      autoTable(doc, {
        startY: y,
        head: [COLS_OFIC],
        body: ac.oficiales.map((r) => [r.rol, r.nombre, r.documento]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [5, 150, 105] },
        margin: { left: 14, right: 14 },
        theme: 'striped',
      })
    }
  })

  const suffix = idAcademia ? `-${slugArchivo(academias[0]?.nombre)}` : ''
  doc.save(`ficha-nominal-${slugArchivo(camp)}${suffix}.pdf`)
}

export async function fetchExportFichaNominal(idCampeonato) {
  const res = await fetch(`/api/admin/campeonatos/${idCampeonato}/ficha-nominal/export`, {
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al exportar ficha nominal')
  return json
}
