/**
 * Genera xlsx de prueba local — ejecutar con:
 *   npm test -- --run tests/generar-excel-prueba.test.mjs
 */
import { describe, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { buildLlavesExcelBuffer } from '@/lib/campeonato/export-llaves-excel'

function mkComp(n, club) {
  return { nombres: n.toUpperCase(), academia: club, id_linea: n.length }
}

function mkMatch(ronda, mn, c1, c2, orden) {
  return {
    ronda,
    match_numero: mn,
    orden_pista: orden,
    estado: 'pendiente',
    competidor1: c1,
    competidor2: c2,
    color1: 'azul',
    color2: 'rojo',
  }
}

function cat4(nombre, cancha, ordenBase) {
  return {
    nombre,
    cancha,
    tiene_llave: true,
    porRonda: {
      2: [
        mkMatch(2, 1, mkComp('ATLETA A1', 'Thunder Team Lima'), mkComp('ATLETA A2', 'Golden Kick'), ordenBase + 1),
        mkMatch(2, 2, mkComp('ATLETA A3', 'Guerreros Norte'), mkComp('ATLETA A4', 'Cobra Kai'), ordenBase + 2),
      ],
      1: [mkMatch(1, 1, null, null, ordenBase + 3)],
    },
  }
}

function cat8(nombre, cancha, ordenBase) {
  const names = [
    ['COMPETIDORA14 SIM THUNDER', 'Thunder Team Lima'],
    ['ATLETAF9086 GK DEMO', 'Golden Kick Academy'],
    ['ATLETAF9083 GN DEMO', 'Guerreros Norte TKD'],
    ['ATLETAF9085 TT DEMO', 'Thunder Team Lima'],
    ['ATLETAF9087 CK DEMO', 'Cobra Kai Peru'],
    ['ATLETAF9091 SK DEMO', 'Samurai Kick Dojo'],
    ['ATLETAF9083 WS DEMO', 'Warrior Spirit TKD'],
    ['ATLETAF9090 RS DEMO', 'Rising Stars Lima'],
  ]
  const r3 = []
  for (let i = 0; i < 4; i++) {
    r3.push(
      mkMatch(
        3,
        i + 1,
        mkComp(names[i * 2][0], names[i * 2][1]),
        mkComp(names[i * 2 + 1][0], names[i * 2 + 1][1]),
        ordenBase + i + 1,
      ),
    )
  }
  return {
    nombre,
    cancha,
    tiene_llave: true,
    porRonda: {
      3: r3,
      2: [
        mkMatch(2, 1, null, null, ordenBase + 5),
        mkMatch(2, 2, null, null, ordenBase + 6),
      ],
      1: [mkMatch(1, 1, null, null, ordenBase + 7)],
    },
  }
}

function cat6(nombre, cancha, ordenBase) {
  const mk = (n, club) => ({ nombres: n.toUpperCase(), academia: club, id_linea: n.length })
  return {
    nombre,
    cancha,
    tiene_llave: true,
    porRonda: {
      3: [
        {
          ronda: 3,
          match_numero: 1,
          es_bye: true,
          estado: 'saltado',
          competidor1: mk('P1', 'Club A'),
          competidor2: null,
          color1: 'azul',
          orden_pista: 0,
        },
        mkMatch(3, 2, mk('P2', 'Club B'), mk('P3', 'Club C'), ordenBase + 1),
        mkMatch(3, 3, mk('P4', 'Club D'), mk('P5', 'Club A'), ordenBase + 2),
        {
          ronda: 3,
          match_numero: 4,
          es_bye: true,
          estado: 'saltado',
          competidor1: mk('P6', 'Club B'),
          competidor2: null,
          color1: 'azul',
          orden_pista: 0,
        },
      ],
      2: [
        mkMatch(2, 4, null, null, ordenBase + 4),
        mkMatch(2, 5, null, null, ordenBase + 5),
      ],
      1: [mkMatch(1, 9, null, null, ordenBase + 9)],
    },
  }
}

function cat3(nombre, cancha, ordenBase) {
  return {
    nombre,
    cancha,
    tiene_llave: true,
    porRonda: {
      2: [
        {
          ronda: 2,
          match_numero: 0,
          orden_pista: ordenBase,
          estado: 'pendiente',
          es_bye: true,
          competidor1: mkComp('P1 BYE', 'Club A'),
          competidor2: null,
          color1: 'azul',
        },
        mkMatch(2, 0, mkComp('P3', 'Club C'), mkComp('P2', 'Club B'), ordenBase + 1),
      ],
      1: [mkMatch(1, 0, null, null, ordenBase + 2)],
    },
  }
}

function cat2(nombre, cancha, ordenBase) {
  return {
    nombre,
    cancha,
    tiene_llave: true,
    porRonda: {
      1: [
        mkMatch(
          1,
          1,
          mkComp('ATLETAF9109 AN DEMO', 'Andes Taekwondo'),
          mkComp('ATLETAF9110 CK DEMO', 'Cobra Kai Peru'),
          ordenBase + 1,
        ),
      ],
    },
  }
}

describe('generar excel prueba local', () => {
  it('escribe tmp/llaves-kyorugi-prueba-local.xlsx', async () => {
    const data = {
      campeonato: { nombre: 'Simulacion 10x40 — FDPTKD 2026' },
      resumen: [],
      categorias: [
        cat8('Cadete A F -33kg', 1, 250),
        cat4('Cadete A F -44kg', 1, 260),
        cat6('Cadete A M -30kg', 2, 280),
        cat3('Cadete A M -28kg', 2, 290),
        cat2('Cadete A M -33kg', 2, 286),
        cat4('Cadete A F -37kg', 2, 272),
      ],
    }

    const buffer = await buildLlavesExcelBuffer(data)
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tmp')
    mkdirSync(dir, { recursive: true })
    const outPath = join(dir, 'llaves-kyorugi-prueba-local.xlsx')
    writeFileSync(outPath, Buffer.from(buffer))
    console.log('\n✓ Excel generado:', outPath, '\n')
  })
})
