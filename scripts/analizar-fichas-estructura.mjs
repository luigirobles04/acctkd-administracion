#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import * as XLSX from 'xlsx'

const BASE = '/Users/luigiarmandoroblespalacios/Downloads/FICHA DE INSCRIPCION/planillas academias'

function walkXlsx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkXlsx(p, out)
    else if (/\.xlsx?$/i.test(name) && !name.startsWith('~$')) out.push(p)
  }
  return out
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function sheetRows(wb, ...names) {
  for (const want of names) {
    const hit = wb.SheetNames.find((n) => norm(n) === norm(want) || norm(n).includes(norm(want)))
    if (hit) {
      const ws = wb.Sheets[hit]
      return { name: hit, rows: XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) }
    }
  }
  return null
}

function countDataRows(rows, start = 9) {
  let n = 0
  for (let i = start; i < rows.length; i++) {
    if (String(rows[i]?.[1] || '').trim()) n++
  }
  return n
}

function headerRow(rows, idx = 8) {
  return (rows[idx] || []).map((c) => String(c || '').trim()).filter(Boolean).slice(0, 8)
}

const files = walkXlsx(BASE)
const report = []

for (const file of files) {
  const buf = readFileSync(file)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const entry = {
    file: file.replace(BASE + '/', ''),
    sheets: wb.SheetNames,
    sections: {},
  }

  for (const [key, aliases] of [
    ['KYORUGUI', ['KYORUGUI', 'KYORUGI']],
    ['POOMSAE', ['POOMSAE']],
    ['FESTIVAL', ['FESTIVAL']],
    ['ENTRENADORES', ['ENTRENADORES', 'ENTRENADOR']],
    ['FREESTYLE', ['FREESTYLE']],
  ]) {
    const sh = sheetRows(wb, ...aliases)
    if (sh) {
      entry.sections[key] = {
        sheetName: sh.name,
        dataRows: countDataRows(sh.rows),
        header: headerRow(sh.rows),
        sample: sh.rows.slice(9, 12).map((r) => (r || []).slice(0, 7).map((c) => String(c || '').trim())),
      }
    }
  }

  // sheets not matched
  const matched = new Set(Object.values(entry.sections).map((s) => s.sheetName))
  entry.unmatchedSheets = wb.SheetNames.filter((n) => !matched.has(n))
  report.push(entry)
}

console.log(JSON.stringify({ total: report.length, report }, null, 2))
