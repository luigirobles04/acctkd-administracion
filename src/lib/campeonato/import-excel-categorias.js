import { categoriasPoomsaeValidas, categoriasValidas } from '@/lib/campeonato/validar-categoria'

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
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return { nombres: '', apellidos: '' }
  if (parts.length === 1) return { nombres: parts[0], apellidos: '—' }
  if (parts.length === 2) return { nombres: parts[0], apellidos: parts[1] }
  if (parts.length === 3) return { nombres: parts[0], apellidos: `${parts[1]} ${parts[2]}` }
  return {
    nombres: parts.slice(0, 2).join(' '),
    apellidos: parts.slice(2).join(' '),
  }
}

/** Parsea peso desde celda Excel (-46, " - 49 KG", "39+") */
export function parsePesoExcel(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val < 0 ? Math.abs(val) : val
  }
  const s = normTxt(val)
  const plus = s.match(/(\d+)\s*\+/)
  if (plus) return Number(plus[1]) + 0.5
  const minus = s.match(/-\s*(\d+)/)
  if (minus) return Number(minus[1])
  const num = s.match(/^(\d{2,3})$/)
  if (num) return Number(num[1])
  return null
}

/** Parsea fecha DD.MM.YYYY, DD/MM/YYYY, Excel serial */
export function parseFechaExcel(val) {
  if (!val && val !== 0) return null
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10)
  }
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    epoch.setUTCDate(epoch.getUTCDate() + val)
    return epoch.toISOString().slice(0, 10)
  }
  const s = String(val).trim()
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    const d = Number(m[1])
    const mo = Number(m[2])
    let y = Number(m[3])
    if (y < 100) y += 2000
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

const DIVISION_ALIASES = [
  [/PRE\s*INF.*NOVEL|IA\s*NOVELES/i, 'Infantil A'],
  [/PRE\s*INF.*AVANZ|IA\s*AVANZ/i, 'Infantil B'],
  [/^IA$|INFANTIL\s*A/i, 'Infantil A'],
  [/^IB$|INFANTIL\s*B/i, 'Infantil B'],
  [/^PRE$|^PRE\s*CADETE$|PRECADETE|PRE\s*CADET/i, 'Pre-cadete'],
  [/^CADETE$|CADETE\s*-/i, 'Cadete'],
  [/^JUNIOR$|^JUVENIL$/i, 'Juvenil'],
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
  return n
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
    const validas = categoriasValidas([cat], perfil, anio, peso)
    if (validas.length) score += 30
    else score -= 40
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
  const peso = parsePesoExcel(pesoRaw)
  const division = divisionFromExcel(categoriaTexto)
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

/** Resuelve categoría poomsae individual */
export function resolverCategoriaPoomsae(categorias, { divisionTexto, poomsaeTexto, sexo, perfil, anio }) {
  const division = divisionFromExcel(divisionTexto)
  const form = poomsaeFormFromExcel(poomsaeTexto || divisionTexto)
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
      if (ref) {
        const validas = categoriasPoomsaeValidas([cat], ref, anio)
        if (validas.length) score += 40
      }
      if (sexo && cat.genero === sexo) score += 10
      if (cat.genero === 'X') score += 5
      return { cat, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.cat || null
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
      if (full.includes(t)) score += t.length
    }
    if (tokens[0] && full.startsWith(tokens[0])) score += 10
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return bestScore >= 4 ? best : null
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
