import * as XLSX from 'xlsx'
import { edadWT } from '@/lib/campeonato/constants'
import { divisionFestivalPorEdad, divisionFestivalFromText, parseEdadTextoExcel, fechaDesdeEdadDeclarada } from '@/lib/campeonato/festival-grupos'
import {
  inferGradoFromPoomsae,
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
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
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
  return /CADET|JUNIOR|JUVENIL|SENIOR|MASTER|INFANTIL|PRE|MAYORES|NOVEL|AVANZ|FESTIVAL|KG/.test(n)
}

function parseKyorugiRow(row, ctx) {
  const nombre = String(row[1] || '').trim()
  if (!nombre) return null

  const fecha = parseFechaExcel(row[2])
  let codigo = String(row[3] || '').trim()
  let categoriaTxt = String(row[4] || '').trim()
  let pesoRaw = row[5] ?? row[6]
  let sexo = parseSexo(row[5] ?? row[6])

  if (looksLikeCategoryText(row[3]) && (looksLikeWeightText(row[4]) || typeof row[4] === 'number' || parsePesoExcel(row[4]) != null)) {
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
  }

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
  const edadDeclarada = parseEdadTextoExcel(row[2])
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
  } else if (divisionFestivalFromText(col3) && !divisionFestivalFromText(col4)) {
    divisionHint = col3
  } else if (normTxt(col3) === 'FESTIVAL' && looksLikeWeightText(col4)) {
    divisionHint = null
    sexo = parseSexo(row[5]) || sexo
  }

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

function parseGrupoRow(row, ctx, { modalidad, miembros, hoja }) {
  const descripcion = String(row[1] || '').trim()
  const nombres = []
  for (let i = 0; i < miembros; i++) {
    const n = String(row[3 + i] || '').trim()
    if (n) nombres.push(n)
  }
  if (!descripcion && !nombres.length) return null

  const matched = []
  const missing = []
  for (const n of nombres) {
    const p = matchPerfilPorNombre(n, ctx.perfiles)
    if (p) matched.push(p)
    else missing.push(n)
  }

  if (matched.length !== miembros) {
    return {
      tipo: modalidad,
      perfilKeys: matched.map((p) => p.key),
      idCategoria: null,
      categoriaNombre: '—',
      label: descripcion || nombres.join(' + '),
      hoja,
      errores: [`Integrantes no encontrados: ${missing.join(', ')}`],
      advertencias: [],
      skip: true,
    }
  }

  const cat = resolverCategoriaGrupoPoomsae(ctx.categorias, descripcion, matched, ctx.anio)
  const esMixta = new Set(matched.map((p) => p.sexo)).size > 1
  let tipoFinal = modalidad
  if (modalidad === 'poomsae_pareja_reconocida' && esMixta) tipoFinal = 'poomsae_pareja_freestyle'
  if (hoja === 'FREESTYLE' || normTxt(descripcion).includes('FREESTYLE')) tipoFinal = 'poomsae_pareja_freestyle'

  return {
    tipo: tipoFinal,
    perfilKeys: matched.map((p) => p.key),
    idCategoria: cat?.id_categoria || null,
    categoriaNombre: cat?.nombre || descripcion,
    label: descripcion || matched.map((p) => p.nombres).join(' + '),
    hoja,
    errores: cat ? [] : ['No se pudo resolver categoría del grupo'],
    advertencias: esMixta && tipoFinal === 'poomsae_pareja_freestyle' ? ['Pareja mixta → Freestyle'] : [],
  }
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
    const perfil = ctx.ensurePerfil({ nombre, fecha, sexo: null, grado: null, sheet: 'Hoja1' })

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
  for (let i = pmStart; i < poomsae.length; i++) {
    const row = poomsae[i]
    if (isSectionHeader(row)) {
      mode = sectionType(row) || mode
      continue
    }
    if (!row?.[1] && !row?.[3]) continue

    if (mode === 'parejas' || mode === 'freestyle') {
      const linea = parseGrupoRow(row, ctx, { modalidad: 'poomsae_pareja_reconocida', miembros: 2, hoja: 'POOMSAE' })
      if (linea && !linea.skip) lineas.push(linea)
      else if (linea?.errores?.length) lineas.push(linea)
      continue
    }
    if (mode === 'equipo') {
      const linea = parseGrupoRow(row, ctx, { modalidad: 'poomsae_equipo', miembros: 3, hoja: 'POOMSAE' })
      if (linea && !linea.skip) lineas.push(linea)
      else if (linea?.errores?.length) lineas.push(linea)
      continue
    }

    const linea = parsePoomsaeIndividualRow(row, ctx)
    if (linea) lineas.push(linea)
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
    if (linea && !linea.skip) lineas.push(linea)
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
