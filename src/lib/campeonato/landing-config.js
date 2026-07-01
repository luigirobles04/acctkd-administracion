import { BUCKET } from '@/lib/campeonato/foto-competidor'

// La clave anónima sólo tiene permiso INSERT en Storage (no UPDATE/DELETE), así que en
// vez de sobrescribir un único archivo, cada guardado crea una versión nueva con timestamp
// y se lee siempre la más reciente. Las versiones viejas quedan huérfanas (archivos livianos).
const CONFIG_DIR = 'site'
const CONFIG_PREFIX = 'landing-config-'

export const LANDING_DEFAULTS = {
  heroBadge: 'Trujillo · Perú · #UniendoCampeones',
  heroTitulo: 'Taekwondo',
  heroTituloAccent: 'FestCup 2026',
  heroSubtitulo:
    'La marca de campeonato más importante del norte del Perú. Cuatro ediciones formando campeones ' +
    'con reglamento World Taekwondo, tecnología en vivo y la experiencia ACCTKD que ya conoces.',
  ctaPrimario: 'Inscribir mi academia',
  ctaSecundario: 'Ver ediciones',
  heroImagen: null,
  ctaTitulo: '¿Tu academia compite en FestCup?',
  ctaTexto:
    'Únete a las academias que ya confían en la marca FestCup. Inscripción en línea, dorsales automáticos ' +
    'y resultados en tiempo real desde el primer combate.',
  galeria: null,
}

async function ultimaVersionPath(sb) {
  const { data, error } = await sb.storage.from(BUCKET).list(CONFIG_DIR, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error || !data?.length) return null
  const versiones = data
    .filter((f) => f.name.startsWith(CONFIG_PREFIX) && f.name.endsWith('.json'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return versiones[0] ? `${CONFIG_DIR}/${versiones[0].name}` : null
}

export async function getLandingConfig(sb) {
  try {
    const path = await ultimaVersionPath(sb)
    if (!path) return { ...LANDING_DEFAULTS }
    const { data, error } = await sb.storage.from(BUCKET).download(path)
    if (error || !data) return { ...LANDING_DEFAULTS }
    const text = await data.text()
    const parsed = JSON.parse(text)
    return { ...LANDING_DEFAULTS, ...parsed }
  } catch {
    return { ...LANDING_DEFAULTS }
  }
}

export async function saveLandingConfig(sb, patch) {
  const current = await getLandingConfig(sb)
  const next = { ...current, ...patch }
  const body = Buffer.from(JSON.stringify(next, null, 2))
  const path = `${CONFIG_DIR}/${CONFIG_PREFIX}${Date.now()}.json`
  // El bucket sólo admite mime-types de imagen; el contenido real (JSON) no se sirve
  // directamente al público, sólo se lee de vuelta con getLandingConfig(), así que el
  // content-type declarado aquí es irrelevante para la integridad de los datos.
  const { error } = await sb.storage.from(BUCKET).upload(path, body, {
    contentType: 'image/png',
    upsert: false,
  })
  if (error) throw error
  return next
}
