import { categoriasPoomsaeValidas, categoriasValidas, parseGrado } from '@/lib/campeonato/validar-categoria'
import { edadWT } from '@/lib/campeonato/constants'

/** Normaliza texto para comparación flexible */
export function normTxt(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tokeniza nombre para matching parcial */
export function tokensNombre(s) {
  return normTxt(s)
    .split(' ')
    .filter((t) => t.length > 1)
}

/** Divide nombre completo en nombres + apellidos (heurística peruana) */
export function splitNombreCompleto(full) {
  const raw = String(full || '').trim()
  if (raw.includes(',')) {
    const [a, b] = raw.split(',').map((s) => s.trim())
    if (a && b) return { nombres: a, apellidos: b }
  }
  const parts = raw.split(/\s+/).filter(Boolean)
  if (!parts.length) return { nombres: '', apellidos: '' }
  if (parts.length === 1) return { nombres: parts[0], apellidos: '—' }
  if (parts.length === 2) return { nombres: parts[0], apellidos: parts[1] }
  if (parts.length === 3) return { nombres: parts[0], apellidos: `${parts[1]} ${parts[2]}` }
  return {
    nombres: parts.slice(0, 2).join(' '),
    apellidos: parts.slice(2).join(' '),
  }
}

/** Parsea peso desde celda Excel (-46, " - 49 KG", "39+", "MÁS 39") */
export function parsePesoExcel(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val < 0 ? Math.abs(val) : val
  }
  const s = normTxt(val)
  const mas = s.match(/(?:MAS|MA\s*S)\s*(\d+)/)
  if (mas) return Number(mas[1]) + 0.5
  const plus = s.match(/(\d+)\s*\+|^\+\s*(\d+)/)
  if (plus) return Number(plus[1] || plus[2]) + 0.5
  const minus = s.match(/-\s*(\d+)/)
  if (minus) return Number(minus[1])
  const kg = s.match(/(\d{2,3})\s*KG/)
  if (kg) return Number(kg[1])
  const num = s.match(/^(\d{2,3})$/)
  if (num) return Number(num[1])
  return null
}

function formatYmd(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Parsea fecha DD/MM/YYYY, MM/DD/YY (US), Excel serial o Date nativo */
export function parseFechaExcel(val) {
  if (!val && val !== 0) return null
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return formatYmd(val.getFullYear(), val.getMonth() + 1, val.getDate())
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val) && val >= 4 && val <= 99) return null
    const epoch = new Date(Date.UTC(1899, 11, 30))
    epoch.setUTCDate(epoch.getUTCDate() + val)
    return formatYmd(epoch.getUTCFullYear(), epoch.getUTCMonth() + 1, epoch.getUTCDate())
  }
  const s = String(val).trim().replace(/\r\n/g, '')
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    let y = Number(m[3])
    if (y < 100) y += y > 30 ? 1900 : 2000
    const ddmm = formatYmd(y, b, a)
    if (ddmm) return ddmm
    const mmdd = formatYmd(y, a, b)
    if (mmdd) return mmdd
    return null
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, d] = s.slice(0, 10).split('-').map(Number)
    return formatYmd(y, mo, d)
  }
  return null
}

/** FestCup 2026 · división kyorugi por edad WT */
export function divisionKyorugiPorEdad(edad) {
  if (edad == null || Number.isNaN(edad)) return null
  if (edad <= 5) return 'Pre Infantil'
  if (edad <= 7) return 'Infantil A'
  if (edad <= 9) return 'Infantil B'
  if (edad <= 11) return 'Pre Cadete'
  if (edad <= 14) return 'Cadete'
  if (edad <= 17) return 'Juvenil'
  return 'Mayores'
}

/** FestCup 2026 · división poomsae por edad WT */
export function divisionPoomsaePorEdad(edad) {
  if (edad == null || Number.isNaN(edad)) return null
  if (edad <= 5) return 'Pre Infantil'
  if (edad <= 7) return 'Infantil A'
  if (edad <= 9) return 'Infantil B'
  if (edad <= 11) return 'Pre Cadete'
  if (edad <= 14) return 'Cadete'
  if (edad <= 17) return 'Junior'
  if (edad <= 30) return 'Senior 1'
  if (edad <= 40) return 'Senior 2'
  if (edad <= 50) return 'Master 1'
  if (edad <= 60) return 'Master 2'
  if (edad <= 65) return 'Master 3'
  return 'Master 4'
}

/** Extrae nivel kyorugi Festival / Noveles / Avanzados del texto */
export function nivelKyorugiFromText(text) {
  const n = normTxt(text)
  if (!n) return null
  if (/AVANZ/.test(n)) return 'Avanzados'
  if (/NOVEL/.test(n)) return 'Noveles'
  if (/FESTIVAL/.test(n)) return 'Festival'
  return null
}

function sameDivisionAlias(a, b) {
  const x = normTxt(a)
  const y = normTxt(b)
  if (!x || !y) return false
  if (x === y) return true
  const pairs = [
    ['JUNIOR', 'JUVENIL'],
    ['SENIOR', 'MAYORES'],
    ['PRE CADETE', 'PRE-CADETE'],
  ]
  for (const [p, q] of pairs) {
    if ((x === p && y === q) || (x === q && y === p)) return true
  }
  return false
}

/** Grado placeholder por nivel (para filtrar categorías cuando el Excel no trae grado) */
export function gradoDesdeNivelKyorugi(nivel) {
  if (nivel === 'Festival') return '9º kup'
  if (nivel === 'Noveles') return '5º kup'
  if (nivel === 'Avanzados') return '1º kup'
  return null
}

/** Parsea grado desde celda Excel ("5to kup", "1er dan", "2º poom") */
export function parseGradoExcel(val) {
  if (!val && val !== 0) return null
  const parsed = parseGrado(String(val))
  if (!parsed) return null
  if (parsed.tipo === 'dan') return `${parsed.nivel}º dan`
  if (parsed.tipo === 'poom') return `${parsed.nivel}º poom`
  if (parsed.tipo === 'kup') return `${parsed.nivel}º kup`
  return null
}

const DIVISION_ALIASES_KYORUGI = [
  [/PRE\s*INF.*AVANZ|IA\s*AVANZ/i, 'Infantil B'],
  [/PRE\s*INF.*NOVEL|IA\s*NOVELES/i, 'Infantil A'],
  [/PRE\s*INF|PREINF/i, 'Pre Infantil'],
  [/^IA$|INFANTIL\s*A|^I\s+A\s|IA\d/i, 'Infantil A'],
  [/^IB$|INFANTIL\s*B|^I\s+B\s|IB\d/i, 'Infantil B'],
  [/^PRE$|^PRE\s*CADETE$|PRECADETE|PRE\s*CAD/i, 'Pre Cadete'],
  [/^CADETE$|CADETE\s*[-\s]|^C\s|^C\d|^C\s*NOV/i, 'Cadete'],
  [/^JUNIOR$|^JUVENIL/i, 'Juvenil'],
  [/MAYORES|SENIOR(?!\s*[12I])/i, 'Mayores'],
  [/SENIOR\s*1|SENIOR\s*I\b/i, 'Mayores'],
  [/SENIOR\s*2|SENIOR\s*II/i, 'Mayores'],
]

const DIVISION_ALIASES_POOMSAE = [
  [/PRE\s*INF|PREINF/i, 'Pre Infantil'],
  [/^IA$|INFANTIL\s*A|^I\s+A\s|IA\d/i, 'Infantil A'],
  [/^IB$|INFANTIL\s*B|^I\s+B\s|IB\d/i, 'Infantil B'],
  [/^INFANTIL$/i, 'Infantil'],
  [/^PRE$|^PRE\s*CADETE$|PRECADETE|PRE\s*CAD/i, 'Pre Cadete'],
  [/^CADETE$|CADETE\s*[-\s]/i, 'Cadete'],
  [/^JUNIOR$|^JUVENIL/i, 'Junior'],
  [/SENIOR\s*1|SENIOR\s*I\b/i, 'Senior 1'],
  [/SENIOR\s*2|SENIOR\s*II/i, 'Senior 2'],
  [/^SENIOR$/i, 'Senior'],
  [/MASTER\s*1|MASTER\s*I\b/i, 'Master 1'],
  [/MASTER\s*2|MASTER\s*II/i, 'Master 2'],
  [/MASTER\s*3|MASTER\s*III/i, 'Master 3'],
  [/MASTER\s*4|MASTER\s*IV/i, 'Master 4'],
  [/^MASTER$/i, 'Master'],
  [/MAYORES/i, 'Senior'],
]

/** @param {'kyorugi'|'poomsae'} modalidad */
export function divisionFromExcel(text, modalidad = 'kyorugi') {
  const n = normTxt(text)
  if (!n) return null
  const aliases = modalidad === 'poomsae' ? DIVISION_ALIASES_POOMSAE : DIVISION_ALIASES_KYORUGI
  for (const [re, label] of aliases) {
    if (re.test(n)) return label
  }
  if (n.includes('PRE CADET')) return 'Pre Cadete'
  if (/^IB\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Infantil B'
  if (/^IA\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Infantil A'
  if (/^C\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Cadete'
  if (/^J\d[MF]?$/.test(n.replace(/\s/g, ''))) return modalidad === 'poomsae' ? 'Junior' : 'Juvenil'
  return n
}

/** Decodifica códigos compactos de planilla (IB1M, C1F, I B NOVELES) */
export function decodeKyorugiCodigoExcel(text) {
  const n = normTxt(text)
  if (!n) return { division: null, sexo: null, categoriaTexto: null, nivel: null }

  let sexo = null
  const sexoMatch = n.match(/([MF])$/)
  if (sexoMatch && n.length <= 8) sexo = sexoMatch[1]

  const nivel = nivelKyorugiFromText(n)
  const compact = n.replace(/\s/g, '')
  if (/^IB\d?[MF]?$/.test(compact)) return { division: 'Infantil B', sexo, categoriaTexto: 'IB NOVELES', nivel: nivel || 'Noveles' }
  if (/^IA\d?[MF]?$/.test(compact)) return { division: 'Infantil A', sexo, categoriaTexto: 'IA NOVELES', nivel: nivel || 'Noveles' }
  if (/^C\d?[MF]?$/.test(compact)) return { division: 'Cadete', sexo, categoriaTexto: 'CADETE NOVELES', nivel: nivel || 'Noveles' }
  if (/^J\d?[MF]?$/.test(compact)) return { division: 'Juvenil', sexo, categoriaTexto: 'JUVENIL NOVELES', nivel: nivel || 'Noveles' }
  if (/^PC\d?[MF]?$/.test(compact)) return { division: 'Pre Cadete', sexo, categoriaTexto: 'PRE CADET NOVELES', nivel: nivel || 'Noveles' }

  if (n.includes('I B') || n.startsWith('IB ')) return { division: 'Infantil B', sexo, categoriaTexto: n, nivel }
  if (n.includes('I A') || n.startsWith('IA ')) return { division: 'Infantil A', sexo, categoriaTexto: n, nivel }
  if (/^C\s/.test(n) || n.includes('C NOV')) return { division: 'Cadete', sexo, categoriaTexto: n, nivel }
  if (/^J\s/.test(n) || n.includes('J NOV')) return { division: 'Juvenil', sexo, categoriaTexto: n, nivel }

  return { division: divisionFromExcel(n, 'kyorugi'), sexo, categoriaTexto: n, nivel }
}

/** Inferencia heurística de sexo desde nombre (planillas sin columna sexo) */
export function inferSexoFromNombre(nombre) {
  const parts = normTxt(nombre).split(' ').filter(Boolean)
  if (!parts.length) return null
  const first = parts[0]
  const female = new Set([
    'MARIA', 'ANA', 'ELENA', 'DAFNE', 'CAMILA', 'VALENTINA', 'FATIMA', 'ROXANA',
    'XIMENA', 'ALEJANDRA', 'EMILY', 'MICAELA', 'ANGELICA', 'SOFIA', 'LUCIANA',
    'FERNANDA', 'DANIELA', 'GABRIELA', 'PAOLA', 'DIANA', 'LAURA', 'ANDREA',
    'TAHIRA', 'MILETH', 'ROMINA', 'LUANA', 'ANTONELLA', 'FLORENCIA', 'BRUNA',
  ])
  const male = new Set([
    'JOSE', 'JUAN', 'CARLOS', 'LUIS', 'MIGUEL', 'PEDRO', 'DIEGO', 'MATEO',
    'SEBASTIAN', 'NICOLAS', 'RODRIGO', 'VALENTINO', 'MATTHEW', 'ADRIAN',
    'LEONARDO', 'GUILLERMO', 'BENJAMIN', 'SANTIAGO', 'AARON', 'JESUS',
  ])
  if (female.has(first)) return 'F'
  if (male.has(first)) return 'M'
  if (first.endsWith('A') && !first.endsWith('IA') && first.length > 3) return 'F'
  return null
}

const POOMSAE_FORM_ALIASES = [
  [/KIBOM|KIBON/i, 'Kibom'],
  // Taegeuk N → formas reconocidas FestCup
  [/TAEGEUK\s*1|TAEGEUK\s*IL|TAEGUK\s*1/i, 'Il Jang'],
  [/TAEGEUK\s*2|TAEGEUK\s*I\b|TAEGUK\s*2/i, 'I Jang'],
  [/TAEGEUK\s*3|TAEGUK\s*3/i, 'Sam Jang'],
  [/TAEGEUK\s*4|TAEGUK\s*4/i, 'Sa Jang'],
  [/TAEGEUK\s*5|TAEGUK\s*5/i, 'Oh Jang'],
  [/TAEGEUK\s*6|TAEGUK\s*6/i, 'Yuk Jang'],
  [/TAEGEUK\s*7|TAEGUK\s*7/i, 'Chil Jang'],
  [/TAEGEUK\s*8|TAEGUK\s*8/i, 'Pal Jang'],
  [/IL\s*JANG|ILJANG/i, 'Il Jang'],
  [/\bI\s*JANG\b|IJANG/i, 'I Jang'],
  [/SAM\s*JANG|SAMJANG|SAA\s*JANG/i, 'Sam Jang'],
  [/SA\s*JANG|SAJANG/i, 'Sa Jang'],
  [/OH\s*JANG|OHJANG/i, 'Oh Jang'],
  [/YUK\s*JANG|YUKJANG/i, 'Yuk Jang'],
  [/CHIL\s*JANG|CHILJANG/i, 'Chil Jang'],
  [/PAL\s*JANG|PALJANG/i, 'Pal Jang'],
  [/KORYO/i, 'Koryo'],
  [/KEUMGANG|KEUM\s*GANG/i, 'Keumgang'],
  [/TAEBAECK|TAEBAEK/i, 'Taebaek'],
  [/PYONGWOW|PYONG\s*WON/i, 'Pyongwon'],
  [/SIPJIN|SIP\s*JIN/i, 'Sip Jin'],
  [/JITAE/i, 'Jitae'],
  [/CHONGKWON|CHONG\s*KWON/i, 'Chongkwon'],
  [/HANSU/i, 'Hansu'],
]

/** Extrae primera forma cuando hay varias ("Koryo / Keumgang", "Taegeuk 7 y 8") */
export function poomsaeFormFromExcel(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  // Tomar primer segmento si hay múltiples formas
  const first = raw.split(/\s*\/\s*|\s+y\s+/i)[0]
  const n = normTxt(first)
  for (const [re, label] of POOMSAE_FORM_ALIASES) {
    if (re.test(n) || re.test(normTxt(raw))) {
      // Preferir match del primer segmento
      if (re.test(n)) return label
    }
  }
  for (const [re, label] of POOMSAE_FORM_ALIASES) {
    if (re.test(normTxt(raw))) return label
  }
  return null
}

export function poomsaeTieneMultiplesFormas(text) {
  const raw = String(text || '')
  return /\s*\/\s*|\s+y\s+\d|\s+y\s+[A-Z]/i.test(raw)
}

function scoreCategoria(cat, { division, nivel, peso, sexo, perfil, anio, modalidad }) {
  let score = 0
  const catDiv = normTxt(cat.division || cat.nombre)
  const wantDiv = division ? normTxt(division) : ''

  if (wantDiv && catDiv.includes(wantDiv)) score += 40
  else if (wantDiv) {
    for (const token of wantDiv.split(' ')) {
      if (token.length > 2 && catDiv.includes(token)) score += 8
    }
  }

  if (nivel && catDiv.includes(normTxt(nivel))) score += 35

  if (sexo && cat.genero && cat.genero !== 'X' && cat.genero === sexo) score += 15
  if (sexo && cat.genero === 'X') score += 5

  if (peso != null && cat.peso_max != null) {
    const min = Number(cat.peso_min || 0)
    const max = Number(cat.peso_max)
    if (peso > min && peso <= max) score += 50
    else if (Math.abs(peso - max) <= 3) score += 20
  }

  if (perfil && modalidad === 'kyorugi') {
    if (perfil.fecha_nacimiento) {
      const validas = categoriasValidas([cat], perfil, anio, peso)
      if (validas.length) score += 30
      else score -= 40
    } else if (peso != null) {
      score += 15
    }
  }
  if (perfil && modalidad === 'poomsae') {
    const validas = categoriasPoomsaeValidas([cat], perfil, anio)
    if (validas.length) score += 30
    else score -= 25
  }

  return score
}

/**
 * Resuelve categoría kyorugi FestCup 2026.
 * Prioridad: edad WT → división oficial; grado/nivel → Festival|Noveles|Avanzados; peso → banda.
 * @returns {{ cat: object|null, advertencias: string[] }}
 */
export function resolverCategoriaKyorugi(categorias, { categoriaTexto, pesoRaw, sexo, perfil, anio, gradoTexto } = {}) {
  const advertencias = []
  let texto = String(categoriaTexto || '').trim()
  let peso = parsePesoExcel(pesoRaw)
  const decoded = decodeKyorugiCodigoExcel(texto)
  if (decoded.categoriaTexto && !looksLikeWeightOnly(texto)) {
    texto = decoded.categoriaTexto
  }
  if (!sexo && decoded.sexo) sexo = decoded.sexo
  if (!peso && looksLikeWeightOnly(texto)) {
    peso = parsePesoExcel(texto)
    texto = decoded.division || ''
  }
  if (!peso && pesoRaw != null) peso = parsePesoExcel(pesoRaw)

  const divisionExcel = decoded.division || divisionFromExcel(texto, 'kyorugi')
  let nivel = decoded.nivel || nivelKyorugiFromText(texto) || nivelKyorugiFromText(categoriaTexto)

  const gradoRaw = parseGradoExcel(gradoTexto) || perfil?.grado || null
  let grado = gradoRaw
  if (!grado && nivel) {
    grado = gradoDesdeNivelKyorugi(nivel)
  }
  if (!grado && !nivel) {
    grado = gradoDesdeNivelKyorugi('Noveles')
    nivel = 'Noveles'
    advertencias.push('Sin grado/nivel — asumido Noveles; verifica cinturón')
  } else if (!nivel && grado) {
    const g = parseGrado(grado)
    if (g?.tipo === 'kup' && g.nivel >= 7) nivel = 'Festival'
    else if (g?.tipo === 'kup' && g.nivel >= 3) nivel = 'Noveles'
    else nivel = 'Avanzados'
  }

  const edad = perfil?.fecha_nacimiento ? edadWT(perfil.fecha_nacimiento, anio) : null
  const divisionEdad = divisionKyorugiPorEdad(edad)
  let division = divisionEdad || divisionExcel

  if (divisionExcel && !divisionEdad) {
    if (normTxt(divisionExcel) === 'JUNIOR') division = 'Juvenil'
    else if (normTxt(divisionExcel) === 'SENIOR') division = 'Mayores'
  }
  if (divisionEdad) {
    division = divisionEdad
    if (divisionExcel && !sameDivisionAlias(divisionExcel, divisionEdad)) {
      advertencias.push(`Excel dice ${divisionExcel} pero edad WT ${edad} → ${divisionEdad}`)
    }
  }

  const perfilMatch = {
    ...perfil,
    sexo: sexo || perfil?.sexo,
    grado: grado || perfil?.grado,
  }

  const cats = (categorias || []).filter((c) => c.modalidad === 'kyorugi')
  const validas = categoriasValidas(cats, perfilMatch, anio, peso)

  if (validas.length === 1) {
    return { cat: validas[0], advertencias }
  }

  if (validas.length > 1) {
    const ranked = validas
      .map((cat) => ({
        cat,
        score: scoreCategoria(cat, { division, nivel, peso, sexo: perfilMatch.sexo, perfil: perfilMatch, anio, modalidad: 'kyorugi' }),
      }))
      .sort((a, b) => b.score - a.score)
    return { cat: ranked[0].cat, advertencias }
  }

  // Fallback: edad/sexo/peso sin grado estricto
  const soft = cats.filter((c) => {
    if (sexo && c.genero !== 'X' && c.genero !== sexo) return false
    if (edad != null) {
      if (c.edad_min != null && edad < c.edad_min) return false
      if (c.edad_max != null && edad > c.edad_max) return false
    }
    if (peso != null && c.peso_max != null) {
      const min = Number(c.peso_min || 0)
      const max = Number(c.peso_max)
      if (peso <= min || peso > max) return false
    }
    if (nivel && !normTxt(c.division || c.nombre).includes(normTxt(nivel))) return false
    return true
  })

  if (soft.length) {
    const ranked = soft
      .map((cat) => ({
        cat,
        score: scoreCategoria(cat, { division, nivel, peso, sexo, perfil: perfilMatch, anio, modalidad: 'kyorugi' }),
      }))
      .sort((a, b) => b.score - a.score)
    if (!gradoRaw) advertencias.push('Categoría aproximada — confirma grado del atleta')
    return { cat: ranked[0].cat, advertencias }
  }

  return { cat: null, advertencias }
}

function looksLikeWeightOnly(text) {
  const n = normTxt(text)
  if (!n) return false
  return /^-\s*\d+$/.test(n) || /^\+\s*\d+$/.test(n) || /^\d{2,3}$/.test(n) || /MAS\s*\d+/.test(n)
}

/**
 * Resuelve categoría poomsae individual FestCup 2026.
 * @returns {{ cat: object|null, advertencias: string[] }}
 */
export function resolverCategoriaPoomsae(categorias, { divisionTexto, poomsaeTexto, sexo, perfil, anio } = {}) {
  const advertencias = []
  let divisionExcel = divisionFromExcel(divisionTexto, 'poomsae')
  let form = poomsaeFormFromExcel(poomsaeTexto || divisionTexto)

  if (poomsaeTieneMultiplesFormas(poomsaeTexto)) {
    advertencias.push(`Varias formas en celda — usando ${form || 'primera'}`)
  }

  const edad = perfil?.fecha_nacimiento ? edadWT(perfil.fecha_nacimiento, anio) : null
  const divisionEdad = divisionPoomsaePorEdad(edad)

  // Normalizar genéricos con edad
  if (divisionExcel === 'Infantil' || divisionExcel === 'Senior' || divisionExcel === 'Master') {
    if (divisionEdad) {
      advertencias.push(`División genérica "${divisionExcel}" → ${divisionEdad} por edad WT`)
      divisionExcel = divisionEdad
    }
  }
  if (divisionExcel === 'Juvenil') divisionExcel = 'Junior'

  let division = divisionEdad || divisionExcel
  if (divisionEdad && divisionExcel && normTxt(divisionEdad) !== normTxt(divisionExcel)
    && !['PAREJA', 'TRIO', 'EQUIPO'].some((t) => normTxt(divisionTexto || '').includes(t))
  ) {
    // Si Excel dice Pre-Cadete (Pareja) etc., no advertir por mismatch de grupo
    const excelBase = normTxt(divisionExcel).replace(/\s*(PAREJA|TRIO|EQUIPO).*$/, '').trim()
    if (excelBase && excelBase !== normTxt(divisionEdad) && !normTxt(divisionEdad).includes(excelBase) && !excelBase.includes(normTxt(divisionEdad))) {
      advertencias.push(`Excel dice ${divisionExcel} pero edad WT ${edad} → ${divisionEdad}`)
    }
    division = divisionEdad
  }

  if (!form && poomsaeTexto) {
    advertencias.push(`Forma no reconocida: ${poomsaeTexto}`)
  }

  const perfilMatch = {
    ...perfil,
    sexo: sexo || perfil?.sexo,
    grado: perfil?.grado || inferGradoFromPoomsae(poomsaeTexto) || null,
  }

  const cats = (categorias || []).filter((c) => c.modalidad === 'poomsae')

  const ranked = cats
    .map((cat) => {
      let score = scoreCategoria(cat, { division, sexo: perfilMatch.sexo, perfil: perfilMatch, anio, modalidad: 'poomsae' })
      const nombre = normTxt(cat.nombre)
      if (form && nombre.includes(normTxt(form))) score += 45
      if (division && nombre.includes(normTxt(division))) score += 25
      return { cat, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length && ranked[0].score >= 40) {
    return { cat: ranked[0].cat, advertencias }
  }

  if (perfilMatch) {
    const validas = categoriasPoomsaeValidas(cats, perfilMatch, anio)
    if (form) {
      const byForm = validas.filter((c) => normTxt(c.nombre).includes(normTxt(form)))
      if (byForm.length) return { cat: byForm[0], advertencias }
    }
    if (validas.length === 1) return { cat: validas[0], advertencias }
    if (validas.length > 1 && division) {
      const byDiv = validas.filter((c) => normTxt(c.nombre).includes(normTxt(division)))
      if (byDiv.length) return { cat: byDiv[0], advertencias }
    }
    if (validas.length) return { cat: validas[0], advertencias }
  }

  return { cat: ranked[0]?.cat || null, advertencias }
}

/** Resuelve categoría para grupo poomsae desde texto libre */
export function resolverCategoriaGrupoPoomsae(categorias, descripcion, perfiles, anio) {
  const div = divisionFromExcel(descripcion, 'poomsae')
  const form = poomsaeFormFromExcel(descripcion)
  const ref = perfiles?.[0]
  const sexo = ref?.sexo
  const edad = ref?.fecha_nacimiento ? edadWT(ref.fecha_nacimiento, anio) : null
  const division = divisionPoomsaePorEdad(edad) || div

  const cats = (categorias || []).filter((c) => c.modalidad === 'poomsae')
  const ranked = cats
    .map((cat) => {
      let score = 0
      const nombre = normTxt(cat.nombre)
      if (division && nombre.includes(normTxt(division))) score += 30
      if (form && nombre.includes(normTxt(form))) score += 30
      if (ref?.fecha_nacimiento) {
        const validas = categoriasPoomsaeValidas([cat], ref, anio)
        if (validas.length) score += 40
      } else if (div || form) {
        score += 25
      }
      if (sexo && cat.genero === sexo) score += 10
      if (cat.genero === 'X') score += 5
      return { cat, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.cat || null
}

export function inferDivisionFromPoomsaeForm() {
  return null
}

export function inferDivisionFromEdad(perfil, anio) {
  if (!perfil?.fecha_nacimiento) return null
  return divisionPoomsaePorEdad(edadWT(perfil.fecha_nacimiento, anio))
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[m][n]
}

function tokenMatchesNombre(full, token) {
  if (full.includes(token)) return true
  if (token.length < 4) return false
  for (const part of full.split(' ')) {
    if (part.length >= 4 && levenshtein(part, token) <= 1) return true
  }
  return false
}

/** Match perfil por nombre parcial dentro de un mapa */
export function matchPerfilPorNombre(nombre, perfilesMap) {
  const tokens = tokensNombre(nombre)
  if (!tokens.length) return null

  let best = null
  let bestScore = 0
  for (const p of perfilesMap.values()) {
    const full = normTxt(`${p.nombres} ${p.apellidos}`)
    let score = 0
    for (const t of tokens) {
      if (tokenMatchesNombre(full, t)) score += t.length
    }
    if (tokens[0] && full.startsWith(tokens[0])) score += 10
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  const minScore = tokens.length === 1 && tokens[0].length >= 4 ? 3 : 4
  return bestScore >= minScore ? best : null
}

export function inferGradoFromPoomsae(formLabel) {
  const form = poomsaeFormFromExcel(formLabel)
  const map = {
    Kibom: '10º kup',
    'Il Jang': '8º kup',
    'I Jang': '7º kup',
    'Sam Jang': '6º kup',
    'Sa Jang': '5º kup',
    'Oh Jang': '4º kup',
    'Yuk Jang': '3º kup',
    'Chil Jang': '2º kup',
    'Pal Jang': '1º kup',
    Koryo: '1º dan',
    Keumgang: '2º dan',
    Taebaek: '3º dan',
    Pyongwon: '4º dan',
    'Sip Jin': '5º dan',
    Sipjin: '5º dan',
    Jitae: '6º dan',
    Chongkwon: '7º dan',
    Hansu: '8º dan',
  }
  return map[form] || null
}

export function perfilKeyFromNombre(nombre) {
  return normTxt(nombre).replace(/\s+/g, '-').slice(0, 80)
}

export function docTemporalImport(nombre, idx = 0) {
  const base = normTxt(nombre).replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'ATLETA'
  return `FC26-${base}-${String(idx).padStart(3, '0')}`
}
