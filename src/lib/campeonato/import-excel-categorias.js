import { categoriasPoomsaeValidas, categoriasValidas } from '@/lib/campeonato/validar-categoria'
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
    // Enteros pequeños = edad en planillas reales, no serial Excel
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

    // Perú: DD/MM primero
    const ddmm = formatYmd(y, b, a)
    if (ddmm) return ddmm

    // US: MM/DD cuando el mes DD/MM sería inválido
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

const DIVISION_ALIASES = [
  [/PRE\s*INF.*NOVEL|IA\s*NOVELES/i, 'Infantil A'],
  [/PRE\s*INF.*AVANZ|IA\s*AVANZ/i, 'Infantil B'],
  [/^IA$|INFANTIL\s*A|^I\s+A\s|IA\d/i, 'Infantil A'],
  [/^IB$|INFANTIL\s*B|^I\s+B\s|IB\d/i, 'Infantil B'],
  [/^PRE$|^PRE\s*CADETE$|PRECADETE|PRE\s*CADET/i, 'Pre-cadete'],
  [/^CADETE$|CADETE\s*[-\s]|^C\s|^C\d|^C\s*NOV/i, 'Cadete'],
  [/^JUNIOR$|^JUVENIL/i, 'Juvenil'],
  [/SENIOR\s*1|SENIOR\s*I\b/i, 'Senior I'],
  [/SENIOR\s*2|SENIOR\s*II/i, 'Senior II'],
  [/MASTER\s*1|MASTER\s*I\b/i, 'Master I'],
  [/MASTER\s*2|MASTER\s*II/i, 'Master II'],
  [/MASTER\s*3|MASTER\s*III/i, 'Master III'],
  [/MASTER\s*4|MASTER\s*IV/i, 'Master IV'],
  [/MAYORES\s*-\s*NOVELES/i, 'Senior I'],
  [/MAYORES\s*-\s*AVANZ/i, 'Senior II'],
  [/FESTIVAL/i, 'Festival'],
]

export function divisionFromExcel(text) {
  const n = normTxt(text)
  if (!n) return null
  for (const [re, label] of DIVISION_ALIASES) {
    if (re.test(n)) return label
  }
  if (n.includes('PRE CADET') && n.includes('NOVEL')) return 'Pre-cadete'
  if (n.includes('PRE CADET') && n.includes('AVANZ')) return 'Pre-cadete'
  if (n.includes('CADET') && n.includes('NOVEL')) return 'Cadete'
  if (n.includes('CADET') && n.includes('AVANZ')) return 'Cadete'
  if (n.includes('JUVENIL') && n.includes('NOVEL')) return 'Juvenil'
  if (n.includes('JUVENIL') && n.includes('AVANZ')) return 'Juvenil'
  if (/^IB\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Infantil B'
  if (/^IA\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Infantil A'
  if (/^C\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Cadete'
  if (/^J\d[MF]?$/.test(n.replace(/\s/g, ''))) return 'Juvenil'
  return n
}

/** Decodifica códigos compactos de planilla (IB1M, C1F, I B NOVELES) */
export function decodeKyorugiCodigoExcel(text) {
  const n = normTxt(text)
  if (!n) return { division: null, sexo: null, categoriaTexto: null }

  let sexo = null
  const sexoMatch = n.match(/([MF])$/)
  if (sexoMatch && n.length <= 8) sexo = sexoMatch[1]

  const compact = n.replace(/\s/g, '')
  if (/^IB\d?[MF]?$/.test(compact)) return { division: 'Infantil B', sexo, categoriaTexto: 'IB NOVELES' }
  if (/^IA\d?[MF]?$/.test(compact)) return { division: 'Infantil A', sexo, categoriaTexto: 'IA NOVELES' }
  if (/^C\d?[MF]?$/.test(compact)) return { division: 'Cadete', sexo, categoriaTexto: 'CADETE NOVELES' }
  if (/^J\d?[MF]?$/.test(compact)) return { division: 'Juvenil', sexo, categoriaTexto: 'JUVENIL NOVELES' }
  if (/^PC\d?[MF]?$/.test(compact)) return { division: 'Pre-cadete', sexo, categoriaTexto: 'PRE CADET NOVELES' }
  if (/^M[1-4][MF]?$/.test(compact)) {
    const lvl = compact.charAt(1)
    const div = { 1: 'Master I', 2: 'Master II', 3: 'Master III', 4: 'Master IV' }[lvl] || 'Master I'
    return { division: div, sexo, categoriaTexto: n }
  }

  if (n.includes('I B') || n.startsWith('IB ')) return { division: 'Infantil B', sexo, categoriaTexto: n }
  if (n.includes('I A') || n.startsWith('IA ')) return { division: 'Infantil A', sexo, categoriaTexto: n }
  if (/^C\s/.test(n) || n.includes('C NOV')) return { division: 'Cadete', sexo, categoriaTexto: n }
  if (/^J\s/.test(n) || n.includes('J NOV')) return { division: 'Juvenil', sexo, categoriaTexto: n }

  return { division: divisionFromExcel(n), sexo, categoriaTexto: n }
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
  [/SIPJIN/i, 'Sipjin'],
]

export function poomsaeFormFromExcel(text) {
  const n = normTxt(text)
  for (const [re, label] of POOMSAE_FORM_ALIASES) {
    if (re.test(n)) return label
  }
  return null
}

function scoreCategoria(cat, { division, peso, sexo, perfil, anio, modalidad }) {
  let score = 0
  const catDiv = normTxt(cat.division || cat.nombre)
  const wantDiv = division ? normTxt(division) : ''

  if (wantDiv && catDiv.includes(wantDiv)) score += 40
  else if (wantDiv) {
    for (const token of wantDiv.split(' ')) {
      if (token.length > 2 && catDiv.includes(token)) score += 8
    }
  }

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

/** Resuelve id_categoria kyorugi desde texto Excel + peso + sexo */
export function resolverCategoriaKyorugi(categorias, { categoriaTexto, pesoRaw, sexo, perfil, anio }) {
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

  const division = decoded.division || divisionFromExcel(texto)
  const cats = (categorias || []).filter((c) => c.modalidad === 'kyorugi')

  const ranked = cats
    .map((cat) => ({
      cat,
      score: scoreCategoria(cat, { division, peso, sexo, perfil, anio, modalidad: 'kyorugi' }),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!ranked.length && peso != null) {
    const byPeso = cats.filter((c) => {
      if (sexo && c.genero !== 'X' && c.genero !== sexo) return false
      const min = Number(c.peso_min || 0)
      const max = Number(c.peso_max)
      return peso > min && peso <= max
    })
    if (byPeso.length >= 1) {
      return byPeso.sort(
        (a, b) =>
          scoreCategoria(b, { division, peso, sexo, perfil, anio, modalidad: 'kyorugi' })
          - scoreCategoria(a, { division, peso, sexo, perfil, anio, modalidad: 'kyorugi' }),
      )[0]
    }
  }

  return ranked[0]?.cat || null
}

function looksLikeWeightOnly(text) {
  const n = normTxt(text)
  if (!n) return false
  return /^-\s*\d+$/.test(n) || /^\+\s*\d+$/.test(n) || /^\d{2,3}$/.test(n) || /MAS\s*\d+/.test(n)
}

/** Resuelve categoría poomsae individual */
export function resolverCategoriaPoomsae(categorias, { divisionTexto, poomsaeTexto, sexo, perfil, anio }) {
  let division = divisionFromExcel(divisionTexto)
  const form = poomsaeFormFromExcel(poomsaeTexto || divisionTexto)
  if (!division && form) division = inferDivisionFromPoomsaeForm(form)
  if (!division && perfil?.fecha_nacimiento) {
    division = inferDivisionFromEdad(perfil, anio)
  }
  const cats = (categorias || []).filter((c) => c.modalidad === 'poomsae')

  const ranked = cats
    .map((cat) => {
      let score = scoreCategoria(cat, { division, sexo, perfil, anio, modalidad: 'poomsae' })
      const nombre = normTxt(cat.nombre)
      if (form && nombre.includes(normTxt(form))) score += 35
      if (division && nombre.includes(normTxt(division))) score += 25
      return { cat, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length) return ranked[0].cat

  if (perfil) {
    const validas = categoriasPoomsaeValidas(cats, perfil, anio)
    if (form) {
      const byForm = validas.filter((c) => normTxt(c.nombre).includes(normTxt(form)))
      if (byForm.length) return byForm[0]
    }
    if (validas.length) return validas[0]
  }
  return null
}

/** Resuelve categoría para grupo poomsae desde texto libre */
export function resolverCategoriaGrupoPoomsae(categorias, descripcion, perfiles, anio) {
  const div = divisionFromExcel(descripcion)
  const form = poomsaeFormFromExcel(descripcion)
  const ref = perfiles?.[0]
  const sexo = ref?.sexo

  const cats = (categorias || []).filter((c) => c.modalidad === 'poomsae')
  const ranked = cats
    .map((cat) => {
      let score = 0
      const nombre = normTxt(cat.nombre)
      if (div && nombre.includes(normTxt(div))) score += 30
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

const RANKING_FORMS = new Set(['Koryo', 'Keumgang', 'Taebaek', 'Pyongwon', 'Sipjin'])

export function inferDivisionFromPoomsaeForm(form) {
  if (!form) return null
  if (RANKING_FORMS.has(form)) return 'Senior I'
  if (form === 'Pal Jang') return 'Pre-cadete'
  if (form === 'Chil Jang') return 'Cadete'
  if (form === 'Yuk Jang') return 'Juvenil'
  return null
}

function inferDivisionFromEdad(perfil, anio) {
  if (!perfil?.fecha_nacimiento) return null
  const edad = edadWT(perfil.fecha_nacimiento, anio)
  if (edad == null) return null
  if (edad <= 7) return 'Infantil A'
  if (edad <= 9) return 'Infantil B'
  if (edad <= 11) return 'Pre-cadete'
  if (edad <= 14) return 'Cadete'
  if (edad <= 17) return 'Juvenil'
  if (edad <= 32) return 'Senior I'
  return 'Master I'
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
    Sipjin: '5º dan',
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
