/**
 * Simulación: 10 academias × 40 competidores distribuidos en categorías WT/FDPTKD.
 * Genera SQL en scripts/.simulacion/ — ejecutar vía Supabase MCP o psql.
 *
 * node scripts/simular-campeonato.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'scripts/.simulacion')
const bundleCat = join(root, 'scripts/.catalogo-bundle.mjs')
const bundleVal = join(root, 'scripts/.validar-bundle.mjs')

function ensureBundle(src, out) {
  if (!existsSync(out)) {
    execSync(
      `npx esbuild ${src} --bundle --platform=node --format=esm --outfile=${out} --alias:@=./src`,
      { cwd: root, stdio: 'inherit' }
    )
  }
}

ensureBundle('src/lib/campeonato/categorias-wt.js', bundleCat)
ensureBundle('src/lib/campeonato/validar-categoria.js', bundleVal)

const { CATEGORIAS_WT, CATALOG_VERSION } = await import(bundleCat)
const { categoriasValidas, categoriasPoomsaeValidas } = await import(bundleVal)

const SLUG = 'simulacion-10x40-2026'
const ANIO = 2026
const NUM_ACADEMIAS = 10

const ACADEMIA_NOMBRES = [
  'Guerreros Norte TKD',
  'Dragons Trujillo',
  'Phoenix Academy Lima',
  'Titanes Costa Norte',
  'Cobra Kai Perú',
  'Eagles Martial Arts',
  'Warrior Spirit TKD',
  'Golden Kick Academy',
  'Thunder Team Lima',
  'Andes Taekwondo Elite',
]

const PREFIJOS = ['GN', 'DT', 'PA', 'TC', 'CK', 'EA', 'WS', 'GK', 'TT', 'AT']
const GRADOS = ['10º kup', '9º kup', '8º kup', '7º kup', '6º kup', '5º kup', '4º kup', '3º kup', '2º kup', '1º kup', '1º dan', '2º dan']
const EDADES = [7, 8, 10, 11, 13, 14, 16, 17, 20, 25, 30, 35, 42, 50, 55, 62]
const ROLES_OFICIAL = ['coach', 'delegado', 'medico']

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

function campId() {
  return `(SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}')`
}

function acadId(a) {
  return `(SELECT id_academia FROM academia WHERE nombre = '${esc(ACADEMIA_NOMBRES[a])}')`
}

function acId(a) {
  return `(SELECT ac.id FROM academia_campeonato ac JOIN academia a ON a.id_academia = ac.id_academia WHERE a.nombre = '${esc(ACADEMIA_NOMBRES[a])}' AND ac.id_campeonato = ${campId()})`
}

function catId(nombre) {
  return `(SELECT id_categoria FROM categoria_campeonato WHERE id_campeonato = ${campId()} AND nombre = '${esc(nombre)}' LIMIT 1)`
}

function pesoPara(cat) {
  if (!cat?.peso_max || Number(cat.peso_max) >= 999) return Number(cat.peso_min || 50) + 2
  return Math.round(((Number(cat.peso_min || 0) + Number(cat.peso_max)) / 2) * 10) / 10
}

function claveCat(c) {
  return `${c.division}|${c.grado_rango}|${c.edad_min}|${c.edad_max}`
}

function catsPoomsaeComunes(p1, p2, tpl) {
  const a = categoriasPoomsaeValidas(tpl, p1, ANIO)
  const b = categoriasPoomsaeValidas(tpl, p2, ANIO)
  const clavesB = new Set(b.map(claveCat))
  return a.filter((c) => clavesB.has(claveCat(c)))
}

function perfil(a, p) {
  const sexo = p % 2 === 0 ? 'M' : 'F'
  const edad = EDADES[(a * 5 + p) % EDADES.length]
  return {
    documento_numero: `9${String(a * 100 + p + 1).padStart(6, '0')}`,
    nombres: sexo === 'M' ? `Competidor${p + 1}` : `Competidora${p + 1}`,
    apellidos: `Sim ${ACADEMIA_NOMBRES[a].split(' ')[0]}`,
    sexo,
    fecha_nacimiento: `${ANIO - edad}-06-15`,
    grado: GRADOS[(a + p) % GRADOS.length],
  }
}

const kyorugiTpl = CATEGORIAS_WT.filter((c) => c.modalidad === 'kyorugi')
const poomsaeTpl = CATEGORIAS_WT.filter((c) => c.modalidad === 'poomsae')

mkdirSync(outDir, { recursive: true })

// ── 00 cleanup ────────────────────────────────────────────────────
writeFileSync(join(outDir, '00-cleanup.sql'), `-- Simulación 10×40 · cleanup
DELETE FROM asignacion_pago WHERE id_linea IN (SELECT id_linea FROM linea_inscripcion WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}'));
DELETE FROM linea_inscripcion_miembro WHERE id_linea IN (SELECT id_linea FROM linea_inscripcion WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}'));
DELETE FROM linea_inscripcion WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}');
DELETE FROM competidor_perfil WHERE id_academia IN (SELECT id_academia FROM academia WHERE nombre = ANY(ARRAY[${ACADEMIA_NOMBRES.map((n) => `'${esc(n)}'`).join(',')}]));
DELETE FROM academia_campeonato WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}');
DELETE FROM campeonato_tarifa WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}');
DELETE FROM categoria_campeonato WHERE id_campeonato IN (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}');
DELETE FROM academia WHERE nombre = ANY(ARRAY[${ACADEMIA_NOMBRES.map((n) => `'${esc(n)}'`).join(',')}]);
DELETE FROM campeonato WHERE slug = '${SLUG}';
`)

// ── 01 campeonato + catálogo ──────────────────────────────────────
let sql01 = `INSERT INTO campeonato (
  nombre, slug, descripcion, fecha_inicio, fecha_fin, lugar, ciudad, estado,
  fecha_inicio_regular, fecha_fin_regular, fecha_cierre_inscripcion, fecha_gracia_pago,
  publicado, bases_version, cuenta_bancaria_info
) VALUES (
  'Simulación 10×40 — FDPTKD 2026', '${SLUG}',
  '10 academias · 40 competidores c/u · distribución en categorías WT/FDPTKD v${CATALOG_VERSION}',
  '2026-07-19', '2026-07-20', 'Coliseo ACCTKD', 'Trujillo', 'inscripciones',
  '2026-05-18', '2026-06-17', '2026-06-17', '2026-07-01',
  true, '${CATALOG_VERSION}', 'BCP · ACCTKD · CCI 12345678901234'
);

INSERT INTO categoria_campeonato (id_campeonato, nombre, genero, edad_min, edad_max, peso_min, peso_max, modalidad, division, grado_rango, orden)
SELECT ${campId()}, v.nombre, v.genero, v.edad_min, v.edad_max, v.peso_min, v.peso_max, v.modalidad, v.division, v.grado_rango, v.orden
FROM (VALUES\n`

sql01 += CATEGORIAS_WT.map((c, i) => {
  const pm = c.peso_min == null ? 'NULL::numeric' : c.peso_min
  const px = c.peso_max == null ? 'NULL::numeric' : c.peso_max
  return `  ('${esc(c.nombre)}','${c.genero}',${c.edad_min},${c.edad_max},${pm},${px},'${c.modalidad}','${esc(c.division)}','${esc(c.grado_rango)}',${c.orden})${i < CATEGORIAS_WT.length - 1 ? ',' : ''}`
}).join('\n')

sql01 += `
) AS v(nombre, genero, edad_min, edad_max, peso_min, peso_max, modalidad, division, grado_rango, orden);

INSERT INTO campeonato_tarifa (id_campeonato, modalidad, precio_regular, precio_tardia, activo) VALUES
  (${campId()}, 'kyorugi_individual', 90, 120, true),
  (${campId()}, 'poomsae_individual', 90, 120, true),
  (${campId()}, 'poomsae_pareja_reconocida', 140, 160, true),
  (${campId()}, 'poomsae_pareja_freestyle', 140, 160, true),
  (${campId()}, 'poomsae_equipo', 150, 180, true);
`
writeFileSync(join(outDir, '01-campeonato.sql'), sql01)

// ── 02 academias ──────────────────────────────────────────────────
let sql02 = ''
for (let a = 0; a < NUM_ACADEMIAS; a++) {
  sql02 += `INSERT INTO academia (nombre, telefono, codigo_prefijo) VALUES ('${esc(ACADEMIA_NOMBRES[a])}', '519${String(20000000 + a).slice(-8)}', '${PREFIJOS[a]}');\n`
}
sql02 += `\nINSERT INTO academia_campeonato (id_academia, id_campeonato, token, estado_aprobacion, estado_lista, aceptacion_bases_at, aceptacion_bases_version)
VALUES\n`
for (let a = 0; a < NUM_ACADEMIAS; a++) {
  sql02 += `  (${acadId(a)}, ${campId()}, 'simtok${a}${SLUG.replace(/-/g, '')}', 'aprobada', 'enviada', now(), '${CATALOG_VERSION}')${a < NUM_ACADEMIAS - 1 ? ',' : ';'}\n`
}
writeFileSync(join(outDir, '02-academias.sql'), sql02)

// ── 03-12 perfiles + inscripciones por academia ───────────────────
let stats = { perfiles: 0, lineas: 0, kyorugi: 0, poomsae: 0, grupos: 0, oficiales: 0, categoriasUsadas: new Set() }
let globalKy = 0
let globalPm = 0

for (let a = 0; a < NUM_ACADEMIAS; a++) {
  const perfiles = Array.from({ length: 40 }, (_, p) => perfil(a, p))
  const pid = (p) => `(SELECT id_perfil FROM competidor_perfil WHERE id_academia = ${acadId(a)} AND documento_numero = '${perfiles[p].documento_numero}')`

  let sql = `-- Academia ${a + 1}: ${ACADEMIA_NOMBRES[a]}\n`
  sql += 'INSERT INTO competidor_perfil (id_academia, documento_tipo, documento_numero, nombres, apellidos, sexo, fecha_nacimiento, grado) VALUES\n'
  sql += perfiles.map((p, i) =>
    `  (${acadId(a)}, 'DNI', '${p.documento_numero}', '${esc(p.nombres)}', '${esc(p.apellidos)}', '${p.sexo}', '${p.fecha_nacimiento}', '${esc(p.grado)}')${i < 39 ? ',' : ';'}`
  ).join('\n')

  const lineas = []

  // 16 kyorugi (0-15)
  for (let p = 0; p < 16; p++) {
    const cats = categoriasValidas(kyorugiTpl, perfiles[p], ANIO, null)
    if (!cats.length) continue
    const cat = cats[(globalKy++) % cats.length]
    lineas.push({ modalidad: 'kyorugi_individual', cat: cat.nombre, peso: pesoPara(cat), miembros: [p], precio: 90, estado: 'pendiente_pago' })
    stats.kyorugi++
    stats.categoriasUsadas.add(cat.nombre)
  }

  // 10 poomsae individual (16-25)
  for (let p = 16; p < 26; p++) {
    const cats = categoriasPoomsaeValidas(poomsaeTpl, perfiles[p], ANIO)
    if (!cats.length) continue
    const cat = cats[(globalPm++) % cats.length]
    lineas.push({ modalidad: 'poomsae_individual', cat: cat.nombre, miembros: [p], precio: 90, estado: 'pendiente_pago' })
    stats.poomsae++
    stats.categoriasUsadas.add(cat.nombre)
  }

  // 3 parejas reconocidas (26-31)
  for (let pair = 0; pair < 3; pair++) {
    const i1 = 26 + pair * 2
    const i2 = i1 + 1
    if (perfiles[i1].sexo !== perfiles[i2].sexo && pair === 0) {
      perfiles[i2] = { ...perfiles[i2], sexo: perfiles[i1].sexo }
    }
    const comunes = catsPoomsaeComunes(perfiles[i1], perfiles[i2], poomsaeTpl)
    const cat = comunes[pair % Math.max(comunes.length, 1)]
    if (!cat) continue
    lineas.push({ modalidad: 'poomsae_pareja_reconocida', cat: cat.nombre, miembros: [i1, i2], precio: 140, estado: 'pendiente_pago', grupo: true })
    stats.grupos++
    stats.categoriasUsadas.add(cat.nombre)
  }

  // freestyle mixta (32-33)
  {
    perfiles[32] = { ...perfiles[32], sexo: 'M' }
    perfiles[33] = { ...perfiles[33], sexo: 'F' }
    const comunes = catsPoomsaeComunes(perfiles[32], perfiles[33], poomsaeTpl)
    const cat = comunes[a % Math.max(comunes.length, 1)]
    if (cat) {
      lineas.push({ modalidad: 'poomsae_pareja_freestyle', cat: cat.nombre, miembros: [32, 33], precio: 140, estado: 'pendiente_pago', grupo: true })
      stats.grupos++
      stats.categoriasUsadas.add(cat.nombre)
    }
  }

  // equipo (34-36) mismo sexo M
  {
    for (let k = 34; k <= 36; k++) perfiles[k] = { ...perfiles[k], sexo: 'M' }
    const cats = categoriasPoomsaeValidas(poomsaeTpl, perfiles[34], ANIO)
    const cat = cats[(a * 3) % Math.max(cats.length, 1)]
    if (cat) {
      lineas.push({ modalidad: 'poomsae_equipo', cat: cat.nombre, miembros: [34, 35, 36], precio: 150, estado: 'pendiente_pago', grupo: true })
      stats.grupos++
      stats.categoriasUsadas.add(cat.nombre)
    }
  }

  // oficiales (37-39)
  for (let o = 0; o < 3; o++) {
    lineas.push({ modalidad: 'oficial', cat: null, miembros: [37 + o], precio: 0, estado: 'pagado', tipoOficial: ROLES_OFICIAL[o] })
    stats.oficiales++
  }

  // Insert lineas + miembros
  for (const l of lineas) {
    const grupoUuid = l.grupo ? `gen_random_uuid()` : 'NULL'
    const catSql = l.cat ? catId(l.cat) : 'NULL'
    const pesoSql = l.peso != null ? l.peso : 'NULL'
    const tipoOf = l.tipoOficial ? `'${l.tipoOficial}'` : 'NULL'

    sql += `\nWITH nueva AS (
  INSERT INTO linea_inscripcion (id_academia_campeonato, id_campeonato, modalidad, tipo_oficial, id_categoria, grupo_uuid, es_cobro, precio_aplicado, tipo_tarifa, peso_declarado, estado)
  VALUES (${acId(a)}, ${campId()}, '${l.modalidad}', ${tipoOf}, ${catSql}, ${grupoUuid}, ${l.precio > 0}, ${l.precio}, 'regular', ${pesoSql}, '${l.estado}')
  RETURNING id_linea
)
INSERT INTO linea_inscripcion_miembro (id_linea, id_perfil)
SELECT nueva.id_linea, v.id_perfil FROM nueva, (VALUES ${l.miembros.map((m) => `(${pid(m)})`).join(', ')}) AS v(id_perfil);\n`
    stats.lineas++
  }

  // Recalcular monto academia
  sql += `\nUPDATE academia_campeonato SET
  monto_total = COALESCE((SELECT SUM(precio_aplicado) FROM linea_inscripcion WHERE id_academia_campeonato = ${acId(a)} AND estado != 'anulado'), 0),
  ultimo_cambio_at = now()
WHERE id = ${acId(a)};\n`

  stats.perfiles += 40
  writeFileSync(join(outDir, `${String(a + 3).padStart(2, '0')}-academia-${a + 1}.sql`), sql)
}

// ── 13 resumen ────────────────────────────────────────────────────
writeFileSync(join(outDir, '13-resumen.sql'), `-- Verificación simulación
SELECT c.nombre, c.slug, (SELECT COUNT(*) FROM categoria_campeonato cc WHERE cc.id_campeonato = c.id_campeonato) AS categorias
FROM campeonato c WHERE slug = '${SLUG}';

SELECT a.nombre, ac.estado_aprobacion,
  (SELECT COUNT(*) FROM competidor_perfil cp WHERE cp.id_academia = a.id_academia) AS perfiles,
  (SELECT COUNT(*) FROM linea_inscripcion l WHERE l.id_academia_campeonato = ac.id AND l.estado != 'anulado') AS lineas,
  ac.monto_total
FROM academia_campeonato ac
JOIN academia a ON a.id_academia = ac.id_academia
JOIN campeonato c ON c.id_campeonato = ac.id_campeonato
WHERE c.slug = '${SLUG}'
ORDER BY a.nombre;

SELECT modalidad, COUNT(*) FROM linea_inscripcion WHERE id_campeonato = (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}') AND estado != 'anulado' GROUP BY modalidad ORDER BY modalidad;

SELECT cc.modalidad, COUNT(DISTINCT l.id_categoria) AS categorias_con_inscritos, COUNT(l.id_linea) AS lineas
FROM linea_inscripcion l
JOIN categoria_campeonato cc ON cc.id_categoria = l.id_categoria
WHERE l.id_campeonato = (SELECT id_campeonato FROM campeonato WHERE slug = '${SLUG}') AND l.estado != 'anulado'
GROUP BY cc.modalidad;
`)

writeFileSync(join(outDir, 'README.txt'), `Simulación 10×40 generada.

Slug: ${SLUG}
Portal: /portal/${SLUG}
Admin: /admin/campeonatos/[id]

Estadísticas generadas:
- Academias: ${NUM_ACADEMIAS}
- Perfiles: ${stats.perfiles}
- Líneas inscripción: ${stats.lineas}
- Kyorugi: ${stats.kyorugi} · Poomsae ind: ${stats.poomsae} · Grupos: ${stats.grupos} · Oficiales: ${stats.oficiales}
- Categorías distintas usadas: ${stats.categoriasUsadas.size}

Ejecutar en orden: 00 → 01 → 02 → 03..12 → 13
`)

console.log(JSON.stringify({ slug: SLUG, ...stats, categoriasUsadas: stats.categoriasUsadas.size, outDir }, null, 2))
