/** Grupos de edad Festival Kyorugi (planilla oficial FestCup). */

export const FESTIVAL_GRUPOS = [
  { key: 'pre_infantil', edadMin: 4, edadMax: 5, edadLabel: '4 A 5 AÑOS', division: 'PRE INFANTIL', orden: 1 },
  { key: 'infantil_a', edadMin: 6, edadMax: 7, edadLabel: '6 A 7 AÑOS', division: 'INFANTIL A', orden: 2 },
  { key: 'infantil_b', edadMin: 8, edadMax: 9, edadLabel: '8 A 9 AÑOS', division: 'INFANTIL B', orden: 3 },
  { key: 'pre_cadete', edadMin: 10, edadMax: 11, edadLabel: '10 A 11 AÑOS', division: 'PRE CADETE', orden: 4 },
  { key: 'cadete', edadMin: 12, edadMax: 14, edadLabel: '12 A 14 AÑOS', division: 'CADETE', orden: 5 },
  { key: 'juvenil', edadMin: 15, edadMax: 17, edadLabel: '15 A 17 AÑOS', division: 'JUVENIL', orden: 6 },
  { key: 'senior', edadMin: 18, edadMax: 99, edadLabel: '18 A MAS', division: 'SENIOR', orden: 7 },
]

/** Resuelve grupo festival por edad WT (años cumplidos al 31-dic del año del campeonato). */
export function divisionFestivalPorEdad(edad) {
  if (edad == null || Number.isNaN(edad)) return null
  return FESTIVAL_GRUPOS.find((g) => edad >= g.edadMin && edad <= g.edadMax) || null
}

/** Normaliza texto de división en hoja FESTIVAL (variantes reales 2025). */
export function divisionFestivalFromText(text) {
  const n = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!n) return null

  const rules = [
    [/PRE\s*INF|PREINF/, 'pre_infantil'],
    [/^IA$|INFANTIL\s*A|IA\s*NOV/, 'infantil_a'],
    [/^IB$|INFANTIL\s*B|IB\s*NOV/, 'infantil_b'],
    [/PRE\s*CAD|PRECADETE/, 'pre_cadete'],
    [/^CADETE$|CADETE\s/, 'cadete'],
    [/JUVENIL|JUVENILES|^JUNIOR$/i, 'juvenil'],
    [/SENIOR|MAYORES/, 'senior'],
  ]
  for (const [re, key] of rules) {
    if (re.test(n)) return FESTIVAL_GRUPOS.find((g) => g.key === key) || null
  }
  return null
}

export function parseEdadTextoExcel(val) {
  const m = String(val || '').match(/(\d{1,2})\s*A[NÑ]OS/i)
  return m ? Number(m[1]) : null
}

/** Fecha aproximada desde edad declarada en Excel (ej. "27 AÑOS"). */
export function fechaDesdeEdadDeclarada(edad, anioCampeonato) {
  if (edad == null || !anioCampeonato) return null
  const y = anioCampeonato - edad
  return `${y}-06-15`
}

export function compararParticipantesFestival(a, b) {
  const sa = a.sexo === 'F' ? 0 : a.sexo === 'M' ? 1 : 2
  const sb = b.sexo === 'F' ? 0 : b.sexo === 'M' ? 1 : 2
  if (sa !== sb) return sa - sb
  return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
}
