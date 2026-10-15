/** Panel dedicado Taekwondo FestCup 2026 */
export const FESTCUP_EVENT_ID = 10
export const FESTCUP_EVENT_SLUG = 'festcup-2026'

export function isFestcupEventAdmin(user) {
  if (!user) return false
  if (Number(user.id_campeonato) === FESTCUP_EVENT_ID) return true
  const u = `${user.username || ''}`.toUpperCase()
  return u === 'FESTCUP26' || u === 'ADMIN.FESTCUP'
}

export function festcupEventBasePath() {
  return `/admin/campeonatos/${FESTCUP_EVENT_ID}`
}

export function festcupAllowedPath(pathname) {
  if (!pathname) return false
  if (pathname === '/admin/festcup' || pathname.startsWith('/admin/festcup/')) return true
  if (pathname === '/arbitro' || pathname.startsWith('/arbitro/')) return true
  const base = festcupEventBasePath()
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Enlaces del hub FestCup (Material Symbols) */
export function festcupHubSections() {
  const base = festcupEventBasePath()
  const pub = `/campeonato/${FESTCUP_EVENT_SLUG}`
  return [
    {
      title: 'Inscripciones',
      accent: '#007AFF',
      items: [
        { href: `${base}/academias`, icon: 'school', label: 'Academias', desc: 'Aprobar y gestionar clubes' },
        { href: `${base}/pagos`, icon: 'payments', label: 'Pagos', desc: 'Comprobantes y dorsales', highlight: true },
        { href: `${base}?tab=inscripciones`, icon: 'groups', label: 'Participantes', desc: 'Todas las líneas' },
        { href: `${base}/tarifas`, icon: 'sell', label: 'Tarifas coaches', desc: 'Precios oficiales' },
      ],
    },
    {
      title: 'Competencia',
      accent: '#5856D6',
      items: [
        { href: `${base}/llaves`, icon: 'account_tree', label: 'Llaves Kyorugi', desc: 'Generar e imprimir' },
        { href: `${base}/poomsae`, icon: 'format_list_numbered', label: 'Poomsae', desc: 'Orden y puntajes' },
        { href: `${base}/pesaje`, icon: 'scale', label: 'Pesaje', desc: 'Control de peso' },
        { href: `${base}/podios`, icon: 'emoji_events', label: 'Podios', desc: 'Resultados' },
        { href: `${base}/festival`, icon: 'celebration', label: 'Festival', desc: 'Planilla festival' },
      ],
    },
    {
      title: 'Evento en vivo',
      accent: '#DC2626',
      items: [
        { href: '/arbitro', icon: 'sports_martial_arts', label: 'Mesa árbitros', desc: 'Marcador y poomsae' },
        { href: `${pub}/canchas`, icon: 'tv', label: 'Canchas público', desc: 'Pantallas', external: true },
        { href: `${pub}/llamados`, icon: 'campaign', label: 'Llamados', desc: 'Cola en vivo', external: true },
        { href: `${pub}/resultados`, icon: 'leaderboard', label: 'Resultados', desc: 'Web pública', external: true },
      ],
    },
    {
      title: 'Impresión',
      accent: '#F59E0B',
      items: [
        { href: `${base}/credenciales`, icon: 'badge', label: 'Credenciales', desc: 'Imprimir acreditaciones', highlight: true },
        { href: `${base}/llaves/imprimir`, icon: 'print', label: 'Llaves PDF', desc: 'Formato área' },
      ],
    },
    {
      title: 'Enlaces',
      accent: '#25D366',
      items: [
        { href: `/portal/${FESTCUP_EVENT_SLUG}`, icon: 'public', label: 'Portal academias', desc: 'Inscripción online', external: true },
        { href: `/inscripcion/${FESTCUP_EVENT_SLUG}`, icon: 'how_to_reg', label: 'Ficha pública', desc: 'Registro', external: true },
        { href: base, icon: 'dashboard', label: 'Detalle campeonato', desc: 'Resumen completo' },
      ],
    },
  ]
}
