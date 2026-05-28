'use client'

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { nombreHojaExcel } from '@/lib/campeonato/export-llaves'

function slugArchivo(nombre) {
  return (nombre || 'campeonato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)
}

export async function descargarLlavesExcel(data) {
  const wb = XLSX.utils.book_new()
  const camp = data.campeonato?.nombre || 'Campeonato'

  const rowsResumen = [
    ['Campeonato', camp],
    ['Ciudad', data.campeonato?.ciudad || ''],
    ['Total categorías', data.totales?.categorias || 0],
    ['Total competidores', data.totales?.competidores || 0],
    ['Total combates', data.totales?.combates || 0],
    ['Categorías con llave', data.totales?.con_llave || 0],
    [],
    ['Categoría', 'División', 'Género', 'Inscritos', 'Combates', 'Cancha', 'Llave'],
    ...(data.resumen || []).map((r) => [
      r.categoria,
      r.division,
      r.genero,
      r.inscritos,
      r.combates,
      r.cancha,
      r.llave,
    ]),
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(rowsResumen)
  wsResumen['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  const filasTodos = []
  for (const cat of data.categorias || []) {
    if (!cat.tiene_llave) continue
    for (const f of cat.filasCombates) {
      filasTodos.push({
        Categoría: cat.nombre,
        Inscritos: cat.inscritos,
        Cancha: cat.cancha ? `Área ${cat.cancha}` : '',
        Ronda: f.rondaLabel,
        Pelea: f.match_numero,
        Chung: f.chung,
        'Acad. Chung': f.academia_chung,
        Hong: f.hong,
        'Acad. Hong': f.academia_hong,
        Estado: f.estado,
        Ganador: f.ganador,
      })
    }
  }
  if (filasTodos.length) {
    const wsCombates = XLSX.utils.json_to_sheet(filasTodos)
    XLSX.utils.book_append_sheet(wb, wsCombates, 'Todos los combates')
  }

  const usados = new Set(['Resumen', 'Todos los combates'])
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

    const rows = [
      ['Categoría', cat.nombre],
      ['Inscritos', cat.inscritos],
      ['Cancha', cat.cancha ? `Área ${cat.cancha}` : '—'],
      ['División', cat.division || ''],
      ['Género', cat.genero || ''],
      [],
      ['Ronda', 'Pelea', 'Chung (Azul)', 'Hong (Rojo)', 'Ganador', 'Estado'],
    ]

    for (const f of cat.filasCombates) {
      rows.push([f.rondaLabel, f.match_numero, f.chung, f.hong, f.ganador, f.estado])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, nombre)
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `llaves-${slugArchivo(camp)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
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
