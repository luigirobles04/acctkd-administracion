/** Contenido del landing FestCup — enfoque en inscripción de academias. */
import { FESTCUP_DOCS, FESTCUP_SOCIAL, FESTCUP_VENUE } from '@/lib/site-config'

export { FESTCUP_DOCS, FESTCUP_SOCIAL, FESTCUP_VENUE }

export const FESTCUP_STATS = [
  { value: 4, label: 'Años organizando', suffix: '+' },
  { value: 500, label: 'Competidores', suffix: '+' },
  { value: 50, label: 'Academias', suffix: '+' },
  { value: 3, label: 'Áreas en vivo', suffix: '' },
]

/** Una edición = un poster protagonista en el legado. */
export const FESTCUP_LEGADO = [
  {
    year: '2026',
    poster: '/landing/galeria/festcup-2026-poster.png',
    alt: 'Poster Taekwondo FestCup 2026',
    title: 'Taekwondo FestCup 2026',
    fecha: 'Sab 7 de Noviembre',
    lugar: 'Coliseo Gran Chimú · Trujillo',
    desc: 'La edición más ambiciosa de la historia. Kyorugi, Poomsae y Free Style — ¿tu academia estará en el tatami?',
    tag: 'Inscripciones abiertas',
    highlight: true,
  },
  {
    year: '2025',
    poster: '/landing/galeria/festcup-2025-poster.png',
    alt: 'Poster FestCup 2025',
    title: 'FestCup 2025',
    fecha: 'Sab 22 de Noviembre',
    lugar: 'Coliseo Gran Chimú · Trujillo',
    desc: 'Más de 450 competidores, gradas llenas y la energía que solo FestCup sabe crear.',
    tag: 'Edición 2025',
  },
  {
    year: '2024',
    poster: '/landing/galeria/festcup-2024-kyorugi.png',
    alt: 'Poster Kyorugi FestCup 2024',
    title: 'FestCup 2024',
    fecha: 'Sab 23 de Noviembre',
    lugar: 'Coliseo Gran Chimú · Trujillo',
    desc: 'Combate, adrenalina y podios épicos — la edición que consolidó el formato Kyorugi + Poomsae + Free Style.',
    tag: 'Edición 2024',
  },
  {
    year: '2023',
    poster: '/landing/galeria/festcup-2023-poster.png',
    alt: 'Poster FestCup 2023',
    title: 'FestCup 2023',
    fecha: 'Sab 25 de Noviembre',
    lugar: 'Coliseo Inca · Jr. Estete 410 · Trujillo',
    desc: 'Consolidamos Trujillo como la capital del taekwondo competitivo del norte del Perú.',
    tag: '#UniendoCampeones',
  },
  {
    year: '2022',
    poster: '/landing/galeria/festcup-2022-poster.png',
    alt: 'Poster FestCup 2022',
    title: 'FestCup 2022 · Spring Season',
    fecha: '19 de Noviembre',
    lugar: 'Trujillo · Perú',
    desc: 'Donde empezó todo. El primer FestCup — el origen de una marca que hoy reúne a cientos de atletas.',
    tag: 'Edición inaugural',
  },
]

/** Posters extra para marquee / galería secundaria. */
export const FESTCUP_POSTERS = [
  ...FESTCUP_LEGADO.map((e) => ({
    year: e.year,
    src: e.poster,
    alt: e.alt,
    fecha: e.fecha,
    lugar: e.lugar,
    tag: e.tag,
    highlight: e.highlight,
  })),
  {
    year: '2024',
    src: '/landing/galeria/festcup-2024-kyorugi.png',
    alt: 'Poster Kyorugi FestCup 2024',
    fecha: 'Kyorugi · Poomsae · Free Style',
    lugar: 'FestCup 2024',
    tag: 'Kyorugi 2024',
  },
  {
    year: '2023',
    src: '/landing/galeria/festcup-2023-acuarela.png',
    alt: 'Poster acuarela FestCup 2023',
    fecha: '#UniendoCampeones',
    lugar: 'FestCup 2023',
    tag: '2023',
  },
]

export const FESTCUP_MOMENTOS = [
  { src: '/landing/galeria/competencia-publico.png', alt: 'Competencia con público', caption: 'El coliseo lleno de energía' },
  { src: '/landing/galeria/podio-campeones.png', alt: 'Podio de campeones', caption: 'Sube al podio' },
  { src: '/landing/galeria/arena-tres-areas.png', alt: 'Tres áreas', caption: '3 áreas simultáneas' },
  { src: '/landing/galeria/coach-atleta.png', alt: 'Coach y atleta', caption: 'Tu academia, tu momento' },
  { src: '/landing/galeria/medallas-2023.png', alt: 'Medallas', caption: 'Medallas oficiales WT' },
  { src: '/landing/galeria/trofeos-2023.png', alt: 'Trofeos', caption: 'Trofeos que inspiran' },
  { src: '/landing/galeria/reunion-coaches.png', alt: 'Coaches', caption: 'Coaches de todo el país' },
  { src: '/landing/galeria/evento-gymnasium.png', alt: 'Cientos de competidores', caption: '500+ en el tatami' },
]

/** Medallas oficiales por edición */
export const FESTCUP_MEDALLAS = [
  {
    year: '2026',
    src: '/landing/medallas/medallas-2026.png',
    alt: 'Medallas oro, plata y bronce FestCup 2026',
    title: 'Medallas FestCup 2026',
    tag: 'Edición actual',
    highlight: true,
    metal: 'gold',
  },
  {
    year: '2025',
    src: '/landing/medallas/medalla-2025.png',
    alt: 'Medalla oficial FestCup 2025 en estuche premium',
    title: 'Medalla FestCup 2025',
    tag: 'Edición 2025',
    metal: 'gold',
  },
  {
    year: '2024',
    src: '/landing/medallas/medalla-2024.png',
    alt: 'Medalla oro FestCup 2024',
    title: 'Medalla FestCup 2024',
    tag: 'Edición 2024',
    metal: 'gold',
  },
  {
    year: '2023',
    src: '/landing/medallas/medalla-2023.png',
    alt: 'Medalla FestCup 2023',
    title: 'Medalla FestCup 2023',
    tag: '#UniendoCampeones',
    metal: 'gold',
  },
]

export const FESTCUP_DOCUMENTOS = [
  {
    titulo: 'Bases del campeonato',
    desc: 'Reglamento oficial, categorías, tarifas y normativa WT/FDPTKD.',
    href: FESTCUP_DOCS.bases,
    icon: '📋',
    tipo: 'PDF',
  },
  {
    titulo: 'Programa del evento',
    desc: 'Cronograma, áreas, horarios y actividades FestCup 2026.',
    href: FESTCUP_DOCS.programa,
    icon: '🗓️',
    tipo: 'PDF',
  },
  {
    titulo: 'Plantilla de inscripción',
    desc: 'Excel oficial FestCup 2026. Kyorugi, Poomsae, parejas, equipos y festival.',
    href: FESTCUP_DOCS.plantillaExcel,
    icon: '📊',
    tipo: 'Excel',
  },
]

export const FESTCUP_RAZONES = [
  {
    ic: '📅',
    stat: '4+',
    title: 'Años organizando',
    text: 'Cuatro ediciones consecutivas en Trujillo. FestCup no nació ayer — es una marca con historia y credibilidad.',
  },
  {
    ic: '⚡',
    stat: '3',
    title: 'Organización impecable',
    text: 'Tres áreas simultáneas, árbitros certificados WT, staff profesional y un cronograma que se cumple al minuto.',
  },
  {
    ic: '🤝',
    stat: '500+',
    title: '#UniendoCampeones',
    text: 'Más de 50 academias y 500 competidores de todo el Perú compitiendo juntos bajo la misma pasión.',
  },
  {
    ic: '🏆',
    stat: 'WT',
    title: 'El campeonato del norte',
    text: 'Medallas, trofeos y podios oficiales World Taekwondo. Tus atletas merecen competir al más alto nivel.',
  },
]
