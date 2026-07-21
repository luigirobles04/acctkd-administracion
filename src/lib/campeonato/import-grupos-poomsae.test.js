import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parseFestcupInscripcionExcel } from '@/lib/campeonato/import-inscripcion-excel'
import { CATEGORIAS_WT } from '@/lib/campeonato/categorias-wt'

const ACCTKD = join(
  process.env.HOME || '',
  'Downloads/FICHA DE INSCRIPCION/planillas academias/ACCTKD/Ficha inscripcion FestCup 2025 ACCTKD- poomsae kyorugi.xlsx',
)
const UCV = join(
  process.env.HOME || '',
  'Downloads/FICHA DE INSCRIPCION/planillas academias/UCV TRUJILLO/UCV TRUJILLO.xlsx',
)

function expectGrupos(file, label) {
  const categorias = CATEGORIAS_WT.map((c, i) => ({ ...c, id_campeonato: 10, id_categoria: c.orden || i + 1 }))
  const parsed = parseFestcupInscripcionExcel(readFileSync(file), { categorias, anioCampeonato: 2025 })
  const parejas = parsed.lineas.filter((l) => l.tipo.includes('pareja'))
  const equipos = parsed.lineas.filter((l) => l.tipo === 'poomsae_equipo')
  const gruposOk = [...parejas, ...equipos].filter((l) => !l.errores?.length)
  const gruposErr = [...parejas, ...equipos].filter((l) => l.errores?.length)
  expect(parejas.length, label).toBeGreaterThan(0)
  expect(gruposOk.length, label).toBeGreaterThan(0)
  expect(gruposErr.length, `${label} errores: ${gruposErr.map((g) => g.label).join(', ')}`).toBe(0)
  if (equipos.length) expect(equipos.filter((l) => !l.errores?.length).length, label).toBeGreaterThan(0)
}

describe('import grupos poomsae (parejas/equipo)', () => {
  it.skipIf(!existsSync(ACCTKD))('parsea parejas compactas (ACCTKD 2025)', () => {
    expectGrupos(ACCTKD, 'ACCTKD')
  })

  it.skipIf(!existsSync(UCV))('parsea parejas en filas individuales (UCV 2025)', () => {
    expectGrupos(UCV, 'UCV')
  })
})
