import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { parseFestcupInscripcionExcel } from '@/lib/campeonato/import-inscripcion-excel'
import { CATEGORIAS_WT } from '@/lib/campeonato/categorias-wt'

const BASE = join(
  process.env.HOME || '',
  'Downloads/FICHA DE INSCRIPCION/planillas academias',
)

function walkXlsx(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkXlsx(p, out)
    else if (/\.xlsx?$/i.test(name) && !name.startsWith('~$')) out.push(p)
  }
  return out
}

describe('fichas reales FestCup 2025', () => {
  const files = (() => {
    try {
      return walkXlsx(BASE)
    } catch {
      return []
    }
  })()

  const categorias = CATEGORIAS_WT.map((c) => ({ ...c, id_campeonato: 1, id_categoria: c.orden }))

  it.skipIf(!files.length)('analiza todas las planillas locales', () => {
    const results = []
    for (const file of files) {
      const buffer = readFileSync(file)
      const parsed = parseFestcupInscripcionExcel(buffer, { categorias, anioCampeonato: 2025 })
      results.push({
        file: file.replace(BASE + '/', ''),
        perfiles: parsed.resumen.perfiles,
        lineas: parsed.resumen.lineas,
        ok: parsed.resumen.ok,
        errores: parsed.resumen.errores,
      })
    }
    console.log('\n--- FICHAS 2025 ---')
    for (const r of results) {
      console.log(`${r.ok}/${r.lineas} ok | ${r.file} | err ${r.errores}`)
    }
    const withErr = results.filter((r) => r.errores > 0)
    if (withErr.length) {
      console.log('\n--- ERRORES RESTANTES ---')
      for (const file of withErr) {
        const buffer = readFileSync(join(BASE, file.file))
        const parsed = parseFestcupInscripcionExcel(buffer, { categorias, anioCampeonato: 2025 })
        for (const l of parsed.lineas.filter((x) => x.errores?.length)) {
          console.log(`  ${file.file}: ${l.label} → ${l.errores.join('; ')}`)
        }
      }
    }
    const zero = results.filter((r) => r.lineas === 0)
    expect(zero.map((z) => z.file)).toEqual([])

    const totalOk = results.reduce((s, r) => s + r.ok, 0)
    const totalLines = results.reduce((s, r) => s + r.lineas, 0)
    expect(totalOk / totalLines).toBeGreaterThan(0.92)
  })
})
