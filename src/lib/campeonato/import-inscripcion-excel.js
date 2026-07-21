import * as XLSX from 'xlsx'
import { edadWT, MODALIDADES } from '@/lib/campeonato/constants'
import { divisionFestivalPorEdad, divisionFestivalFromText, parseEdadTextoExcel, fechaDesdeEdadDeclarada } from '@/lib/campeonato/festival-grupos'
import {
  decodeKyorugiCodigoExcel,
  inferGradoFromPoomsae,
  inferSexoFromNombre,
  matchPerfilPorNombre,
  normTxt,
  parseFechaExcel,
  parsePesoExcel,
  perfilKeyFromNombre,
  resolverCategoriaGrupoPoomsae,
  resolverCategoriaKyorugi,
  resolverCategoriaPoomsae,
  splitNombreCompleto,
  docTemporalImport,
} from '@/lib/campeonato/import-excel-categorias'

function sheetRows(wb, ...names) {
  for (const want of names) {
    const hit = wb.SheetNames.find((n) => {
      const a = normTxt(n)
      const b = normTxt(want)
      return a === b || a.includes(b) || b.includes(a)
    })
    if (hit) {
      const ws = wb.Sheets[hit]
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
    }
  }
  return []
}

/** Encuentra fila de cabecera (N° + Nombres…) — datos empiezan en la siguiente. */
function dataStartIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i] || []
    const c0 = normTxt(r[0])
    const c1 = normTxt(r[1])
    if ((c0 === 'N' || c0.startsWith('N°') || c0 === 'NO') && c1.includes('NOMBRE')) {
      return i + 1
    }
  }
  return 9
}

function looksLikeWeightText(s) {
  const n = normTxt(s)
  return /-\s*\d+\s*KG|\+\s*\d+\s*KG|\d+\s*KG/.test(n) || /^-\s*\d+/.test(n)
}

function isSectionHeader(row) {
  const a = normTxt(row[0])
  const b = normTxt(row[1])
  const label = a || b
  return ['PAREJAS', 'EQUIPO', 'FREESTYLE', 'FESTIVAL'].includes(label)
}

function sectionType(row) {
  const label = normTxt(row[0]) || normTxt(row[1])
  if (label === 'PAREJAS') return 'parejas'
  if (label === 'EQUIPO') return 'equipo'
  if (label === 'FREESTYLE') return 'freestyle'
  return null
}

function parseSexo(val) {
  const s = normTxt(val)
  if (s === 'M' || s.startsWith('MASC')) return 'M'
  if (s === 'F' || s.startsWith('FEM')) return 'F'
  return null
}

function looksLikeCategoryText(s) {
  const n = normTxt(s)
  if (!n) return false
  if (decodeKyorugiCodigoExcel(n).division) return true
  return /CADET|JUNIOR|JUVENIL|SENIOR|MASTER|INFANTIL|PRE|MAYORES|NOVEL|AVANZ|FESTIVAL|KG|^IA$|^IB$|^I\s*B|^I\s*A|^C\s|^J\s|^C\d|^IB\d|^IA\d|MAS/.test(n)
}

function parseKyorugiRow(row, ctx) {
  const nombre = String(row[1] || '').trim()
  if (!nombre) return null
  if (/^(COLEGIO|ACADEMIA|INSTITUCION|ASOCIACION|CLUB)\b/i.test(nombre)) return null

  const fecha = parseFechaExcel(row[2])
  let codigo = String(row[3] || '').trim()
  let categoriaTxt = String(row[4] || '').trim()
  let pesoRaw = row[5] ?? row[6]
  let sexo = parseSexo(row[5] ?? row[6])

  if (looksLikeCategoryText(String(row[4] || '')) && !looksLikeWeightText(row[4]) && parseSexo(row[5]) && (parsePesoExcel(row[6]) != null || looksLikeWeightText(row[6]))) {
    categoriaTxt = String(row[4] || '').trim()
    sexo = parseSexo(row[5])
    pesoRaw = row[6]
    codigo = String(row[3] || '').trim()
  } else if (looksLikeCategoryText(row[3]) && (looksLikeWeightText(row[4]) || typeof row[4] === 'number' || parsePesoExcel(row[4]) != null)) {
    categoriaTxt = String(row[3] || '').trim()
    pesoRaw = typeof row[6] === 'number' && row[6] > 0 ? row[6] : row[4]
    sexo = parseSexo(row[5]) || sexo
    codigo = ''
  } else if (looksLikeCategoryText(codigo) && looksLikeWeightText(categoriaTxt)) {
    pesoRaw = typeof row[6] === 'number' && row[6] > 0 ? row[6] : categoriaTxt
    sexo = parseSexo(row[5]) || sexo
    categoriaTxt = codigo
    codigo = ''
  } else if (looksLikeCategoryText(row[3]) && (typeof row[4] === 'number' || parsePesoExcel(row[4]) != null)) {
    categoriaTxt = String(row[3] || '').trim()
    pesoRaw = row[4]
    sexo = parseSexo(row[5]) || sexo
  } else if (looksLikeCategoryText(codigo) && !categoriaTxt) {
    categoriaTxt = codigo
    codigo = ''
    pesoRaw = row[4]
    sexo = parseSexo(row[5]) || sexo
  } else if (decodeKyorugiCodigoExcel(codigo).division || decodeKyorugiCodigoExcel(codigo).sexo) {
    const decoded = decodeKyorugiCodigoExcel(codigo)
    categoriaTxt = decoded.categoriaTexto || codigo
    if (decoded.sexo) sexo = decoded.sexo
    pesoRaw = typeof row[4] === 'number' ? row[4] : parsePesoExcel(row[4]) != null ? row[4] : row[5]
    sexo = sexo || parseSexo(row[5])
    codigo = ''
  } else if (parsePesoExcel(categoriaTxt) != null && !looksLikeCategoryText(categoriaTxt)) {
    pesoRaw = categoriaTxt
    categoriaTxt = codigo || ''
    codigo = ''
    sexo = parseSexo(row[5]) || sexo
  } else if (parsePesoExcel(codigo) != null && !looksLikeCategoryText(codigo)) {
    pesoRaw = codigo
    categoriaTxt = ''
    codigo = ''
    sexo = parseSexo(row[4]) || parseSexo(row[5]) || sexo
  }

  if (!sexo) sexo = inferSexoFromNombre(nombre)

  const peso = parsePesoExcel(pesoRaw)
  const perfil = ctx.ensurePerfil({ nombre, fecha, sexo, grado: null, sheet: 'KYORUGUI', codigo })

  const cat = resolverCategoriaKyorugi(ctx.categorias, {
    categoriaTexto: categoriaTxt || codigo,
    pesoRaw: peso ?? pesoRaw,
    sexo: perfil.sexo,
    perfil,
    anio: ctx.anio,
  })

  return {
    tipo: 'kyorugi_individual',
    perfilKeys: [perfil.key],
    idCategoria: cat?.id_categoria || null,
    categoriaNombre: cat?.nombre || categoriaTxt || '—',
    pesoDeclarado: peso,
    label: `${nombre} · Kyorugi ${cat?.nombre || categoriaTxt || ''}`.trim(),
    hoja: 'KYORUGUI',
    errores: cat ? [] : ['No se pudo resolver categoría kyorugi'],
    advertencias: !perfil.fecha_nacimiento ? ['Sin fecha de nacimiento — verifica categoría'] : [],
  }
}

function parsePoomsaeIndividualRow(row, ctx) {
  const nombre = String(row[1] || '').trim()
  if (!nombre) return null

  const fecha = parseFechaExcel(row[2])
  const division = String(row[3] || '').trim()
  const poomsae = String(row[4] || '').trim()
  if (!division && !poomsae) return null
  const sexo = parseSexo(row[5])
  const gradoHint = inferGradoFromPoomsae(poomsae)

  const perfil = ctx.ensurePerfil({ nombre, fecha, sexo, grado: gradoHint, sheet: 'POOMSAE' })

  const cat = resolverCategoriaPoomsae(ctx.categorias, {
    divisionTexto: division,
    poomsaeTexto: poomsae,
    sexo: perfil.sexo,
    perfil,
    anio: ctx.anio,
  })

  return {
    tipo: 'poomsae_individual',
    perfilKeys: [perfil.key],
    idCategoria: cat?.id_categoria || null,
    categoriaNombre: cat?.nombre || `${division} ${poomsae}`.trim(),
    label: `${nombre} · Poomsae ${cat?.nombre || division}`.trim(),
    hoja: 'POOMSAE',
    errores: cat ? [] : ['No se pudo resolver división poomsae'],
    advertencias: !perfil.fecha_nacimiento ? ['Sin fecha de nacimiento'] : [],
  }
}

function parseFestivalRow(row, ctx) {
  const nombre = String(row[1] || '').trim()
  if (!nombre) return null

  let fecha = parseFechaExcel(row[2])
  let edadDeclarada = parseEdadTextoExcel(row[2])
  if (edadDeclarada == null && typeof row[2] === 'number' && row[2] >= 4 && row[2] <= 30) {
    edadDeclarada = row[2]
  }
  if (!fecha && edadDeclarada != null) {
    fecha = fechaDesdeEdadDeclarada(edadDeclarada, ctx.anio)
  }

  const col3 = String(row[3] || '').trim()
  const col4 = String(row[4] || '').trim()
  let sexo = parseSexo(row[5])
  if (!sexo && looksLikeWeightText(col4)) sexo = parseSexo(row[5])

  let divisionHint = col4
  if (normTxt(col3) === 'FESTIVAL' && col4) {
    divisionHint = col4
    sexo = parseSexo(row[5]) || sexo
  } else if (normTxt(col4) === 'FESTIVAL' && col3) {
    divisionHint = col3
  } else if (normTxt(col3) === 'FESTIVAL' && divisionFestivalFromText(String(row[2] || ''))) {
    divisionHint = String(row[2] || '').trim()
  } else if (divisionFestivalFromText(col3) && !divisionFestivalFromText(col4)) {
    divisionHint = col3
  } else if (normTxt(col3) === 'FESTIVAL' && looksLikeWeightText(col4)) {
    divisionHint = null
    sexo = parseSexo(row[5]) || sexo
  } else if (normTxt(col3) === 'FESTIVAL' && !col4) {
    divisionHint = null
  } else if (looksLikeWeightText(col4) && !divisionFestivalFromText(col4)) {
    divisionHint = divisionFestivalFromText(col3) ? col3 : null
  }

  if (!sexo) sexo = inferSexoFromNombre(nombre)

  const perfil = ctx.ensurePerfil({ nombre, fecha, sexo, grado: '10º kup', sheet: 'FESTIVAL' })

  const edad = fecha ? edadWT(fecha, ctx.anio) : edadDeclarada
  const grupo = divisionFestivalFromText(divisionHint) || divisionFestivalPorEdad(edad)

  const advertencias = ['Importado desde hoja Festival']
  if (!fecha && !edadDeclarada && divisionHint) advertencias.push('Sin fecha — división tomada del Excel')
  if (edadDeclarada && !parseFechaExcel(row[2])) advertencias.push(`Edad declarada: ${edadDeclarada} años`)

  return {
    tipo: 'festival',
    perfilKeys: [perfil.key],
    idCategoria: null,
    categoriaNombre: grupo?.division || divisionHint || 'Festival',
    label: `${nombre} · Festival ${grupo?.division || divisionHint || ''}`.trim(),
    hoja: 'FESTIVAL',
    errores: grupo ? [] : ['Festival: no se pudo determinar división (revisa edad o categoría)'],
    advertencias,
  }
}

function looksLikeNombrePersona(text) {
  const n = String(text || '').trim()
  if (!n || n.length < 3) return false
  const u = normTxt(n)
  if (['PAREJAS', 'EQUIPO', 'FREESTYLE', 'FESTIVAL', 'N', 'NO'].includes(u)) return false
  if (u.startsWith('NOMBRE')) return false
  if (looksLikeCategoryText(n)) return false
  if (/^\d+$/.test(u)) return false
  return true
}

/** Formato ACCTKD: categoría col B, nombres cols D/E(/F) */
function looksLikeGrupoFilaCompacta(row, miembros) {
  const names = []
  for (let i = 0; i < miembros; i++) {
    const n = String(row[3 + i] || '').trim()
    if (n) names.push(n)
  }
  return names.length >= miembros && names.every(looksLikeNombrePersona)
}

/** Formato UCV: cada integrante en fila individual (nombre col B, división col D) */
function looksLikeMiembroGrupoFilaIndividual(row) {
  if (looksLikeGrupoFilaCompacta(row, 2) || looksLikeGrupoFilaCompacta(row, 3)) return false
  const nombre = String(row[1] || '').trim()
  const division = String(row[3] || '').trim()
  const poomsae = String(row[4] || '').trim()
  if (!looksLikeNombrePersona(nombre)) return false
  // División WT (Senior, Cadete…) o forma de poomsae en cols D/E — no nombres sueltos en D/E
  if (looksLikeCategoryText(division) || looksLikeCategoryText(poomsae)) return true
  if (/^(IL|I|E|SA|OH|YOO|CHO|JIN|TI|HAN|PAL|YUK|CHIL|KORYO|KEUMGANG|TAEBAEK|PYONGWON|SIPJIN|JITAE|CHEONKWON|HANSOO|SEJONG)/.test(normTxt(poomsae))) {
    return true
  }
  return false
}

function resolverPerfilGrupo(nombre, ctx, { hoja, fecha, sexo, grado, advertenciasGrupo }) {
  let p = matchPerfilPorNombre(nombre, ctx.perfiles)
  if (!p) {
    for (const cand of ctx.perfiles.values()) {
      const full = normTxt(`${cand.nombres} ${cand.apellidos}`)
      if (full.includes(normTxt(nombre)) || normTxt(nombre).includes(normTxt(cand.nombres))) {
        p = cand
        break
      }
    }
  }
  if (!p) {
    p = ctx.ensurePerfil({ nombre, fecha, sexo, grado, sheet: hoja })
    advertenciasGrupo.push(`Perfil creado desde grupo: ${nombre}`)
  }
  return p
}

function buildGrupoLinea(matched, descripcion, ctx, { modalidad, hoja, advertenciasGrupo = [] }) {
  const miembros = MODALIDADES[modalidad]?.miembros || matched.length
  if (matched.length < miembros) {
    return {
      tipo: modalidad,
      perfilKeys: matched.map((p) => p.key),
      idCategoria: null,
      categoriaNombre: '—',
      label: descripcion || '—',
      hoja,
      errores: [`Faltan integrantes (${matched.length}/${miembros})`],
      advertencias: advertenciasGrupo,
      skip: true,
    }
  }

  const cat = resolverCategoriaGrupoPoomsae(ctx.categorias, descripcion, matched, ctx.anio)
  const esMixta = new Set(matched.map((p) => p.sexo)).size > 1
  let tipoFinal = modalidad
  if (modalidad === 'poomsae_pareja_reconocida' && esMixta) tipoFinal = 'poomsae_pareja_freestyle'
  if (hoja === 'FREESTYLE' || normTxt(descripcion).includes('FREESTYLE')) tipoFinal = 'poomsae_pareja_freestyle'

  const labelNombres = matched.map((p) => `${p.nombres || ''} ${p.apellidos || ''}`.trim()).filter(Boolean).join(' · ')

  return {
    tipo: tipoFinal,
    perfilKeys: matched.map((p) => p.key),
    idCategoria: cat?.id_categoria || null,
    categoriaNombre: cat?.nombre || descripcion,
    label: descripcion ? `${descripcion} (${labelNombres})` : labelNombres,
    hoja,
    errores: cat ? [] : ['No se pudo resolver categoría del grupo'],
    advertencias: [
      ...advertenciasGrupo,
      ...(esMixta && tipoFinal === 'poomsae_pareja_freestyle' ? ['Pareja mixta → Freestyle'] : []),
    ],
  }
}

function parseGrupoFromFilasIndividuales(filas, ctx, { modalidad, hoja }) {
  const advertenciasGrupo = ['Grupo armado desde filas individuales en Excel']
  const matched = []
  let descripcion = ''

  for (const row of filas) {
    const nombre = String(row[1] || '').trim()
    const fecha = parseFechaExcel(row[2])
    const division = String(row[3] || '').trim()
    const poomsae = String(row[4] || '').trim()
    const sexo = parseSexo(row[5])
    const gradoHint = inferGradoFromPoomsae(poomsae)
    if (!descripcion) descripcion = `${division} ${poomsae}`.trim()
    matched.push(resolverPerfilGrupo(nombre, ctx, { hoja, fecha, sexo, grado: gradoHint, advertenciasGrupo }))
  }

  return buildGrupoLinea(matched, descripcion, ctx, { modalidad, hoja, advertenciasGrupo })
}

function parseGrupoRow(row, ctx, { modalidad, miembros, hoja }) {
  const descripcion = String(row[1] || '').trim()
  const nombres = []
  for (let i = 0; i < miembros; i++) {
    const n = String(row[3 + i] || '').trim()
    if (n) nombres.push(n)
  }
  if (!descripcion && !nombres.length) return null

  const matched = []
  const advertenciasGrupo = []
  for (const n of nombres) {
    matched.push(resolverPerfilGrupo(n, ctx, { hoja, fecha: null, sexo: inferSexoFromNombre(n), grado: null, advertenciasGrupo }))
  }

  return buildGrupoLinea(matched, descripcion, ctx, { modalidad, hoja, advertenciasGrupo })
}

function pushGrupoLinea(lineas, linea) {
  if (!linea) return
  if (linea.skip) {
    if (linea.errores?.length) lineas.push(linea)
    return
  }
  lineas.push(linea)
}

function isFilaInstruccionGrupo(row) {
  const b = String(row[1] || '').trim()
  const u = normTxt(b)
  if (!b) return false
  if (/^(EJ|NOTA|INTEGRANTE)/.test(u)) return true
  if (u.includes('TAMBIEN PUEDE USAR') || u.includes('EJEMPLO')) return true
  return false
}

function procesarSeccionGruposPoomsae(lineas, ctx, { mode, row, bufferGrupo, pendingGrupos }) {
  const miembros = mode === 'equipo' ? 3 : 2
  const modalidad = mode === 'equipo'
    ? 'poomsae_equipo'
    : mode === 'freestyle'
      ? 'poomsae_pareja_freestyle'
      : 'poomsae_pareja_reconocida'

  const flushBuffer = () => {
    if (!bufferGrupo.length) return
    if (bufferGrupo.length < miembros) {
      lineas.push({
        tipo: modalidad,
        perfilKeys: [],
        idCategoria: null,
        categoriaNombre: '—',
        label: `Grupo incompleto (${bufferGrupo.length}/${miembros})`,
        hoja: 'POOMSAE',
        errores: [`Faltan integrantes (${bufferGrupo.length}/${miembros})`],
        advertencias: [],
      })
    } else {
      pushGrupoLinea(
        lineas,
        parseGrupoFromFilasIndividuales(bufferGrupo.slice(0, miembros), ctx, { modalidad, hoja: 'POOMSAE' }),
      )
    }
    bufferGrupo.length = 0
  }

  if (looksLikeGrupoFilaCompacta(row, miembros)) {
    flushBuffer()
    pendingGrupos.push({ row, modalidad, miembros })
    return { flushed: true }
  }

  if (looksLikeMiembroGrupoFilaIndividual(row)) {
    bufferGrupo.push(row)
    if (bufferGrupo.length >= miembros) flushBuffer()
    return { flushed: false }
  }

  if (isFilaInstruccionGrupo(row)) {
    flushBuffer()
    return { flushed: false }
  }

  if (String(row[1] || '').trim() || String(row[3] || '').trim()) {
    flushBuffer()
    pendingGrupos.push({ row, modalidad, miembros })
    return { flushed: false }
  }

  if (!String(row[1] || '').trim() && !String(row[3] || '').trim()) {
    flushBuffer()
  }
  return { flushed: false }
}

function parseEntrenadores(rows, ctx) {
  const lineas = []
  const seen = new Set()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || []
    const label = normTxt(row[0] || row[1])
    let tipoOficial = null
    if (/ENTRENADOR\s*1|^COACH$/.test(label)) tipoOficial = 'coach'
    else if (/ENTRENADOR\s*2|DELEGADO/.test(label) && !/ENTRENADOR\s*3/.test(label)) tipoOficial = 'delegado'
    else if (/ENTRENADOR\s*3/.test(label)) tipoOficial = 'delegado'
    if (!tipoOficial) continue

    const nombre = String(row[1] || row[2] || '').trim()
    if (!nombre || normTxt(nombre).includes('ENTRENADOR') || normTxt(nombre).includes('INSTITUCION')) continue
    const key = `${tipoOficial}:${normTxt(nombre)}`
    if (seen.has(key)) continue
    seen.add(key)

    const perfil = ctx.ensurePerfil({ nombre, fecha: null, sexo: null, grado: null, sheet: 'ENTRENADORES' })
    lineas.push({
      tipo: 'oficial',
      perfilKeys: [perfil.key],
      tipoOficial,
      idCategoria: null,
      categoriaNombre: tipoOficial === 'coach' ? 'Coach' : 'Delegado',
      label: `${nombre} · ${tipoOficial === 'coach' ? 'Coach' : 'Delegado'}`,
      hoja: 'ENTRENADORES',
      errores: [],
      advertencias: ['Oficial importado — confirma rol y DNI en el portal'],
    })
    if (lineas.length >= 3) break
  }

  if (!lineas.length) {
    for (const r of [
      { row: 7, tipo: 'coach', label: 'Coach' },
      { row: 8, tipo: 'delegado', label: 'Delegado' },
      { row: 9, tipo: 'delegado', label: 'Delegado' },
    ]) {
      const row = rows[r.row]
      if (!row) continue
      const nombre = String(row[1] || row[2] || '').trim()
      if (!nombre || normTxt(nombre).includes('ENTRENADOR')) continue
      const perfil = ctx.ensurePerfil({ nombre, fecha: null, sexo: null, grado: null, sheet: 'ENTRENADORES' })
      lineas.push({
        tipo: 'oficial',
        perfilKeys: [perfil.key],
        tipoOficial: r.tipo,
        idCategoria: null,
        categoriaNombre: r.label,
        label: `${nombre} · ${r.label}`,
        hoja: 'ENTRENADORES',
        errores: [],
        advertencias: ['Oficial importado — confirma rol y DNI en el portal'],
      })
    }
  }

  return lineas
}

/** Formato alternativo ASOC. DEL RIO (Hoja1 simplificada). */
function parseDelRioAltRows(rows, ctx) {
  const lineas = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || []
    const nombre = String(row[1] || '').trim()
    if (!nombre || /NOMBRES|KYERUGUI|ENTRENADOR|KYORUGUI/i.test(nombre)) continue

    const edadMatch = String(row[3] || '').match(/(\d{1,2})/)
    const edad = edadMatch ? Number(edadMatch[1]) : null
    const divisionTxt = String(row[4] || '').trim()
    const nivel = normTxt(row[5] || '')
    const peso = parsePesoExcel(row[6])

    let fecha = edad != null ? fechaDesdeEdadDeclarada(edad, ctx.anio) : null
    let sexo = inferSexoFromNombre(nombre)
    const perfil = ctx.ensurePerfil({ nombre, fecha, sexo, grado: null, sheet: 'Hoja1' })

    if (nivel.includes('FESTIVAL')) {
      const grupo = divisionFestivalFromText(divisionTxt) || divisionFestivalPorEdad(edad)
      lineas.push({
        tipo: 'festival',
        perfilKeys: [perfil.key],
        idCategoria: null,
        categoriaNombre: grupo?.division || divisionTxt,
        label: `${nombre} · Festival ${grupo?.division || divisionTxt}`,
        hoja: 'Hoja1',
        errores: grupo ? [] : ['Festival: revisa edad/división'],
        advertencias: ['Formato planilla alternativa (Del Río)'],
      })
      continue
    }

    const cat = resolverCategoriaKyorugi(ctx.categorias, {
      categoriaTexto: `${divisionTxt} ${nivel}`.trim(),
      pesoRaw: peso ?? row[6],
      sexo: perfil.sexo,
      perfil,
      anio: ctx.anio,
    })
    lineas.push({
      tipo: 'kyorugi_individual',
      perfilKeys: [perfil.key],
      idCategoria: cat?.id_categoria || null,
      categoriaNombre: cat?.nombre || divisionTxt,
      pesoDeclarado: peso,
      label: `${nombre} · Kyorugi ${cat?.nombre || divisionTxt}`,
      hoja: 'Hoja1',
      errores: cat ? [] : ['No se pudo resolver categoría kyorugi'],
      advertencias: ['Formato planilla alternativa (Del Río)'],
    })
  }
  return lineas
}

/** Parsea workbook FestCup (plantilla 2025/2026) → preview de importación. */
export function parseFestcupInscripcionExcel(buffer, { categorias = [], anioCampeonato = new Date().getFullYear() } = {}) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const perfiles = new Map()
  const lineas = []
  const advertenciasGlobales = []
  let docIdx = 0

  const ctx = {
    categorias,
    anio: anioCampeonato,
    perfiles,
    ensurePerfil({ nombre, fecha, sexo, grado, sheet, codigo }) {
      const key = perfilKeyFromNombre(nombre)
      if (perfiles.has(key)) {
        const ex = perfiles.get(key)
        if (fecha && !ex.fecha_nacimiento) ex.fecha_nacimiento = fecha
        if (sexo && !ex.sexo) ex.sexo = sexo
        if (grado && !ex.grado) ex.grado = grado
        return ex
      }
      const { nombres, apellidos } = splitNombreCompleto(nombre)
      const digits = String(codigo || '').replace(/\D/g, '')
      const docNum = /^\d{8,12}$/.test(digits) ? digits : docTemporalImport(nombre, docIdx++)
      const perfil = {
        key,
        nombres,
        apellidos,
        documento_tipo: /^\d{8}$/.test(docNum) ? 'DNI' : 'OTRO',
        documento_numero: docNum,
        sexo: sexo || null,
        fecha_nacimiento: fecha || null,
        grado: grado || null,
        sheet,
        docPendiente: !/^\d{8}$/.test(docNum),
      }
      perfiles.set(key, perfil)
      return perfil
    },
  }

  const kyorugi = sheetRows(wb, 'KYORUGUI', 'KYORUGI')
  const kyStart = dataStartIndex(kyorugi)
  for (let i = kyStart; i < kyorugi.length; i++) {
    const row = kyorugi[i]
    if (!row?.[1]) continue
    const linea = parseKyorugiRow(row, ctx)
    if (linea) lineas.push(linea)
  }

  const poomsae = sheetRows(wb, 'POOMSAE')
  const pmStart = dataStartIndex(poomsae)
  let mode = 'individual'
  const pendingGrupos = []
  const bufferGrupo = []

  for (let i = pmStart; i < poomsae.length; i++) {
    const row = poomsae[i]
    if (isSectionHeader(row)) {
      if (bufferGrupo.length) {
        procesarSeccionGruposPoomsae(lineas, ctx, { mode, row: [], bufferGrupo, pendingGrupos })
      }
      mode = sectionType(row) || mode
      continue
    }
    if (!row?.[1] && !row?.[3]) {
      if (mode === 'parejas' || mode === 'equipo' || mode === 'freestyle') {
        procesarSeccionGruposPoomsae(lineas, ctx, { mode, row, bufferGrupo, pendingGrupos })
      }
      continue
    }

    if (mode === 'parejas' || mode === 'equipo' || mode === 'freestyle') {
      procesarSeccionGruposPoomsae(lineas, ctx, { mode, row, bufferGrupo, pendingGrupos })
      continue
    }

    const linea = parsePoomsaeIndividualRow(row, ctx)
    if (linea) lineas.push(linea)
  }

  if (bufferGrupo.length) {
    procesarSeccionGruposPoomsae(lineas, ctx, { mode, row: [], bufferGrupo, pendingGrupos })
  }

  for (const g of pendingGrupos) {
    pushGrupoLinea(lineas, parseGrupoRow(g.row, ctx, { modalidad: g.modalidad, miembros: g.miembros, hoja: 'POOMSAE' }))
  }

  const festival = sheetRows(wb, 'FESTIVAL')
  const festStart = dataStartIndex(festival)
  for (let i = festStart; i < festival.length; i++) {
    const row = festival[i]
    if (!row?.[1]) continue
    const linea = parseFestivalRow(row, ctx)
    if (linea) lineas.push(linea)
  }

  lineas.push(...parseEntrenadores(sheetRows(wb, 'ENTRENADORES', 'ENTRENADOR'), ctx))

  const freestyleSheet = sheetRows(wb, 'FREESTYLE')
  const fsStart = dataStartIndex(freestyleSheet)
  for (let i = fsStart; i < freestyleSheet.length; i++) {
    const row = freestyleSheet[i]
    if (!row?.[1]) continue
    const linea = parseGrupoRow(row, ctx, { modalidad: 'poomsae_pareja_freestyle', miembros: 2, hoja: 'FREESTYLE' })
    pushGrupoLinea(lineas, linea)
  }

  if (!lineas.some((l) => ['KYORUGUI', 'POOMSAE', 'FESTIVAL', 'FREESTYLE', 'Hoja1'].includes(l.hoja))) {
    const hoja1 = sheetRows(wb, 'Hoja1')
    const header = normTxt((hoja1[0] || [])[1] || '')
    if (header.includes('NOMBRES') && (hoja1[0]?.[3] || hoja1[0]?.[4])) {
      lineas.push(...parseDelRioAltRows(hoja1, ctx))
    }
  }

  const errores = lineas.filter((l) => l.errores?.length).length
  const perfilesList = [...perfiles.values()]

  if (perfilesList.some((p) => p.docPendiente)) {
    advertenciasGlobales.push(
      'Algunos competidores no tienen DNI en el Excel. Se generó un código temporal — complétalo en el portal.',
    )
  }

  return {
    perfiles: perfilesList,
    lineas,
    resumen: {
      perfiles: perfilesList.length,
      lineas: lineas.length,
      errores,
      ok: lineas.filter((l) => !l.errores?.length).length,
    },
    advertencias: advertenciasGlobales,
  }
}

export function buildImportPreviewResponse(parsed) {
  return {
    perfiles: parsed.perfiles.map((p) => ({
      key: p.key,
      nombres: p.nombres,
      apellidos: p.apellidos,
      documento_tipo: p.documento_tipo,
      documento_numero: p.documento_numero,
      sexo: p.sexo,
      fecha_nacimiento: p.fecha_nacimiento,
      grado: p.grado,
      docPendiente: p.docPendiente,
      hoja: p.sheet,
    })),
    lineas: parsed.lineas.map((l, i) => ({
      id: i,
      tipo: l.tipo,
      perfilKeys: l.perfilKeys,
      idCategoria: l.idCategoria,
      categoriaNombre: l.categoriaNombre,
      pesoDeclarado: l.pesoDeclarado ?? null,
      tipoOficial: l.tipoOficial ?? null,
      label: l.label,
      hoja: l.hoja,
      errores: l.errores || [],
      advertencias: l.advertencias || [],
      valido: !(l.errores?.length),
    })),
    resumen: parsed.resumen,
    advertencias: parsed.advertencias,
  }
}
